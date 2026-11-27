// The arroyo alert as a system notification (#47): same facts as the arroyo
// modal (src/lib/notices/notice-builders.ts), in the chosen language. Tapping
// it opens the map, where the routes already avoid the arroyo.

import type { CityEvent } from "../city-events/city-events-types";
import type { FloodStatus, FloodZoneRef } from "../flood-alert/flood-countdown";
import type { NotificationsMessages } from "../i18n/dictionaries/notifications";
import type { AppNotification } from "./app-notification";

export const FLOOD_NOTIFICATION_URL = "/mapa";

type ActiveFloodStatus = Exclude<FloodStatus, { kind: "none" }>;
type FloodCopy = Pick<
	NotificationsMessages,
	"floodSoon" | "floodNow" | "floodBody" | "floodBodyNoZone"
>;

export function floodNotification(
	zone: { code: string; name: string | null },
	status: ActiveFloodStatus,
	copy: FloodCopy,
): AppNotification {
	return {
		title:
			status.kind === "active"
				? copy.floodNow
				: copy.floodSoon(status.minutesLeft),
		body: zone.name ? copy.floodBody(zone.name) : copy.floodBodyNoZone,
		tag: `arroyo:${zone.code}`,
		url: FLOOD_NOTIFICATION_URL,
		requireInteraction: true,
		// Once while it counts down and once when it becomes active.
		dedupeKey: `arroyo:${zone.code}:${status.kind}`,
	};
}

/**
 * From a raw `aguacero` event, on screens that do not track the flood zones
 * (zone names come from `zones`, usually the corridor seed). Zone ids may be
 * flood zone codes or corridor zones, as in `applyCityEvent`.
 */
export function floodNotificationFromEvent(
	event: Extract<CityEvent, { type: "aguacero" }>,
	zones: readonly FloodZoneRef[],
	copy: FloodCopy,
): AppNotification | null {
	const [firstId] = event.zoneIds;
	if (firstId === undefined) return null;
	const zone = zones.find(
		(item) =>
			event.zoneIds.includes(item.code) || event.zoneIds.includes(item.zone),
	);
	const minutesLeft = Math.ceil(event.startsInMin);
	return floodNotification(
		{ code: zone?.code ?? firstId, name: zone?.name ?? null },
		minutesLeft > 0 ? { kind: "countdown", minutesLeft } : { kind: "active" },
		copy,
	);
}
