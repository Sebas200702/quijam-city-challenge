// Pure logic for event reminders, non-interrupting PWA notifications and
// per-user preferences (#91). Only safety alerts may interrupt (epic #57, rule 4),
// so every community notification sets requireInteraction: false.

import { isoToBogotaLocal } from "../community/community-rules";
import type { CommunityEvent } from "../community/community-types";
import type { AppNotification } from "./app-notification";
import type {
	NotificationPreferences,
	UserNotification,
	UserNotificationKind,
} from "./event-notifications-types";

/** Remind registered attendees starting 24 hours before the event (day before). */
export const REMINDER_WINDOW_HOURS = 24;

const PREFS_KEY = "quillart-notification-prefs";
const DISMISSED_REMINDERS_KEY = "quillart-dismissed-reminders";
const PREFS_EVENT = "quillart-notification-prefs-changed";

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
	inAppEnabled: true,
	webPushEnabled: true,
};

export const NOTIFICATION_KIND_LABELS: Record<UserNotificationKind, string> = {
	event_reminder: "Recordatorio",
	event_cancelled: "Evento cancelado",
	event_updated: "Cambio en evento",
	moderation_approved: "Aprobado",
	moderation_removed: "Retirado",
};

function formatBogotaClock(iso: string): string {
	const local = isoToBogotaLocal(iso);
	const [hourText, minute] = local.slice(11, 16).split(":");
	const hour24 = Number(hourText);
	if (Number.isNaN(hour24)) return local.slice(11, 16);
	const suffix = hour24 >= 12 ? "p. m." : "a. m.";
	const hour12 = hour24 % 12 || 12;
	return `${hour12}:${minute} ${suffix}`;
}

/**
 * Generates day-before reminders for registered upcoming events starting within
 * `windowHours` (default 24 h). Cancelled, held or already-started events are skipped.
 */
export function buildUpcomingEventReminders(
	events: readonly CommunityEvent[],
	registeredIds: readonly string[],
	now: Date = new Date(),
	windowHours: number = REMINDER_WINDOW_HOURS,
): UserNotification[] {
	const registered = new Set(registeredIds);
	const nowMs = now.getTime();
	const horizonMs = nowMs + windowHours * 3_600_000;
	const todayLocal = isoToBogotaLocal(now.toISOString()).slice(0, 10);

	const reminders: UserNotification[] = [];
	for (const event of events) {
		if (!registered.has(event.id)) continue;
		if (event.status !== "published" || event.moderationStatus !== "published")
			continue;
		const startMs = Date.parse(event.startsAt);
		if (Number.isNaN(startMs) || startMs <= nowMs || startMs > horizonMs)
			continue;

		const eventDayLocal = isoToBogotaLocal(event.startsAt).slice(0, 10);
		const clock = formatBogotaClock(event.startsAt);
		const diffHours = Math.round((startMs - nowMs) / 3_600_000);
		const timing =
			eventDayLocal !== todayLocal
				? `Es mañana a las ${clock}.`
				: diffHours <= 1
					? `Empieza hoy a las ${clock} (en menos de 1 hora).`
					: `Es hoy a las ${clock} (en unas ${diffHours} h).`;

		reminders.push({
			id: `reminder:${event.id}:${eventDayLocal}`,
			kind: "event_reminder",
			title: `Recordatorio: ${event.title}`,
			body: timing,
			href: `/agenda/${encodeURIComponent(event.id)}`,
			eventId: event.id,
			readAt: null,
			createdAt: now.toISOString(),
		});
	}

	return reminders.sort((a, b) => a.id.localeCompare(b.id));
}

/** Merges stored notices with active reminders, applying dismissed reminder state. */
export function mergeUserNotifications(
	stored: readonly UserNotification[],
	reminders: readonly UserNotification[],
	dismissedReminderIds: ReadonlySet<string>,
): UserNotification[] {
	const mergedReminders = reminders.map((reminder) =>
		dismissedReminderIds.has(reminder.id)
			? { ...reminder, readAt: reminder.createdAt }
			: reminder,
	);
	const all = [...stored, ...mergedReminders];
	return all.sort((a, b) => {
		const aUnread = a.readAt === null ? 0 : 1;
		const bUnread = b.readAt === null ? 0 : 1;
		if (aUnread !== bUnread) return aUnread - bUnread;
		return b.createdAt.localeCompare(a.createdAt);
	});
}

/**
 * Converts a community notification to a quiet PWA AppNotification.
 * Never sets requireInteraction: true so it obeys epic #57 rule 4.
 */
export function toQuietWebNotification(
	notice: UserNotification,
): AppNotification {
	return {
		title: notice.title,
		body: notice.body,
		tag: `quillart-notice-${notice.id}`,
		url: notice.href,
		requireInteraction: false,
		dedupeKey: `user-notice:${notice.id}`,
	};
}

export function isReminderId(id: string): boolean {
	return id.startsWith("reminder:");
}

export function readNotificationPreferences(): NotificationPreferences {
	if (typeof window === "undefined") return DEFAULT_NOTIFICATION_PREFERENCES;
	try {
		const raw = localStorage.getItem(PREFS_KEY);
		if (!raw) return DEFAULT_NOTIFICATION_PREFERENCES;
		const parsed = JSON.parse(raw) as Partial<NotificationPreferences>;
		return {
			inAppEnabled: parsed.inAppEnabled !== false,
			webPushEnabled: parsed.webPushEnabled !== false,
		};
	} catch {
		return DEFAULT_NOTIFICATION_PREFERENCES;
	}
}

export function writeNotificationPreferences(
	prefs: NotificationPreferences,
): void {
	if (typeof window === "undefined") return;
	try {
		localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
		window.dispatchEvent(new CustomEvent(PREFS_EVENT, { detail: prefs }));
	} catch {
		// Storage blocked: ignore.
	}
}

export function subscribeNotificationPreferences(
	listener: (prefs: NotificationPreferences) => void,
): () => void {
	if (typeof window === "undefined") return () => undefined;
	const onCustom = () => listener(readNotificationPreferences());
	const onStorage = (event: StorageEvent) => {
		if (event.key === PREFS_KEY) listener(readNotificationPreferences());
	};
	window.addEventListener(PREFS_EVENT, onCustom);
	window.addEventListener("storage", onStorage);
	return () => {
		window.removeEventListener(PREFS_EVENT, onCustom);
		window.removeEventListener("storage", onStorage);
	};
}

export function readDismissedReminders(): Set<string> {
	if (typeof window === "undefined") return new Set();
	try {
		const raw = localStorage.getItem(DISMISSED_REMINDERS_KEY);
		if (!raw) return new Set();
		const parsed = JSON.parse(raw) as unknown;
		return Array.isArray(parsed)
			? new Set(
					parsed.filter((item): item is string => typeof item === "string"),
				)
			: new Set();
	} catch {
		return new Set();
	}
}

export function dismissReminderIds(ids: readonly string[]): Set<string> {
	const next = readDismissedReminders();
	for (const id of ids) next.add(id);
	// Keep the last 100 reminder keys so localStorage stays tiny.
	const trimmed = [...next].slice(-100);
	if (typeof window !== "undefined") {
		try {
			localStorage.setItem(DISMISSED_REMINDERS_KEY, JSON.stringify(trimmed));
		} catch {
			// Storage blocked: ignore.
		}
	}
	return new Set(trimmed);
}
