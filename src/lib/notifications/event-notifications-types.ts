export type UserNotificationKind =
	| "event_reminder"
	| "event_cancelled"
	| "event_updated"
	| "moderation_approved"
	| "moderation_removed";

/** One in-app or PWA notification for the signed-in person (#91, #92). */
export interface UserNotification {
	id: string;
	kind: UserNotificationKind;
	title: string;
	body: string;
	/** Same-origin link opened when the person taps the notice. */
	href: string;
	eventId: string | null;
	readAt: string | null;
	createdAt: string;
}

/** Per-device preferences so the person can turn off reminders and web alerts. */
export interface NotificationPreferences {
	/** Discreet in-app cards and reminder banners (never interrupting modals). */
	inAppEnabled: boolean;
	/** Quiet browser/PWA notifications when browser permission is granted. */
	webPushEnabled: boolean;
}
