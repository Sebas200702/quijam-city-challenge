import { describe, expect, it } from "vitest";
import {
	crowdByZoneFrom,
	INITIAL_CITY_STATE,
	reduceCityEvent,
} from "./city-state";

describe("reduceCityEvent", () => {
	it("activates the flood zones of a downpour and stamps the time", () => {
		const state = reduceCityEvent(
			INITIAL_CITY_STATE,
			{ type: "aguacero", zoneIds: ["ARR-MURILLO-46"], startsInMin: 12 },
			1000,
		);

		expect(state.activeFloodZoneIds).toEqual(["ARR-MURILLO-46"]);
		expect(state.floodAlertAt).toBe(1000);
	});

	it("does not duplicate zones on repeated downpours", () => {
		const once = reduceCityEvent(
			INITIAL_CITY_STATE,
			{ type: "aguacero", zoneIds: ["A"], startsInMin: 0 },
			1,
		);
		const twice = reduceCityEvent(
			once,
			{ type: "aguacero", zoneIds: ["A", "B"], startsInMin: 0 },
			2,
		);

		expect(twice.activeFloodZoneIds).toEqual(["A", "B"]);
	});

	it("records Malecón saturation, city mode, hour and overcharge reports", () => {
		let state = reduceCityEvent(INITIAL_CITY_STATE, {
			type: "malecon_saturado",
			capacityPct: 140,
		});
		state = reduceCityEvent(state, { type: "modo_ciudad", mode: "carnaval" });
		state = reduceCityEvent(state, { type: "tiempo", hour: 18 });
		state = reduceCityEvent(state, { type: "cobro_abusivo", reportId: "r1" });

		expect(state).toMatchObject({
			maleconCapacityPct: 140,
			mode: "carnaval",
			hour: 18,
			lastOverchargeReportId: "r1",
		});
	});

	it("ignores hours outside the match day", () => {
		const state = reduceCityEvent(INITIAL_CITY_STATE, {
			type: "tiempo",
			hour: 30,
		});
		expect(state.hour).toBe(INITIAL_CITY_STATE.hour);
	});

	it("resets everything", () => {
		const busy = reduceCityEvent(INITIAL_CITY_STATE, {
			type: "malecon_saturado",
			capacityPct: 140,
		});
		expect(reduceCityEvent(busy, { type: "reiniciar" })).toEqual(
			INITIAL_CITY_STATE,
		);
	});
});

describe("crowdByZoneFrom", () => {
	it("maps Malecón occupancy to a 0 to 1 crowd level, capped at 1", () => {
		expect(
			crowdByZoneFrom({ ...INITIAL_CITY_STATE, maleconCapacityPct: 60 }),
		).toEqual({
			gran_malecon: 0.6,
		});
		expect(
			crowdByZoneFrom({ ...INITIAL_CITY_STATE, maleconCapacityPct: 140 }),
		).toEqual({
			gran_malecon: 1,
		});
	});

	it("follows a host assignment from pending to arrived and clears it when done", () => {
		let state = reduceCityEvent(INITIAL_CITY_STATE, {
			type: "anfitrion_asignado",
			assignmentId: "h1",
			need: "movilidad_reducida",
			meetingPointCode: "STOP-MURILLO-SUR",
		});
		expect(state.hostAssignment?.status).toBe("pendiente");

		state = reduceCityEvent(state, {
			type: "anfitrion_estado",
			assignmentId: "h1",
			status: "en_camino",
			etaMin: 6,
		});
		expect(state.hostAssignment).toMatchObject({ status: "en_camino", etaMin: 6 });

		state = reduceCityEvent(state, {
			type: "anfitrion_estado",
			assignmentId: "h1",
			status: "llego",
		});
		expect(state.hostAssignment?.status).toBe("llego");

		state = reduceCityEvent(state, {
			type: "anfitrion_estado",
			assignmentId: "h1",
			status: "terminada",
		});
		expect(state.hostAssignment).toBeNull();
	});

	it("ignores updates for an unknown assignment and resets on reiniciar", () => {
		const unknown = reduceCityEvent(INITIAL_CITY_STATE, {
			type: "anfitrion_estado",
			assignmentId: "x",
			status: "llego",
		});
		expect(unknown).toBe(INITIAL_CITY_STATE);

		const assigned = reduceCityEvent(INITIAL_CITY_STATE, {
			type: "anfitrion_asignado",
			assignmentId: "h1",
			need: "movilidad_reducida",
			meetingPointCode: "STOP-MURILLO-SUR",
		});
		expect(reduceCityEvent(assigned, { type: "reiniciar" }).hostAssignment).toBeNull();
	});
});
