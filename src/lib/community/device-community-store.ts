// On-device community store: used when Supabase is not configured. Data lives
// in this browser only. Moderation still runs: the server triage endpoint
// (rules + OpenJev) when reachable, the hard rules in the browser otherwise.

import type {
	ContentKind,
	ModerationDecision,
	ModerationLabel,
	ModerationSource,
} from "../moderation/moderation-types";
import { checkAppealMessage } from "../moderation/appeal-rules";
import {
	CORROBORATION_WINDOW_HOURS,
	reportsToEscalate,
} from "../moderation/corroboration";
import { triageContent } from "../moderation/triage";
import {
	applyTrustPolicy,
	COMMUNITY_REPORT_HOLD_THRESHOLD,
	NEW_ACCOUNT_HOURS,
} from "../moderation/trust-policy";
import { publishResult, storedStatus } from "./community-mappers";
import {
	filterEvents,
	filterThreads,
	registrationBlocker,
	validateEventInput,
	validatePostBody,
	validateProfilePatch,
	validateSignUp,
	validateThreadInput,
} from "./community-rules";
import type {
	AppealStatus,
	CommunityEvent,
	CommunityStore,
	CommunityTopic,
	EventQuery,
	ForumPost,
	ForumThread,
	ModerationAction,
	ModerationQueueItem,
	MyDataExport,
	NewEventInput,
	NewThreadInput,
	Profile,
	ProfilePatch,
	PublishResult,
	ReportReason,
	SignUpInput,
	ThreadQuery,
} from "./community-types";
import { PLACES } from "./places-catalog";
import { buildStarterEvents, buildStarterForum } from "./starter-content";

const STORAGE_KEY = "quillart-community-v1";

interface DeviceAccount extends Profile {
	passwordHash: string;
	/** Missing on accounts created before the trust policy: treated as old. */
	createdAt?: string;
}

interface DeviceAppeal {
	kind: ContentKind;
	contentId: string;
	message: string;
	status: AppealStatus;
	createdAt: string;
}

interface DeviceReport {
	kind: ContentKind;
	contentId: string;
	reporterId: string;
	reason: ReportReason;
	createdAt: string;
}

interface DeviceData {
	accounts: DeviceAccount[];
	sessionId: string | null;
	events: CommunityEvent[];
	registrations: { eventId: string; userId: string }[];
	threads: ForumThread[];
	posts: ForumPost[];
	/** Triage labels and source per content id, for the moderation queue. */
	moderation?: Record<
		string,
		{ labels: ModerationLabel[]; source: ModerationSource | "moderator" }
	>;
	/** Reports people made about someone else's content. */
	reports?: DeviceReport[];
	/** Content whose community reports the moderator already closed. */
	resolvedReports?: string[];
	appeals?: DeviceAppeal[];
}

function reportCount(data: DeviceData, id: string): number {
	return new Set(
		(data.reports ?? [])
			.filter((report) => report.contentId === id)
			.map((report) => report.reporterId),
	).size;
}

/** Corroboration (#126) on this device: same rule as the server, over local threads. */
function corroborateThreads(data: DeviceData, seed: ForumThread) {
	if (!seed.placeId || seed.triagePriority === "none") return;
	const toRisk = (t: ForumThread) => ({
		id: t.id,
		authorId: t.authorId,
		placeId: t.placeId,
		priority: t.triagePriority,
		createdAt: t.createdAt,
		resolved: Boolean(data.resolvedReports?.includes(t.id)),
	});
	const peers = data.threads.filter(
		(t) =>
			t.moderationStatus === "published" &&
			Date.parse(seed.createdAt) - Date.parse(t.createdAt) <=
				CORROBORATION_WINDOW_HOURS * 3_600_000,
	);
	const ids = new Set(reportsToEscalate(toRisk(seed), peers.map(toRisk)));
	for (const t of data.threads) {
		if (ids.has(t.id)) t.triagePriority = "emergency";
	}
}

function hasOpenAppeal(data: DeviceData, id: string): boolean {
	return Boolean(
		data.appeals?.some((a) => a.contentId === id && a.status === "open"),
	);
}

function openAppealOf(data: DeviceData, id: string) {
	const found = data.appeals?.find(
		(a) => a.contentId === id && a.status === "open",
	);
	return found ? { message: found.message, createdAt: found.createdAt } : null;
}

function triageOf(data: DeviceData, id: string) {
	return data.moderation?.[id] ?? { labels: [], source: "rules" as const };
}

function rememberTriage(
	data: DeviceData,
	id: string,
	decision: ModerationDecision,
) {
	data.moderation = {
		...data.moderation,
		[id]: { labels: decision.labels, source: decision.source },
	};
}

function emptyData(): DeviceData {
	const now = new Date();
	const forum = buildStarterForum(now);
	return {
		accounts: [],
		sessionId: null,
		events: buildStarterEvents(now, (slug) => `place-${slug}`),
		registrations: [],
		threads: forum.threads,
		posts: forum.posts,
	};
}

async function hashPassword(email: string, password: string) {
	const bytes = new TextEncoder().encode(`${email}:${password}`);
	const digest = await crypto.subtle.digest("SHA-256", bytes);
	return [...new Uint8Array(digest)]
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
}

function publicProfile(account: DeviceAccount): Profile {
	const { passwordHash: _hash, createdAt: _created, ...profile } = account;
	return {
		...profile,
		isVerifiedOrganizer: Boolean(profile.isVerifiedOrganizer),
	};
}

async function triage(
	kind: "event" | "thread" | "post",
	body: string,
	title?: string,
): Promise<ModerationDecision> {
	try {
		const response = await fetch("/api/community/triage", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ kind, body, title }),
		});
		if (response.ok) return (await response.json()) as ModerationDecision;
	} catch {
		// Offline: the hard rules still run below.
	}
	return triageContent({ kind, body, title }, null);
}

export function createDeviceCommunityStore(): CommunityStore {
	const sessionListeners = new Set<(profile: Profile | null) => void>();
	const topicListeners = new Map<CommunityTopic, Set<() => void>>();

	function load(): DeviceData {
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (raw) return JSON.parse(raw) as DeviceData;
		} catch {
			// Blocked or corrupt storage: start fresh.
		}
		const data = emptyData();
		save(data);
		return data;
	}

	function save(data: DeviceData) {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
		} catch {
			// Private mode: the session still works in memory for this page.
		}
	}

	function notify(topic: CommunityTopic) {
		for (const listener of topicListeners.get(topic) ?? []) listener();
	}

	function currentAccount(data: DeviceData): DeviceAccount | null {
		return (
			data.accounts.find((account) => account.id === data.sessionId) ?? null
		);
	}

	function requireAccount(data: DeviceData): DeviceAccount {
		const account = currentAccount(data);
		if (!account) throw new Error("Inicia sesión para continuar.");
		return account;
	}

	function emitSession(data: DeviceData) {
		const account = currentAccount(data);
		const profile = account ? publicProfile(account) : null;
		for (const listener of sessionListeners) listener(profile);
	}

	/** Published content plus what the signed-in person wrote. */
	function visible<T extends { moderationStatus: string }>(
		items: T[],
		ownerOf: (item: T) => string | null,
		userId: string | null,
	): T[] {
		return items.filter(
			(item) =>
				item.moderationStatus === "published" ||
				(userId !== null &&
					item.moderationStatus === "held" &&
					ownerOf(item) === userId),
		);
	}

	if (typeof window !== "undefined") {
		window.addEventListener("storage", (event) => {
			if (event.key !== STORAGE_KEY) return;
			notify("events");
			notify("forum");
			emitSession(load());
		});
	}

	return {
		mode: "device",

		async getSession() {
			const account = currentAccount(load());
			return account ? publicProfile(account) : null;
		},

		onSessionChange(listener) {
			sessionListeners.add(listener);
			return () => sessionListeners.delete(listener);
		},

		async signUp(input: SignUpInput) {
			const error = validateSignUp(input);
			if (error) throw new Error(error);
			const data = load();
			const email = input.email.trim().toLowerCase();
			if (data.accounts.some((account) => account.email === email))
				throw new Error("Ya existe una cuenta con ese correo.");
			const account: DeviceAccount = {
				id: crypto.randomUUID(),
				displayName: input.displayName.trim(),
				neighborhood: input.neighborhood?.trim() || null,
				isVisitor: input.isVisitor,
				email,
				isVerifiedOrganizer: false,
				passwordHash: await hashPassword(email, input.password),
				createdAt: new Date().toISOString(),
			};
			data.accounts.push(account);
			data.sessionId = account.id;
			save(data);
			emitSession(data);
			return { profile: publicProfile(account), needsConfirmation: false };
		},

		async signIn(email, password) {
			const data = load();
			const normalized = email.trim().toLowerCase();
			const account = data.accounts.find((item) => item.email === normalized);
			if (
				!account ||
				account.passwordHash !== (await hashPassword(normalized, password))
			)
				throw new Error("Correo o contraseña incorrectos.");
			data.sessionId = account.id;
			save(data);
			emitSession(data);
			return publicProfile(account);
		},

		async signOut() {
			const data = load();
			data.sessionId = null;
			save(data);
			emitSession(data);
		},

		async updateProfile(patch: ProfilePatch) {
			const data = load();
			const account = requireAccount(data);
			const patchError = validateProfilePatch(patch);
			if (patchError) throw new Error(patchError);
			account.displayName = patch.displayName.trim();
			account.neighborhood = patch.neighborhood?.trim() || null;
			account.isVisitor = patch.isVisitor;
			save(data);
			emitSession(data);
			return publicProfile(account);
		},

		async listPlaces() {
			return PLACES;
		},

		async getPlace(slug) {
			return PLACES.find((place) => place.slug === slug) ?? null;
		},

		async listEvents(query?: EventQuery) {
			const data = load();
			const userId = data.sessionId;
			return filterEvents(
				visible(data.events, (event) => event.organizerId, userId),
				query,
			);
		},

		async getEvent(id) {
			const data = load();
			return (
				visible(data.events, (event) => event.organizerId, data.sessionId).find(
					(event) => event.id === id,
				) ?? null
			);
		},

		async createEvent(
			input: NewEventInput,
		): Promise<PublishResult<CommunityEvent>> {
			const error = validateEventInput(input);
			if (error) throw new Error(error);
			const before = load();
			const account = requireAccount(before);
			const decision = applyTrustPolicy(
				await triage("event", input.description, input.title),
				{
					kind: "event",
					accountAgeHours: account.createdAt
						? (Date.now() - new Date(account.createdAt).getTime()) / 3_600_000
						: NEW_ACCOUNT_HOURS * 10,
					publishedEvents: before.events.filter(
						(event) =>
							event.organizerId === account.id &&
							event.moderationStatus === "published",
					).length,
					isVerifiedOrganizer: Boolean(account.isVerifiedOrganizer),
					isPaidEvent: !input.isFree,
				},
			);
			const status = storedStatus(decision);
			if (!status) return publishResult<never>(decision, null);
			const data = load();
			const event: CommunityEvent = {
				...input,
				id: crypto.randomUUID(),
				title: input.title.trim(),
				description: input.description.trim(),
				priceCop: input.isFree ? null : input.priceCop,
				registeredCount: 0,
				organizerId: account.id,
				organizerName: account.displayName,
				organizerVerified: Boolean(account.isVerifiedOrganizer),
				status: "published",
				moderationStatus: status,
				triagePriority: decision.priority,
				createdAt: new Date().toISOString(),
			};
			data.events.push(event);
			rememberTriage(data, event.id, decision);
			save(data);
			notify("events");
			return publishResult(decision, event);
		},

		async cancelEvent(id) {
			const data = load();
			const account = requireAccount(data);
			const event = data.events.find((item) => item.id === id);
			if (!event || event.organizerId !== account.id)
				throw new Error("Solo quien organiza puede cancelar el evento.");
			event.status = "cancelled";
			save(data);
			notify("events");
		},

		async myRegistrations() {
			const data = load();
			return data.registrations
				.filter((item) => item.userId === data.sessionId)
				.map((item) => item.eventId);
		},

		async register(eventId) {
			const data = load();
			const account = requireAccount(data);
			const event = data.events.find((item) => item.id === eventId);
			if (event?.moderationStatus !== "published")
				throw new Error("Este evento no está disponible para inscripciones.");
			if (
				data.registrations.some(
					(item) => item.eventId === eventId && item.userId === account.id,
				)
			)
				return;
			const blocker = registrationBlocker(event);
			if (blocker) throw new Error(blocker);
			data.registrations.push({ eventId, userId: account.id });
			event.registeredCount += 1;
			save(data);
			notify("events");
		},

		async unregister(eventId) {
			const data = load();
			const account = requireAccount(data);
			const before = data.registrations.length;
			data.registrations = data.registrations.filter(
				(item) => !(item.eventId === eventId && item.userId === account.id),
			);
			const event = data.events.find((item) => item.id === eventId);
			if (event && data.registrations.length < before)
				event.registeredCount = Math.max(event.registeredCount - 1, 0);
			save(data);
			notify("events");
		},

		async listThreads(query?: ThreadQuery) {
			const data = load();
			return filterThreads(
				visible(data.threads, (thread) => thread.authorId, data.sessionId),
				query,
			);
		},

		async getThread(id) {
			const data = load();
			return (
				visible(data.threads, (thread) => thread.authorId, data.sessionId).find(
					(thread) => thread.id === id,
				) ?? null
			);
		},

		async createThread(
			input: NewThreadInput,
		): Promise<PublishResult<ForumThread>> {
			const error = validateThreadInput(input);
			if (error) throw new Error(error);
			const account = requireAccount(load());
			const decision = await triage("thread", input.body, input.title);
			const status = storedStatus(decision);
			if (!status) return publishResult<never>(decision, null);
			const data = load();
			const now = new Date().toISOString();
			const thread: ForumThread = {
				...input,
				id: crypto.randomUUID(),
				title: input.title.trim(),
				body: input.body.trim(),
				authorId: account.id,
				authorName: account.displayName,
				replyCount: 0,
				lastActivityAt: now,
				cityVerified: false,
				moderationStatus: status,
				triagePriority: decision.priority,
				createdAt: now,
			};
			data.threads.push(thread);
			rememberTriage(data, thread.id, decision);
			if (status === "published") corroborateThreads(data, thread);
			save(data);
			notify("forum");
			return publishResult(decision, thread);
		},

		async listPosts(threadId) {
			const data = load();
			return visible(data.posts, (post) => post.authorId, data.sessionId)
				.filter((post) => post.threadId === threadId)
				.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
		},

		async createPost(
			threadId: string,
			body: string,
		): Promise<PublishResult<ForumPost>> {
			const error = validatePostBody(body);
			if (error) throw new Error(error);
			const account = requireAccount(load());
			const decision = await triage("post", body);
			const status = storedStatus(decision);
			if (!status) return publishResult<never>(decision, null);
			const data = load();
			const thread = data.threads.find((item) => item.id === threadId);
			if (!thread) throw new Error("Esta conversación ya no está disponible.");
			const now = new Date().toISOString();
			const post: ForumPost = {
				id: crypto.randomUUID(),
				threadId,
				body: body.trim(),
				authorId: account.id,
				authorName: account.displayName,
				moderationStatus: status,
				triagePriority: decision.priority,
				createdAt: now,
			};
			data.posts.push(post);
			rememberTriage(data, post.id, decision);
			if (status === "published") {
				thread.replyCount += 1;
				thread.lastActivityAt = now;
			}
			save(data);
			notify("forum");
			return publishResult(decision, post);
		},

		async canModerate() {
			// On a single device the signed-in person acts as the moderator.
			return currentAccount(load()) !== null;
		},

		async listModerationQueue() {
			const data = load();
			const reportsOf = (id: string) => reportCount(data, id);
			const needsAction = (item: {
				id: string;
				moderationStatus: string;
				triagePriority: string;
			}) =>
				item.moderationStatus === "held" ||
				hasOpenAppeal(data, item.id) ||
				(item.moderationStatus === "published" &&
					item.triagePriority !== "none") ||
				(item.moderationStatus === "published" &&
					reportsOf(item.id) > 0 &&
					!data.resolvedReports?.includes(item.id));
			const items: ModerationQueueItem[] = [
				...data.events.filter(needsAction).map((event) => ({
					kind: "event" as const,
					id: event.id,
					title: event.title,
					body: event.description,
					authorName: event.organizerName,
					createdAt: event.createdAt,
					status: event.moderationStatus,
					...triageOf(data, event.id),
					priority: event.triagePriority,
					communityReports: reportsOf(event.id),
					appeal: openAppealOf(data, event.id),
					threadId: null,
				})),
				...data.threads.filter(needsAction).map((thread) => ({
					kind: "thread" as const,
					id: thread.id,
					title: thread.title,
					body: thread.body,
					authorName: thread.authorName,
					createdAt: thread.createdAt,
					status: thread.moderationStatus,
					...triageOf(data, thread.id),
					priority: thread.triagePriority,
					communityReports: reportsOf(thread.id),
					appeal: openAppealOf(data, thread.id),
					threadId: thread.id,
				})),
				...data.posts.filter(needsAction).map((post) => ({
					kind: "post" as const,
					id: post.id,
					title: "Respuesta en el foro",
					body: post.body,
					authorName: post.authorName,
					createdAt: post.createdAt,
					status: post.moderationStatus,
					...triageOf(data, post.id),
					priority: post.triagePriority,
					communityReports: reportsOf(post.id),
					appeal: openAppealOf(data, post.id),
					threadId: post.threadId,
				})),
			];
			return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
		},

		async moderate(kind, id, action: ModerationAction) {
			const data = load();
			requireAccount(data);
			const list: (CommunityEvent | ForumThread | ForumPost)[] =
				kind === "event"
					? data.events
					: kind === "thread"
						? data.threads
						: data.posts;
			const item = list.find((entry) => entry.id === id);
			if (!item) return;
			if (action === "resolve") {
				item.triagePriority = "none";
				data.resolvedReports = [...(data.resolvedReports ?? []), id];
			} else if (action === "verify") {
				if (kind !== "thread")
					throw new Error("Solo se confirman reportes del foro.");
				(item as ForumThread).cityVerified = true;
			} else {
				const wasPublished = item.moderationStatus === "published";
				item.moderationStatus = action === "approve" ? "published" : "removed";
				for (const appeal of data.appeals ?? []) {
					if (appeal.contentId === id && appeal.status === "open")
						appeal.status = action === "approve" ? "overturned" : "upheld";
				}
				data.moderation = {
					...data.moderation,
					[id]: { ...triageOf(data, id), source: "moderator" },
				};
				if (kind === "post") {
					const post = item as ForumPost;
					const thread = data.threads.find(
						(entry) => entry.id === post.threadId,
					);
					if (thread && !wasPublished && action === "approve") {
						thread.replyCount += 1;
						thread.lastActivityAt = new Date().toISOString();
					}
					if (thread && wasPublished && action === "remove")
						thread.replyCount = Math.max(thread.replyCount - 1, 0);
				}
			}
			save(data);
			notify(kind === "event" ? "events" : "forum");
		},

		async listMyRemoved() {
			const data = load();
			const account = currentAccount(data);
			if (!account) return [];
			const appealOf = (id: string) =>
				data.appeals?.find((a) => a.contentId === id)?.status ?? null;
			const item = (kind: ContentKind, id: string, title: string) => ({
				kind,
				id,
				title: title.slice(0, 80),
				appealStatus: appealOf(id),
			});
			return [
				...data.events
					.filter(
						(e) => e.organizerId === account.id && e.moderationStatus === "removed",
					)
					.map((e) => item("event", e.id, e.title)),
				...data.threads
					.filter(
						(t) => t.authorId === account.id && t.moderationStatus === "removed",
					)
					.map((t) => item("thread", t.id, t.title)),
				...data.posts
					.filter(
						(p) => p.authorId === account.id && p.moderationStatus === "removed",
					)
					.map((p) => item("post", p.id, p.body)),
			];
		},

		async appeal(kind, id, message) {
			const check = checkAppealMessage(message);
			if (!check.ok) throw new Error(check.error);
			const data = load();
			const account = requireAccount(data);
			const list: (CommunityEvent | ForumThread | ForumPost)[] =
				kind === "event"
					? data.events
					: kind === "thread"
						? data.threads
						: data.posts;
			const entry = list.find((candidate) => candidate.id === id);
			const owner =
				kind === "event"
					? (entry as CommunityEvent | undefined)?.organizerId
					: (entry as ForumThread | ForumPost | undefined)?.authorId;
			if (!entry || owner !== account.id)
				throw new Error("Solo quien lo publicó puede apelar.");
			if (entry.moderationStatus !== "removed")
				throw new Error("Solo se apela contenido retirado.");
			if (data.appeals?.some((a) => a.contentId === id))
				throw new Error("Ya pediste una segunda revisión de esto.");
			data.appeals = [
				...(data.appeals ?? []),
				{
					kind,
					contentId: id,
					message: check.message,
					status: "open",
					createdAt: new Date().toISOString(),
				},
			];
			save(data);
			notify(kind === "event" ? "events" : "forum");
		},

		async reportContent(kind, id, reason) {
			const data = load();
			const account = requireAccount(data);
			const list: (CommunityEvent | ForumThread | ForumPost)[] =
				kind === "event"
					? data.events
					: kind === "thread"
						? data.threads
						: data.posts;
			const item = list.find((entry) => entry.id === id);
			if (!item) throw new Error("Esta publicación ya no está disponible.");
			const owner =
				kind === "event"
					? (item as CommunityEvent).organizerId
					: (item as ForumThread | ForumPost).authorId;
			if (owner === account.id)
				throw new Error("No puedes reportar tu propia publicación.");
			const reports = data.reports ?? [];
			if (
				reports.some(
					(report) =>
						report.contentId === id && report.reporterId === account.id,
				)
			)
				return;
			reports.push({
				kind,
				contentId: id,
				reporterId: account.id,
				reason,
				createdAt: new Date().toISOString(),
			});
			data.reports = reports;
			if (
				reportCount(data, id) >= COMMUNITY_REPORT_HOLD_THRESHOLD &&
				item.moderationStatus === "published"
			) {
				item.moderationStatus = "held";
			}
			save(data);
			notify(kind === "event" ? "events" : "forum");
		},

		async exportMyData(): Promise<MyDataExport> {
			const data = load();
			const account = requireAccount(data);
			const registered = new Set(
				data.registrations
					.filter((item) => item.userId === account.id)
					.map((item) => item.eventId),
			);
			return {
				exportedAt: new Date().toISOString(),
				profile: publicProfile(account),
				registrations: data.events.filter((event) => registered.has(event.id)),
				organizedEvents: data.events.filter(
					(event) => event.organizerId === account.id,
				),
				threads: data.threads.filter(
					(thread) => thread.authorId === account.id,
				),
				posts: data.posts.filter((post) => post.authorId === account.id),
				reports: (data.reports ?? [])
					.filter((report) => report.reporterId === account.id)
					.map(({ kind, contentId, reason, createdAt }) => ({
						kind,
						contentId,
						reason,
						createdAt,
					})),
			};
		},

		async deleteAccount() {
			const data = load();
			const account = requireAccount(data);
			const now = Date.now();
			const removedThreads = new Set(
				data.threads
					.filter((thread) => thread.authorId === account.id)
					.map((thread) => thread.id),
			);
			data.threads = data.threads.filter(
				(thread) => !removedThreads.has(thread.id),
			);
			data.posts = data.posts.filter(
				(post) =>
					post.authorId !== account.id && !removedThreads.has(post.threadId),
			);
			for (const event of data.events) {
				if (event.organizerId !== account.id) continue;
				if (new Date(event.startsAt).getTime() > now)
					event.status = "cancelled";
				event.organizerId = null;
				event.organizerName = "Cuenta eliminada";
			}
			for (const registration of data.registrations) {
				if (registration.userId !== account.id) continue;
				const event = data.events.find(
					(item) => item.id === registration.eventId,
				);
				if (event)
					event.registeredCount = Math.max(event.registeredCount - 1, 0);
			}
			data.registrations = data.registrations.filter(
				(item) => item.userId !== account.id,
			);
			data.reports = (data.reports ?? []).filter(
				(report) => report.reporterId !== account.id,
			);
			data.accounts = data.accounts.filter((item) => item.id !== account.id);
			data.sessionId = null;
			save(data);
			emitSession(data);
			notify("events");
			notify("forum");
		},

		subscribe(topic, listener) {
			const set = topicListeners.get(topic) ?? new Set();
			set.add(listener);
			topicListeners.set(topic, set);
			return () => set.delete(listener);
		},
	};
}
