import { describe, expect, it } from "vitest";
import type { FloodZone } from "../../../lib/city-dashboard-types";
import {
	arroyoAlertTitle,
	joinNames,
	summarizeArroyos,
	toArroyoRows,
} from "./flood-response-utils";

function zone(overrides: Partial<FloodZone>): FloodZone {
	return {
		id: "z",
		code: "ARR",
		name: "Arroyo",
		zone: "troncal_murillo",
		risk_level: "high",
		alert_active: false,
		advisory_es: null,
		advisory_en: null,
		is_simulated: true,
		updated_at: "2034-06-20T22:00:00Z",
		...overrides,
	};
}

const NOW = 1_000_000;

describe("toArroyoRows", () => {
	it("sorts active, then countdown, then safe", () => {
		const rows = toArroyoRows(
			[
				zone({ id: "safe", code: "SAFE", name: "Calle 48" }),
				zone({
					id: "soon",
					code: "SOON",
					name: "La Felicidad",
					zone: "centro",
				}),
				zone({ id: "on", code: "ON", name: "Carrera 46", alert_active: true }),
			],
			{ SOON: NOW + 6 * 60_000 },
			NOW,
		);
		expect(rows.map((row) => row.id)).toEqual(["on", "soon", "safe"]);
		expect(rows[1]).toMatchObject({
			zoneLabel: "Centro Histórico",
			riskLabel: "riesgo alto",
			status: { kind: "countdown", minutesLeft: 6 },
		});
	});
});

describe("arroyoAlertTitle", () => {
	it("says how many arroyos activate and when", () => {
		const rows = toArroyoRows(
			[zone({ id: "a", code: "A" }), zone({ id: "b", code: "B" })],
			{ A: NOW + 6 * 60_000, B: NOW + 8 * 60_000 },
			NOW,
		);
		expect(arroyoAlertTitle(summarizeArroyos(rows))).toBe(
			"2 arroyos se activan en 6 min",
		);
	});

	it("says when they are already active", () => {
		const rows = toArroyoRows([zone({ alert_active: true })], {}, NOW);
		expect(arroyoAlertTitle(summarizeArroyos(rows))).toBe("1 arroyo activo");
	});

	it("mixes active and pending", () => {
		const rows = toArroyoRows(
			[
				zone({ id: "a", code: "A", alert_active: true }),
				zone({ id: "b", code: "B" }),
			],
			{ B: NOW + 60_000 },
			NOW,
		);
		expect(arroyoAlertTitle(summarizeArroyos(rows))).toBe(
			"1 arroyo activo y 1 por activarse",
		);
	});
});

describe("joinNames", () => {
	it("joins names in Spanish", () => {
		expect(joinNames(["A"])).toBe("A");
		expect(joinNames(["A", "B"])).toBe("A y B");
		expect(joinNames(["A", "B", "C"])).toBe("A, B y C");
	});
});
