// Discreet in-app notice strip + quiet PWA Web Notifications for signed-in
// users (#91). Obeys epic #57 rule 4: never opens a modal and never asks for
// browser permission on load; shows at most one discreet card at a time.

import { Bell, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
	buildUpcomingEventReminders,
	dismissReminderIds,
	isReminderId,
	mergeUserNotifications,
	readDismissedReminders,
	readNotificationPreferences,
	subscribeNotificationPreferences,
	toQuietWebNotification,
} from "../../lib/notifications/event-notifications";
import type {
	NotificationPreferences,
	UserNotification,
} from "../../lib/notifications/event-notifications-types";
import {
	notificationPermission,
	showAppNotification,
} from "../../lib/notifications/notify";
import { useSession, useStore } from "../community/use-community";

export function EventNotifier() {
	const store = useStore();
	const { profile } = useSession();
	const [prefs, setPrefs] = useState<NotificationPreferences>(
		readNotificationPreferences,
	);
	const [topUnread, setTopUnread] = useState<UserNotification | null>(null);
	const [unreadTotal, setUnreadTotal] = useState(0);

	useEffect(() => subscribeNotificationPreferences(setPrefs), []);

	const refresh = useCallback(async () => {
		if (!profile) {
			setTopUnread(null);
			setUnreadTotal(0);
			return;
		}
		try {
			const [stored, regIds] = await Promise.all([
				store.listNotifications(),
				store.myRegistrations(),
			]);
			const registeredEvents =
				regIds.length > 0
					? await store.listEvents({ ids: regIds, includePast: false })
					: [];
			const reminders = buildUpcomingEventReminders(registeredEvents, regIds);
			const merged = mergeUserNotifications(
				stored,
				reminders,
				readDismissedReminders(),
			);
			const unread = merged.filter((item) => item.readAt === null);
			setUnreadTotal(unread.length);
			setTopUnread(unread[0] ?? null);

			if (
				prefs.webPushEnabled &&
				notificationPermission() === "granted" &&
				unread[0]
			) {
				void showAppNotification(toQuietWebNotification(unread[0]));
			}
		} catch {
			// Quiet fallback: never disrupt navigation if notifications fail to load.
		}
	}, [profile, store, prefs.webPushEnabled]);

	useEffect(() => {
		if (!profile) {
			setTopUnread(null);
			setUnreadTotal(0);
			return;
		}
		void refresh();
		const unsubNotices = store.subscribe("notifications", () => void refresh());
		const unsubEvents = store.subscribe("events", () => void refresh());
		return () => {
			unsubNotices();
			unsubEvents();
		};
	}, [profile, store, refresh]);

	async function dismissCurrent() {
		if (!topUnread) return;
		const id = topUnread.id;
		setTopUnread(null);
		if (isReminderId(id)) {
			dismissReminderIds([id]);
		} else {
			await store.markNotificationRead(id);
		}
		void refresh();
	}

	if (!profile || !prefs.inAppEnabled || !topUnread) return null;

	return (
		<aside
			aria-label="Aviso de eventos"
			role="status"
			className="mx-4 mt-3 lg:mx-8"
		>
			<div className="q-alert q-alert--info items-center">
				<span className="q-alert__icon" aria-hidden="true">
					<Bell size={18} strokeWidth={1.75} />
				</span>
				<div className="q-alert__body min-w-0">
					<p className="q-alert__title">{topUnread.title}</p>
					<p className="q-alert__text">{topUnread.body}</p>
					<div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs">
						<a
							href={topUnread.href}
							className="inline-flex min-h-11 items-center font-semibold text-[var(--ink)] underline underline-offset-2"
						>
							Ver detalle
						</a>
						{unreadTotal > 1 && (
							<a
								href="/perfil#mis-avisos"
								className="inline-flex min-h-11 items-center text-[var(--ink-muted)] hover:text-[var(--ink)]"
							>
								Ver {unreadTotal} avisos
							</a>
						)}
					</div>
				</div>
				<button
					type="button"
					onClick={() => void dismissCurrent()}
					aria-label="Descartar aviso"
					className="q-alert__close min-h-11 min-w-11"
				>
					<X size={18} strokeWidth={1.75} aria-hidden="true" />
				</button>
			</div>
		</aside>
	);
}
