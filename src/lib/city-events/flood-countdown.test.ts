import { describe, expect, it } from "vitest";
import { INITIAL_CITY_STATE, reduceCityEvent } from "./city-state";
import {
	floodAlertText,
	hasPendingFlood,
	mostUrgentFlood,
} from "./flood-countdown";

const NOW = 1_000_000;
const minutes = (count: number) => count * 60_000;

function downpour(
	zoneIds: string[],
	startsInMin: number,
	at = NOW,
	from = INITIAL_CITY_STATE,
) {
	return reduceCityEvent(from, { type: "aguacero", zoneIds, startsInMin }, at);
}

describe("flood countdown", () => {
	it("records when each arroyo overflows and blocks it for routing right away", () => {
		const state = downpour(["ARR-MURILLO-46"], 12);
		expect(state.floodStartsAt).toEqual({
			"ARR-MURILLO-46": NOW + minutes(12),
		});
		expect(state.activeFloodZoneIds).toEqual(["ARR-MURILLO-46"]);
	});

	it("counts down and then turns active", () => {
		const state = downpour(["ARR-MURILLO-46"], 12);
		expect(mostUrgentFlood(state, NOW)).toEqual({
			code: "ARR-MURILLO-46",
			kind: "countdown",
			minutesLeft: 12,
		});
		expect(mostUrgentFlood(state, NOW + minutes(11.5))).toMatchObject({
			minutesLeft: 1,
		});
		expect(mostUrgentFlood(state, NOW + minutes(12))).toEqual({
			code: "ARR-MURILLO-46",
			kind: "active",
		});
	});

	it("keeps the earlier countdown when a second downpour arrives", () => {
		const first = downpour(["A"], 5);
		const second = downpour(["A"], 20, NOW, first);
		expect(second.floodStartsAt.A).toBe(NOW + minutes(5));
	});

	it("shows one alert: an active arroyo before any countdown, then the closest one", () => {
		let state = downpour(["FAR"], 20);
		state = downpour(["NEAR"], 4, NOW, state);
		expect(mostUrgentFlood(state, NOW)).toMatchObject({
			code: "NEAR",
			minutesLeft: 4,
		});
		state = downpour(["NOW"], 0, NOW, state);
		expect(mostUrgentFlood(state, NOW)).toEqual({
			code: "NOW",
			kind: "active",
		});
	});

	it("knows when a clock is needed", () => {
		const state = downpour(["A"], 1);
		expect(hasPendingFlood(state, NOW)).toBe(true);
		expect(hasPendingFlood(state, NOW + minutes(1))).toBe(false);
		expect(hasPendingFlood(INITIAL_CITY_STATE, NOW)).toBe(false);
	});

	it("has no alert without floods and clears on reiniciar", () => {
		expect(mostUrgentFlood(INITIAL_CITY_STATE, NOW)).toBeNull();
		const reset = reduceCityEvent(downpour(["A"], 3), { type: "reiniciar" });
		expect(reset.floodStartsAt).toEqual({});
		expect(mostUrgentFlood(reset, NOW)).toBeNull();
	});

	it("writes one short sentence", () => {
		expect(
			floodAlertText(
				{ code: "A", kind: "countdown", minutesLeft: 12 },
				"Arroyo Calle 48",
			),
		).toBe("Arroyo Calle 48: se activa en 12 min. Evita la zona.");
		expect(
			floodAlertText({ code: "A", kind: "active" }, "Arroyo Calle 48"),
		).toBe("Arroyo Calle 48: arroyo activo. No cruces.");
	});
});
