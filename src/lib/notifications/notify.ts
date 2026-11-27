// Browser side of system notifications: permission and display through the
// service worker, so a tap opens the app (see notificationclick in
// src/lib/offline/service-worker.ts). Permission is only asked from a button
// the person taps next to a safety alert, never on load (epic #57, rule 4).

import { type AppNotification, notificationOptions } from "./app-notification";

export type NotificationPermissionState =
	| NotificationPermission
	| "unsupported";

/** Dedupe keys already shown on this page. */
const shown = new Set<string>();

export function notificationPermission(): NotificationPermissionState {
	if (typeof window === "undefined" || !("Notification" in window)) {
		return "unsupported";
	}
	return Notification.permission;
}

/** Call only from a tap on an in-context button. */
export async function askNotificationPermission(): Promise<NotificationPermissionState> {
	if (notificationPermission() === "unsupported") return "unsupported";
	return Notification.requestPermission();
}

/** Shows the notification if allowed; false when it was not shown. */
export async function showAppNotification(
	notification: AppNotification,
): Promise<boolean> {
	if (notificationPermission() !== "granted") return false;
	const { dedupeKey } = notification;
	if (dedupeKey && shown.has(dedupeKey)) return false;
	// Marked before awaiting, so two quick updates never notify twice.
	if (dedupeKey) shown.add(dedupeKey);
	const options = notificationOptions(
		notification,
		document.documentElement.lang,
	);
	try {
		const registration =
			"serviceWorker" in navigator
				? await navigator.serviceWorker.getRegistration()
				: undefined;
		if (registration) {
			await registration.showNotification(notification.title, options);
		} else {
			// `astro dev` has no worker; Android needs one, so this only helps on desktop.
			new Notification(notification.title, options);
		}
	} catch {
		if (dedupeKey) shown.delete(dedupeKey);
		return false;
	}
	return true;
}

/** `reiniciar`: the next alert notifies again. */
export function forgetShownNotifications(): void {
	shown.clear();
}
