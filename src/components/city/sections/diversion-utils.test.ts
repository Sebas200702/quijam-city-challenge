import { describe, expect, it } from "vitest";
import type {
	CorridorZone,
	FloodZone,
	ZoneVisitorCount,
} from "../../../lib/city-dashboard-types";
import { CORRIDOR_SEED } from "../../../lib/corridor/corridor-seed";
import {
	buildDiversionProposal,
	type DiversionInput,
	proposalZone,
	toActiveDiversion,
} from "./diversion-utils";
import { toAffectedRoutes } from "./flood-response-utils";

function count(
	zone: CorridorZone,
	active: number,
	threshold: number,
): ZoneVisitorCount {
	return {
		zone,
		zone_label: zone,
		active_visitors: active,
		capacity_threshold: threshold,
		city_mode: "world_cup",
		saturation_level: "normal",
		is_simulated: true,
		updated_at: "2034-06-20T22:00:00Z",
	};
}

const FLOODS: FloodZone[] = CORRIDOR_SEED.floodZones.map((f) => ({
	id: f.code,
	code: f.code,
	name: f.name,
	zone: f.zone,
	risk_level: f.risk_level,
	alert_active: false,
	advisory_es: null,
	advisory_en: null,
	is_simulated: true,
	updated_at: "2034-06-20T22:00:00Z",
}));

function input(overrides: Partial<DiversionInput> = {}): DiversionInput {
	return {
		zones: [
			count("gran_malecon", 5400, 5000),
			count("barrio_abajo", 620, 1800),
			count("centro", 2600, 3000),
		],
		floodZones: FLOODS,
		blockedFloodCodes: [],
		hour: 17,
		segments: CORRIDOR_SEED.segments,
		businesses: CORRIDOR_SEED.businesses,
		...overrides,
	};
}

describe("buildDiversionProposal", () => {
	it("proposes Barrio Abajo with the docs/14 quota when the Malecón saturates", () => {
		const proposal = buildDiversionProposal(input());
		expect(proposal).not.toBeNull();
		expect(proposal?.toLabel).toBe("Barrio Abajo");
		// 75 % of 1.800 is 1.350; 1.350 − 620 = 730 (docs/14, rule 2).
		expect(proposal?.quota).toBe(730);
		expect(proposal?.fromPctNow).toBe(108);
		expect(proposal?.walkMinutes).toBe(20);
		expect(proposal?.rules.every((rule) => rule.passed)).toBe(true);
		expect(proposal && proposalZone(proposal)).toBe("barrio_abajo");
	});

	it("proposes nothing while the Malecón is under its threshold", () => {
		const zones = [
			count("gran_malecon", 3000, 5000),
			count("barrio_abajo", 620, 1800),
		];
		expect(buildDiversionProposal(input({ zones }))).toBeNull();
	});

	it("never sends people toward an arroyo with an alert", () => {
		const proposal = buildDiversionProposal(
			input({ blockedFloodCodes: ["ARR-BARRIO-ABAJO", "ARR-VIA-40"] }),
		);
		expect(proposal).toBeNull();
	});

	it("respects the committee's hours and pause", () => {
		expect(buildDiversionProposal(input({ hour: 22 }))?.toLabel).not.toBe(
			"Barrio Abajo",
		);
		expect(
			buildDiversionProposal(input({ pausedZones: ["barrio_abajo"] }))?.toLabel,
		).not.toBe("Barrio Abajo");
	});

	it("tracks arrivals from live counts, capped at the quota", () => {
		const proposal = buildDiversionProposal(input());
		if (!proposal) throw new Error("expected a proposal");
		const active = toActiveDiversion(
			{
				proposal,
				toZone: "barrio_abajo",
				toVisitorsAtStart: 620,
				since: "17:46",
			},
			[count("gran_malecon", 4600, 5000), count("barrio_abajo", 830, 1800)],
			false,
		);
		expect(active.arrived).toBe(210);
		expect(active.fromPctNow).toBe(92);
		expect(active.businessVisits).toBeUndefined();
	});
});

describe("toAffectedRoutes", () => {
	it("lists the legs that cross an alerted arroyo", () => {
		const routes = toAffectedRoutes(
			CORRIDOR_SEED.segments,
			CORRIDOR_SEED.stops,
			["ARR-VIA-40"],
		);
		expect(routes.map((route) => route.id)).toEqual(["SEG-MAL-CEN-TAXI"]);
		expect(routes[0].state).toBe("blocked");
		expect(routes[0].icon).toBe("taxi");
	});
});
