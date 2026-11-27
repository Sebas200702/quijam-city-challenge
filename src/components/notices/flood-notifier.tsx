import { useEffect, useRef } from "react";
import { connectCityEvents } from "../../lib/city-events/city-events-channel";
import { CORRIDOR_SEED } from "../../lib/corridor/corridor-seed";
import { useT } from "../../lib/i18n/use-language";
import { floodNotificationFromEvent } from "../../lib/notifications/flood-notification";
import {
	forgetShownNotifications,
	notificationPermission,
	showAppNotification,
} from "../../lib/notifications/notify";

/**
 * Arroyo notifications on the screens without the map (Quillart AI, agenda,
 * places…): listens to `city-events` and notifies an `aguacero`. Only when
 * the person already allowed notifications next to an arroyo alert on the
 * map; it never asks. The map has its own listener (FloodAlertBanner), so it
 * is not mounted there. Renders nothing.
 */
export function FloodNotifier() {
	const copy = useT().notifications;
	const copyRef = useRef(copy);
	copyRef.current = copy;

	useEffect(() => {
		if (notificationPermission() !== "granted") return;
		let closed = false;
		let close: (() => void) | null = null;
		void connectCityEvents(
			(event) => {
				if (event.type === "reiniciar") forgetShownNotifications();
				if (event.type !== "aguacero") return;
				const notification = floodNotificationFromEvent(
					event,
					CORRIDOR_SEED.floodZones,
					copyRef.current,
				);
				if (notification) void showAppNotification(notification);
			},
			() => undefined,
		).then((connection) => {
			if (closed) connection.close();
			else close = () => connection.close();
		});
		return () => {
			closed = true;
			close?.();
		};
	}, []);

	return null;
}
