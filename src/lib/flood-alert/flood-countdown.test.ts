import { describe, expect, it } from "vitest";
import { CORRIDOR_SEED } from "../corridor/corridor-seed";
import {
	applyCityEvent,
	blockedFloodZoneIds,
	type FloodCountdowns,
	floodStatus,
	mostUrgentAlert,
} from "./flood-countdown";

const floodZones = CORRIDOR_SEED.floodZones;
const NOW = Date.UTC(2034, 5, 20, 18, 0);
const minutes = (count: number) => count * 60_000;

describe("flood countdown", () => {
	const aguacero = (zoneIds: string[], startsInMin = 12) =>
		applyCityEvent(
			{},
			{ type: "aguacero", zoneIds, startsInMin },
			floodZones,
			NOW,
		);

	it("starts a countdown by corridor zone or by flood zone code", () => {
		expect(aguacero(["troncal_murillo"])).toEqual({
			"ARR-MURILLO-46": NOW + minutes(12),
		});
		expect(aguacero(["ARR-VIA-40"])).toEqual({
			"ARR-VIA-40": NOW + minutes(12),
		});
	});

	it("counts down and then turns active", () => {
		const countdowns = aguacero(["troncal_murillo"]);
		const zone = floodZones.find((item) => item.code === "ARR-MURILLO-46");
		if (!zone) throw new Error("seed changed");
		expect(floodStatus(zone, countdowns, NOW)).toEqual({
			kind: "countdown",
			minutesLeft: 12,
		});
		expect(floodStatus(zone, countdowns, NOW + minutes(11.5))).toEqual({
			kind: "countdown",
			minutesLeft: 1,
		});
		expect(floodStatus(zone, countdowns, NOW + minutes(12))).toEqual({
			kind: "active",
		});
	});

	it("keeps the earlier countdown when a second aguacero arrives", () => {
		const first = aguacero(["troncal_murillo"], 5);
		const second = applyCityEvent(
			first,
			{ type: "aguacero", zoneIds: ["troncal_murillo"], startsInMin: 20 },
			floodZones,
			NOW,
		);
		expect(second["ARR-MURILLO-46"]).toBe(NOW + minutes(5));
	});

	it("clears everything on reiniciar and ignores other events", () => {
		const countdowns = aguacero(["centro"]);
		expect(
			applyCityEvent(countdowns, { type: "reiniciar" }, floodZones, NOW),
		).toEqual({});
		expect(
			applyCityEvent(
				countdowns,
				{ type: "malecon_saturado", capacityPct: 140 },
				floodZones,
				NOW,
			),
		).toBe(countdowns);
	});

	it("blocks zones counting down as well as active ones", () => {
		const countdowns: FloodCountdowns = { "ARR-FELICIDAD": NOW + minutes(10) };
		const zones = floodZones.map((zone) =>
			zone.code === "ARR-VIA-40" ? { ...zone, alert_active: true } : zone,
		);
		expect(blockedFloodZoneIds(zones, countdowns, NOW).sort()).toEqual([
			"ARR-FELICIDAD",
			"ARR-VIA-40",
		]);
	});

	it("shows one alert at a time: active before the closest countdown", () => {
		const countdowns: FloodCountdowns = {
			"ARR-FELICIDAD": NOW + minutes(10),
			"ARR-MURILLO-46": NOW + minutes(4),
		};
		expect(mostUrgentAlert(floodZones, countdowns, NOW)?.zone.code).toBe(
			"ARR-MURILLO-46",
		);
		const withActive = { ...countdowns, "ARR-VIA-40": NOW - 1 };
		expect(mostUrgentAlert(floodZones, withActive, NOW)?.status).toEqual({
			kind: "active",
		});
		expect(mostUrgentAlert(floodZones, {}, NOW)).toBeNull();
	});
});
