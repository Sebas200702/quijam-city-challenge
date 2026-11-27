// Maps Supabase rows (snake_case) to the community types, and moderation
// decisions to what gets stored and told to the author.

import type {
	ModerationDecision,
	ModerationStatus,
} from "../moderation/moderation-types";
import type {
	CommunityEvent,
	ForumPost,
	ForumThread,
	Place,
	PublishResult,
} from "./community-types";

export const PLACE_COLUMNS =
	"id, slug, name, kind, neighborhood, description, address, latitude, longitude, is_accessible, is_free, opening_hours";
export const EVENT_COLUMNS =
	"id, title, description, category, starts_at, ends_at, place_id, location_text, capacity, registered_count, is_free, price_cop, organizer_id, organizer_name, organizer_verified, status, moderation_status, triage_priority, created_at";
export const THREAD_COLUMNS =
	"id, title, body, category, place_id, event_id, author_id, author_name, reply_count, last_activity_at, city_verified_at, moderation_status, triage_priority, created_at";
export const POST_COLUMNS =
	"id, thread_id, body, author_id, author_name, moderation_status, triage_priority, created_at";

type Row = Record<string, unknown>;

const str = (value: unknown): string => String(value ?? "");
const strOrNull = (value: unknown): string | null =>
	value === null || value === undefined ? null : String(value);
const numOrNull = (value: unknown): number | null =>
	value === null || value === undefined ? null : Number(value);

export function toPlace(row: Row): Place {
	return {
		id: str(row.id),
		slug: str(row.slug),
		name: str(row.name),
		kind: row.kind as Place["kind"],
		neighborhood: str(row.neighborhood),
		description: str(row.description),
		address: strOrNull(row.address),
		latitude: Number(row.latitude),
		longitude: Number(row.longitude),
		isAccessible: Boolean(row.is_accessible),
		isFree: Boolean(row.is_free),
		openingHours: strOrNull(row.opening_hours),
	};
}

export function toEvent(row: Row): CommunityEvent {
	return {
		id: str(row.id),
		title: str(row.title),
		description: str(row.description),
		category: row.category as CommunityEvent["category"],
		startsAt: str(row.starts_at),
		endsAt: strOrNull(row.ends_at),
		placeId: strOrNull(row.place_id),
		locationText: strOrNull(row.location_text),
		capacity: numOrNull(row.capacity),
		registeredCount: Number(row.registered_count ?? 0),
		isFree: Boolean(row.is_free),
		priceCop: numOrNull(row.price_cop),
		organizerId: strOrNull(row.organizer_id),
		organizerName: str(row.organizer_name),
		organizerVerified: Boolean(row.organizer_verified),
		status: row.status as CommunityEvent["status"],
		moderationStatus:
			row.moderation_status as CommunityEvent["moderationStatus"],
		triagePriority: row.triage_priority as CommunityEvent["triagePriority"],
		createdAt: str(row.created_at),
	};
}

export function toThread(row: Row): ForumThread {
	return {
		id: str(row.id),
		title: str(row.title),
		body: str(row.body),
		category: row.category as ForumThread["category"],
		placeId: strOrNull(row.place_id),
		eventId: strOrNull(row.event_id),
		authorId: strOrNull(row.author_id),
		authorName: str(row.author_name),
		replyCount: Number(row.reply_count ?? 0),
		lastActivityAt: str(row.last_activity_at),
		cityVerified:
			row.city_verified_at !== null && row.city_verified_at !== undefined,
		moderationStatus: row.moderation_status as ForumThread["moderationStatus"],
		triagePriority: row.triage_priority as ForumThread["triagePriority"],
		createdAt: str(row.created_at),
	};
}

export function toPost(row: Row): ForumPost {
	return {
		id: str(row.id),
		threadId: str(row.thread_id),
		body: str(row.body),
		authorId: strOrNull(row.author_id),
		authorName: str(row.author_name),
		moderationStatus: row.moderation_status as ForumPost["moderationStatus"],
		triagePriority: row.triage_priority as ForumPost["triagePriority"],
		createdAt: str(row.created_at),
	};
}

/** Status to store for a decision; null when it must not be stored at all. */
export function storedStatus(
	decision: ModerationDecision,
): ModerationStatus | null {
	if (decision.verdict === "reject") return null;
	return decision.verdict === "publish" ? "published" : "held";
}

export function publishResult<T>(
	decision: ModerationDecision,
	record: T | null,
): PublishResult<T> {
	const outcome =
		decision.verdict === "reject"
			? "rejected"
			: decision.verdict === "review"
				? "held"
				: "published";
	return {
		outcome,
		message: decision.reason,
		priority: decision.priority,
		record,
	};
}

/** Columns the server writes on every moderated insert. */
export function moderationColumns(decision: ModerationDecision) {
	return {
		moderation_status: storedStatus(decision),
		moderation_labels: decision.labels,
		moderation_source: decision.source,
		triage_priority: decision.priority,
	};
}
