// Server side of community publishing and moderation. Every event, thread and
// reply goes through the triage here before it is stored. Server only.

import type { SupabaseClient } from "@supabase/supabase-js";
import {
	CORROBORATION_WINDOW_HOURS,
	type RiskReport,
	reportsToEscalate,
} from "../moderation/corroboration";
import type {
	ContentKind,
	TriagePriority,
} from "../moderation/moderation-types";
import { triageContent } from "../moderation/triage";
import { applyTrustPolicy } from "../moderation/trust-policy";
import type { OpenJevClient } from "../openjev/openjev-types";
import { resolvePoint, type StoredPoint } from "./community-geo";
import {
	EVENT_COLUMNS,
	moderationColumns,
	POST_COLUMNS,
	publishResult,
	THREAD_COLUMNS,
	toEvent,
	toPost,
	toThread,
} from "./community-mappers";
import {
	validateEventInput,
	validatePostBody,
	validateThreadInput,
} from "./community-rules";
import type {
	CommunityEvent,
	ForumPost,
	ForumThread,
	ModerationAction,
	ModerationQueueItem,
	NewEventInput,
	NewThreadInput,
	PublishResult,
} from "./community-types";

export type PublishRequest =
	| { kind: "event"; input: NewEventInput }
	| { kind: "thread"; input: NewThreadInput }
	| { kind: "post"; threadId: string; body: string };

export interface Author {
	id: string;
	displayName: string;
	isVerifiedOrganizer: boolean;
	/** When the profile was created, for the new-account trust policy. */
	createdAt: string;
}

export class CommunityError extends Error {
	constructor(
		message: string,
		readonly status: number,
	) {
		super(message);
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parsePublishRequest(body: unknown): PublishRequest {
	if (!isRecord(body)) throw new CommunityError("Solicitud inválida.", 400);
	if (body.kind === "post") {
		if (typeof body.threadId !== "string" || typeof body.body !== "string")
			throw new CommunityError("Solicitud inválida.", 400);
		const error = validatePostBody(body.body);
		if (error) throw new CommunityError(error, 400);
		return { kind: "post", threadId: body.threadId, body: body.body.trim() };
	}
	if (!isRecord(body.input))
		throw new CommunityError("Solicitud inválida.", 400);
	if (body.kind === "event") {
		const input = body.input as unknown as NewEventInput;
		const error = validateEventInput(input);
		if (error) throw new CommunityError(error, 400);
		return { kind: "event", input };
	}
	if (body.kind === "thread") {
		const input = body.input as unknown as NewThreadInput;
		const error = validateThreadInput(input);
		if (error) throw new CommunityError(error, 400);
		return { kind: "thread", input };
	}
	throw new CommunityError("Solicitud inválida.", 400);
}

/** Resolves the caller from the `Authorization: Bearer <access token>` header. */
export async function authenticate(
	request: Request,
	admin: SupabaseClient,
): Promise<Author> {
	const token = request.headers
		.get("authorization")
		?.replace(/^Bearer\s+/i, "");
	if (!token) throw new CommunityError("Inicia sesión para continuar.", 401);
	const { data, error } = await admin.auth.getUser(token);
	if (error || !data.user)
		throw new CommunityError("Tu sesión expiró. Inicia sesión de nuevo.", 401);
	const { data: profile } = await admin
		.from("profiles")
		.select("display_name, is_verified_organizer, created_at")
		.eq("id", data.user.id)
		.maybeSingle();
	if (!profile)
		throw new CommunityError("Completa tu perfil antes de publicar.", 403);
	return {
		id: data.user.id,
		displayName: String(profile.display_name),
		isVerifiedOrganizer: Boolean(profile.is_verified_organizer),
		createdAt: String(profile.created_at),
	};
}

export async function isCityUser(
	admin: SupabaseClient,
	userId: string,
): Promise<boolean> {
	const { data } = await admin
		.from("user_profiles")
		.select("role")
		.eq("user_id", userId)
		.maybeSingle();
	return data?.role === "city";
}

/**
 * The point to store with an event or a thread: the one picked on the map (already
 * checked inside the AMB by the validation), else the catalog place's own point.
 */
async function storedPointFor(
	admin: SupabaseClient,
	input: {
		placeId: string | null;
		latitude?: number | null;
		longitude?: number | null;
	},
): Promise<StoredPoint> {
	const picked = resolvePoint(input);
	if (picked.latitude !== null || !input.placeId) return picked;
	const { data: place } = await admin
		.from("places")
		.select("latitude, longitude")
		.eq("id", input.placeId)
		.maybeSingle();
	return resolvePoint(
		input,
		place
			? { latitude: Number(place.latitude), longitude: Number(place.longitude) }
			: null,
	);
}

export async function publishContent(
	admin: SupabaseClient,
	author: Author,
	request: PublishRequest,
	jev: OpenJevClient | null,
): Promise<PublishResult<CommunityEvent | ForumThread | ForumPost>> {
	if (request.kind === "event") {
		const { input } = request;
		const { count } = await admin
			.from("events")
			.select("id", { count: "exact", head: true })
			.eq("organizer_id", author.id)
			.eq("moderation_status", "published");
		const decision = applyTrustPolicy(
			await triageContent(
				{ kind: "event", title: input.title, body: input.description },
				jev,
			),
			{
				kind: "event",
				accountAgeHours:
					(Date.now() - new Date(author.createdAt).getTime()) / 3_600_000,
				publishedEvents: count ?? 0,
				isVerifiedOrganizer: author.isVerifiedOrganizer,
				isPaidEvent: !input.isFree,
			},
		);
		if (decision.verdict === "reject")
			return publishResult<never>(decision, null);
		const point = await storedPointFor(admin, input);
		const { data, error } = await admin
			.from("events")
			.insert({
				...point,
				title: input.title.trim(),
				description: input.description.trim(),
				category: input.category,
				starts_at: input.startsAt,
				ends_at: input.endsAt,
				place_id: input.placeId,
				location_text: input.locationText?.trim() || null,
				capacity: input.capacity,
				is_free: input.isFree,
				price_cop: input.isFree ? null : input.priceCop,
				organizer_id: author.id,
				organizer_name: author.displayName,
				organizer_verified: author.isVerifiedOrganizer,
				...moderationColumns(decision),
			})
			.select(EVENT_COLUMNS)
			.single();
		if (error) throw new CommunityError(error.message, 500);
		return publishResult(decision, toEvent(data));
	}

	if (request.kind === "thread") {
		const { input } = request;
		const decision = await triageContent(
			{ kind: "thread", title: input.title, body: input.body },
			jev,
		);
		if (decision.verdict === "reject")
			return publishResult<never>(decision, null);
		const point = await storedPointFor(admin, input);
		const { data, error } = await admin
			.from("forum_threads")
			.insert({
				...point,
				title: input.title.trim(),
				body: input.body.trim(),
				category: input.category,
				place_id: input.placeId,
				event_id: input.eventId,
				author_id: author.id,
				author_name: author.displayName,
				...moderationColumns(decision),
			})
			.select(THREAD_COLUMNS)
			.single();
		if (error) throw new CommunityError(error.message, 500);
		if (decision.verdict === "publish") await corroborateRisk(admin, data.id);
		return publishResult(decision, toThread(data));
	}

	const { data: thread } = await admin
		.from("forum_threads")
		.select("id, moderation_status")
		.eq("id", request.threadId)
		.maybeSingle();
	if (!thread || thread.moderation_status !== "published")
		throw new CommunityError("Esta conversación ya no está disponible.", 404);
	const decision = await triageContent(
		{ kind: "post", body: request.body },
		jev,
	);
	if (decision.verdict === "reject")
		return publishResult<never>(decision, null);
	const { data, error } = await admin
		.from("forum_posts")
		.insert({
			thread_id: request.threadId,
			body: request.body,
			author_id: author.id,
			author_name: author.displayName,
			...moderationColumns(decision),
		})
		.select(POST_COLUMNS)
		.single();
	if (error) throw new CommunityError(error.message, 500);
	return publishResult(decision, toPost(data));
}

const TABLE: Record<ContentKind, string> = {
	event: "events",
	thread: "forum_threads",
	post: "forum_posts",
};

const QUEUE_FILTER =
	"moderation_status.eq.held,and(triage_priority.neq.none,city_resolved_at.is.null,moderation_status.eq.published),and(community_reports.gt.0,city_resolved_at.is.null,moderation_status.eq.published)";

/** Held content, published reports the city has not closed and content people reported. */
export async function loadModerationQueue(
	admin: SupabaseClient,
): Promise<ModerationQueueItem[]> {
	const common =
		"id, moderation_status, moderation_labels, moderation_source, triage_priority, community_reports, created_at";
	const [events, threads, posts] = await Promise.all([
		admin
			.from("events")
			.select(`${common}, title, description, organizer_name`)
			.or(QUEUE_FILTER)
			.limit(100),
		admin
			.from("forum_threads")
			.select(`${common}, title, body, author_name`)
			.or(QUEUE_FILTER)
			.limit(100),
		admin
			.from("forum_posts")
			.select(`${common}, body, author_name, thread_id`)
			.or(QUEUE_FILTER)
			.limit(100),
	]);
	const error = events.error ?? threads.error ?? posts.error;
	if (error) throw new CommunityError(error.message, 500);

	const appeals = await loadOpenAppeals(admin);

	const base = (row: Record<string, unknown>) => ({
		id: String(row.id),
		createdAt: String(row.created_at),
		status: row.moderation_status as ModerationQueueItem["status"],
		labels: (row.moderation_labels ?? []) as ModerationQueueItem["labels"],
		source: row.moderation_source as ModerationQueueItem["source"],
		priority: row.triage_priority as ModerationQueueItem["priority"],
		communityReports: Number(row.community_reports ?? 0),
	});
	const items: ModerationQueueItem[] = [
		...(events.data ?? []).map((row) => ({
			...base(row),
			kind: "event" as const,
			title: String(row.title),
			body: String(row.description),
			authorName: String(row.organizer_name),
			threadId: null,
		})),
		...(threads.data ?? []).map((row) => ({
			...base(row),
			kind: "thread" as const,
			title: String(row.title),
			body: String(row.body),
			authorName: String(row.author_name),
			threadId: String(row.id),
		})),
		...(posts.data ?? []).map((row) => ({
			...base(row),
			kind: "post" as const,
			title: "Respuesta en el foro",
			body: String(row.body),
			authorName: String(row.author_name),
			threadId: String(row.thread_id),
		})),
	];
	// Removed content only reaches the queue through an open appeal.
	const queued = new Set(items.map((item) => `${item.kind}:${item.id}`));
	for (const item of appeals.items) {
		if (!queued.has(`${item.kind}:${item.id}`)) items.push(item);
	}
	return sortQueue(
		items.map((item) => ({
			...item,
			appeal: appeals.byKey.get(`${item.kind}:${item.id}`) ?? null,
		})),
	);
}

interface OpenAppeal {
	kind: ContentKind;
	content_id: string;
	message: string;
	created_at: string;
}

/** Open appeals, with the removed content they point at as queue items. */
async function loadOpenAppeals(admin: SupabaseClient): Promise<{
	items: ModerationQueueItem[];
	byKey: Map<string, { message: string; createdAt: string }>;
}> {
	const byKey = new Map<string, { message: string; createdAt: string }>();
	const items: ModerationQueueItem[] = [];
	const { data, error } = await admin
		.from("moderation_appeals")
		.select("kind, content_id, message, created_at")
		.eq("status", "open")
		.limit(100);
	// A deployment without the migration simply has no appeals yet.
	if (error || !data?.length) return { items, byKey };
	const rows = data as OpenAppeal[];
	for (const row of rows) {
		byKey.set(`${row.kind}:${row.content_id}`, {
			message: row.message,
			createdAt: row.created_at,
		});
	}
	for (const kind of ["event", "thread", "post"] as const) {
		const ids = rows.filter((r) => r.kind === kind).map((r) => r.content_id);
		if (!ids.length) continue;
		const columns =
			kind === "event"
				? "title, description, organizer_name"
				: kind === "thread"
					? "title, body, author_name"
					: "body, author_name, thread_id";
		const { data: content } = await admin
			.from(TABLE[kind])
			.select(
				`id, moderation_status, moderation_labels, moderation_source, triage_priority, community_reports, created_at, ${columns}`,
			)
			.in("id", ids);
		for (const raw of (content ?? []) as unknown as Record<string, unknown>[]) {
			items.push({
				id: String(raw.id),
				kind,
				createdAt: String(raw.created_at),
				status: raw.moderation_status as ModerationQueueItem["status"],
				labels: (raw.moderation_labels ?? []) as ModerationQueueItem["labels"],
				source: raw.moderation_source as ModerationQueueItem["source"],
				priority: raw.triage_priority as ModerationQueueItem["priority"],
				communityReports: Number(raw.community_reports ?? 0),
				title:
					kind === "post" ? "Respuesta en el foro" : String(raw.title ?? ""),
				body: String(raw.description ?? raw.body ?? ""),
				authorName: String(raw.organizer_name ?? raw.author_name ?? ""),
				threadId:
					kind === "thread"
						? String(raw.id)
						: kind === "post"
							? String(raw.thread_id)
							: null,
			});
		}
	}
	return { items, byKey };
}

interface RiskRow {
	id: string;
	author_id: string | null;
	place_id: string | null;
	triage_priority: TriagePriority;
	created_at: string;
	city_resolved_at: string | null;
}

const RISK_COLUMNS =
	"id, author_id, place_id, triage_priority, created_at, city_resolved_at";

function toRisk(row: RiskRow): RiskReport {
	return {
		id: row.id,
		authorId: row.author_id,
		placeId: row.place_id,
		priority: row.triage_priority,
		createdAt: row.created_at,
		resolved: row.city_resolved_at !== null,
	};
}

/**
 * Corroboration (#126): when different people reported a risk at the same place
 * in a short time, raise those reports to emergency and leave it in the audit log.
 * Never blocks publishing: a failure here only means the priority stays as it was.
 */
export async function corroborateRisk(
	admin: SupabaseClient,
	threadId: string,
): Promise<void> {
	try {
		const { data: seedRow } = await admin
			.from("forum_threads")
			.select(RISK_COLUMNS)
			.eq("id", threadId)
			.eq("moderation_status", "published")
			.maybeSingle();
		if (!seedRow?.place_id || seedRow.triage_priority === "none") return;
		const seed = toRisk(seedRow as RiskRow);
		const since = new Date(
			Date.parse(seed.createdAt) - CORROBORATION_WINDOW_HOURS * 3_600_000,
		).toISOString();
		const { data: peers } = await admin
			.from("forum_threads")
			.select(RISK_COLUMNS)
			.eq("place_id", seedRow.place_id)
			.eq("moderation_status", "published")
			.neq("triage_priority", "none")
			.is("city_resolved_at", null)
			.gte("created_at", since)
			.limit(50);
		const ids = reportsToEscalate(
			seed,
			((peers ?? []) as RiskRow[]).map(toRisk),
		);
		if (ids.length === 0) return;
		await admin
			.from("forum_threads")
			.update({ triage_priority: "emergency" })
			.in("id", ids);
		await admin.from("moderation_actions").insert(
			ids.map((id) => ({
				moderator_id: null,
				kind: "thread",
				content_id: id,
				action: "corroborate",
			})),
		);
	} catch (error) {
		console.error("[moderation] corroboration failed", error);
	}
}

const PRIORITY_ORDER = { emergency: 0, city_attention: 1, none: 2 } as const;

export function sortQueue(items: ModerationQueueItem[]): ModerationQueueItem[] {
	return [...items].sort(
		(a, b) =>
			PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
			b.createdAt.localeCompare(a.createdAt),
	);
}

export async function applyModeration(
	admin: SupabaseClient,
	moderatorId: string,
	kind: ContentKind,
	id: string,
	action: ModerationAction,
): Promise<void> {
	if (action === "verify" && kind !== "thread") {
		throw new CommunityError("Solo se confirman reportes del foro.", 400);
	}
	const now = new Date().toISOString();
	const patch =
		action === "resolve"
			? { city_resolved_at: now }
			: action === "verify"
				? { city_verified_at: now }
				: {
						moderation_status: action === "approve" ? "published" : "removed",
						moderation_source: "moderator",
					};
	const { error } = await admin.from(TABLE[kind]).update(patch).eq("id", id);
	if (error) throw new CommunityError(error.message, 500);
	// Audit log: who decided what, and when.
	const { error: logError } = await admin.from("moderation_actions").insert({
		moderator_id: moderatorId,
		kind,
		content_id: id,
		action,
	});
	if (logError)
		console.error("[moderation] audit log failed", logError.message);

	// A held risk report that the city approves may now corroborate others.
	if (action === "approve" && kind === "thread")
		await corroborateRisk(admin, id);

	// Deciding on removed content closes its appeal: approving overturns, removing upholds.
	if (action === "approve" || action === "remove") {
		const overturned = action === "approve";
		const { data: closed } = await admin
			.from("moderation_appeals")
			.update({
				status: overturned ? "overturned" : "upheld",
				resolved_at: now,
				resolved_by: moderatorId,
			})
			.eq("kind", kind)
			.eq("content_id", id)
			.eq("status", "open")
			.select("id");
		if (closed?.length) {
			await admin.from("moderation_actions").insert({
				moderator_id: moderatorId,
				kind,
				content_id: id,
				action: overturned ? "appeal_overturned" : "appeal_upheld",
			});
		}
	}
}

/** Ley 1581 (supresión): removes what the person wrote, then the account. */
export async function deleteAccount(
	admin: SupabaseClient,
	userId: string,
): Promise<void> {
	const { error } = await admin.rpc("delete_community_account", {
		target: userId,
	});
	if (error) throw new CommunityError(error.message, 500);
	const { error: authError } = await admin.auth.admin.deleteUser(userId);
	if (authError) throw new CommunityError(authError.message, 500);
}

export function parseModerationRequest(body: unknown): {
	kind: ContentKind;
	id: string;
	action: ModerationAction;
} {
	if (
		isRecord(body) &&
		(body.kind === "event" || body.kind === "thread" || body.kind === "post") &&
		typeof body.id === "string" &&
		(body.action === "approve" ||
			body.action === "remove" ||
			body.action === "resolve" ||
			body.action === "verify")
	) {
		return { kind: body.kind, id: body.id, action: body.action };
	}
	throw new CommunityError("Solicitud inválida.", 400);
}
