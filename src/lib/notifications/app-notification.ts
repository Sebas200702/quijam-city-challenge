// A system notification shown through the service worker. Pure data: the
// arroyo alert builds one today (#47) and event reminders can reuse it (#91).
// Only safety alerts may interrupt (epic #57, rule 4).

export interface AppNotification {
	title: string;
	body: string;
	/** A newer notification with the same tag replaces the older one silently. */
	tag: string;
	/** Same-origin page opened when the notification is tapped. */
	url: string;
	/** Safety alerts stay on screen until the person acts. */
	requireInteraction: boolean;
	/** Shown at most once per page with this key (a stage of the same alert). */
	dedupeKey?: string;
}

export const NOTIFICATION_ICON = "/icons/icon-192.png";
/** Monochrome star for the Android status bar. */
export const NOTIFICATION_BADGE = "/icons/badge-96.png";
/** Where a notification without a valid target opens: Quillart AI. */
export const NOTIFICATION_FALLBACK_URL = "/inicio";

/** Options for `ServiceWorkerRegistration.showNotification`. */
export function notificationOptions(
	notification: AppNotification,
	lang: string,
): NotificationOptions {
	return {
		body: notification.body,
		tag: notification.tag,
		icon: NOTIFICATION_ICON,
		badge: NOTIFICATION_BADGE,
		lang,
		requireInteraction: notification.requireInteraction,
		data: { url: notification.url },
	};
}

/** The page a tapped notification opens; never another site. */
export function notificationTarget(data: unknown, origin: string): string {
	const url =
		typeof data === "object" && data !== null
			? (data as { url?: unknown }).url
			: undefined;
	if (typeof url === "string") {
		try {
			const target = new URL(url, origin);
			if (target.origin === origin) return target.href;
		} catch {
			// Not a URL: fall through to the app home.
		}
	}
	return new URL(NOTIFICATION_FALLBACK_URL, origin).href;
}
