import { describe, expect, it } from "vitest";
import { CORRIDOR_SEED } from "../corridor/corridor-seed";
import { notifications } from "../i18n/dictionaries/notifications";
import { notificationOptions, notificationTarget } from "./app-notification";
import {
	FLOOD_NOTIFICATION_URL,
	floodNotification,
	floodNotificationFromEvent,
} from "./flood-notification";

const es = notifications.es;
const zone = CORRIDOR_SEED.floodZones[0];

describe("floodNotification", () => {
	it("counts down, names the zone and opens the map", () => {
		const notification = floodNotification(
			zone,
			{ kind: "countdown", minutesLeft: 12 },
			es,
		);
		expect(notification).toEqual({
			title: "Arroyo activo en 12 min",
			body: `En ${zone.name}. No cruces calles con agua. Toca para ver rutas seguras.`,
			tag: `arroyo:${zone.code}`,
			url: FLOOD_NOTIFICATION_URL,
			requireInteraction: true,
			dedupeKey: `arroyo:${zone.code}:countdown`,
		});
	});

	it("replaces the countdown when the arroyo becomes active (same tag, new stage)", () => {
		const soon = floodNotification(
			zone,
			{ kind: "countdown", minutesLeft: 3 },
			es,
		);
		const now = floodNotification(zone, { kind: "active" }, notifications.en);
		expect(now.title).toBe("Active arroyo now");
		expect(now.tag).toBe(soon.tag);
		expect(now.dedupeKey).not.toBe(soon.dedupeKey);
	});
});

describe("floodNotificationFromEvent", () => {
	it("finds the zone name by flood zone code or corridor zone", () => {
		const byCode = floodNotificationFromEvent(
			{ type: "aguacero", zoneIds: [zone.code], startsInMin: 12 },
			CORRIDOR_SEED.floodZones,
			es,
		);
		const byZone = floodNotificationFromEvent(
			{ type: "aguacero", zoneIds: [zone.zone], startsInMin: 0 },
			CORRIDOR_SEED.floodZones,
			es,
		);
		expect(byCode?.body).toContain(zone.name);
		expect(byZone?.title).toBe("Arroyo activo ahora");
	});

	it("still warns for an unknown zone, and not for an empty event", () => {
		const unknown = floodNotificationFromEvent(
			{ type: "aguacero", zoneIds: ["ARR-NUEVO"], startsInMin: 5 },
			CORRIDOR_SEED.floodZones,
			es,
		);
		expect(unknown?.body).toBe(es.floodBodyNoZone);
		expect(unknown?.tag).toBe("arroyo:ARR-NUEVO");
		expect(
			floodNotificationFromEvent(
				{ type: "aguacero", zoneIds: [], startsInMin: 5 },
				CORRIDOR_SEED.floodZones,
				es,
			),
		).toBeNull();
	});
});

describe("app notifications", () => {
	const origin = "https://quillart.example";

	it("carries the target page, icon and badge", () => {
		const options = notificationOptions(
			floodNotification(zone, { kind: "active" }, es),
			"es",
		);
		expect(options).toMatchObject({
			tag: `arroyo:${zone.code}`,
			icon: "/icons/icon-192.png",
			badge: "/icons/badge-96.png",
			requireInteraction: true,
			data: { url: "/mapa" },
		});
	});

	it("only opens pages of the app", () => {
		expect(notificationTarget({ url: "/mapa" }, origin)).toBe(`${origin}/mapa`);
		expect(notificationTarget({ url: "https://evil.example/x" }, origin)).toBe(
			`${origin}/inicio`,
		);
		expect(notificationTarget(null, origin)).toBe(`${origin}/inicio`);
	});
});
