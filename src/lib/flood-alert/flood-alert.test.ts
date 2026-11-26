import { describe, expect, it } from "vitest";
import { CORRIDOR_SEED } from "../corridor/corridor-seed";
import {
	applyCityEvent,
	blockedFloodZoneIds,
	type FloodCountdowns,
	floodStatus,
	mostUrgentAlert,
} from "./flood-countdown";
import { buildRouteOptions } from "./route-options";
import { recalculateRoute } from "./route-recalc";
import { ROUTE_SEGMENTS } from "./route-segments-seed";

const floodZones = CORRIDOR_SEED.floodZones;
const NOW = Date.UTC(2034, 5, 20, 18, 0);
const minutes = (count: number) => count * 60_000;

const options = buildRouteOptions(
	ROUTE_SEGMENTS,
	"STOP-MALECON-SUR",
	"STOP-ESTADIO",
);
const TAXI = "SEG-MAL-EST-TAXI";
const TM_GREEN = "SEG-MAL-EST-TM-GREEN";

describe("buildRouteOptions", () => {
	it("finds every Malecon to Estadio route in the seed", () => {
		expect(options.map((option) => option.id).sort()).toEqual(
			[
				"SEG-MAL-BAR-WALK+SEG-BAR-CEN-WALK+SEG-CEN-MUR46-BUS+SEG-MUR46-EST-TM",
				"SEG-MAL-CEN-TAXI+SEG-CEN-MUR46-BUS+SEG-MUR46-EST-TM",
				TM_GREEN,
				TAXI,
			].sort(),
		);
	});

	it("adds up time and fare and collects the arroyos crossed", () => {
		const walkBus = options.find((option) =>
			option.id.startsWith("SEG-MAL-BAR-WALK"),
		);
		expect(walkBus).toMatchObject({
			durationMinutes: 63,
			fareCop: 7000,
			accessible: false,
			floodZoneIds: ["ARR-BARRIO-ABAJO", "ARR-FELICIDAD"],
		});
	});
});

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

describe("recalculateRoute", () => {
	const recalc = (
		currentOptionId: string,
		blocked: string[],
		accessibleMode = false,
	) =>
		recalculateRoute({
			currentOptionId,
			options,
			blockedFloodZoneIds: blocked,
			floodZones,
			accessibleMode,
		});

	it("moves a visitor off a route that crosses a blocked arroyo", () => {
		const result = recalc(TAXI, ["ARR-MURILLO-46"]);
		expect(result.changed).toBe(true);
		expect(result.decision.option?.id).toBe(TM_GREEN);
		expect(result.reason).toContain("Arroyo Carrera 46 con Murillo");
	});

	it("leaves routes alone when they cross no blocked arroyo", () => {
		const result = recalc(TM_GREEN, ["ARR-MURILLO-46"]);
		expect(result.changed).toBe(false);
		expect(result.reason).toBeNull();
	});

	it("never offers a route through a blocked arroyo, whatever is blocked", () => {
		const codes = floodZones.map((zone) => zone.code);
		// Every combination of blocked arroyos, with and without accessible mode.
		for (let mask = 0; mask < 1 << codes.length; mask++) {
			const blocked = codes.filter((_, index) => mask & (1 << index));
			for (const accessibleMode of [false, true]) {
				const option = recalc(TAXI, blocked, accessibleMode).decision.option;
				if (option) {
					expect(
						option.floodZoneIds.filter((code) => blocked.includes(code)),
					).toEqual([]);
					if (accessibleMode) expect(option.accessible).toBe(true);
				}
			}
		}
	});
});
