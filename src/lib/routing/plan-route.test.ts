import { describe, expect, it } from "vitest";
import { CORRIDOR_SEED } from "../corridor/corridor-seed";
import type { AsyncChooser } from "../decider/decider-types";
import { fromCorridorSegment } from "./from-corridor-segment";
import { parsePlanRequest, planRoute } from "./plan-route";

const ROUTE_SEGMENTS_SEED = CORRIDOR_SEED.segments.map(fromCorridorSegment);

const deps = {
	segments: ROUTE_SEGMENTS_SEED,
	stops: CORRIDOR_SEED.stops,
	floodZones: CORRIDOR_SEED.floodZones,
};

const caseOne = {
	origin: "STOP-MALECON-SUR",
	destination: "STOP-ESTADIO",
	accessibleMode: false,
	activeFloodZoneIds: [],
	crowdByZone: {},
};

describe("planRoute", () => {
	it("returns the chosen route, a one-line explanation and the alternatives", async () => {
		const plan = await planRoute(caseOne, deps);

		expect(plan.route).not.toBeNull();
		expect(plan.chosenBy).toBe("weighted");
		expect(plan.explanation).toMatch(/^Te recomendamos /);
		expect(plan.alternatives.length).toBe(3);
		expect(plan.route?.stopCodes[0]).toBe("STOP-MALECON-SUR");
	});

	it("never recommends a route through an active flood (case 2)", async () => {
		const plan = await planRoute(
			{
				...caseOne,
				accessibleMode: true,
				activeFloodZoneIds: ["ARR-MURILLO-46"],
			},
			deps,
		);

		expect(plan.route?.id).toBe("SEG-MAL-EST-TM-GREEN");
		expect(plan.discarded.map((item) => item.reason)).toContain("active-flood");
		expect(plan.explanation).toContain("Solo mostramos rutas accesibles.");
	});

	it("treats flood zones flagged active in the data as active", async () => {
		const floodZones = CORRIDOR_SEED.floodZones.map((zone) => ({
			...zone,
			alert_active: zone.code === "ARR-MURILLO-46",
		}));

		const plan = await planRoute(caseOne, { ...deps, floodZones });

		expect(plan.discarded).toContainEqual(
			expect.objectContaining({
				id: "SEG-MAL-EST-TAXI",
				reason: "active-flood",
			}),
		);
	});

	it("uses the remote chooser when given one", async () => {
		const remote: AsyncChooser = async () => ({
			optionId: "SEG-MAL-EST-TAXI",
			confidence: 0.8,
		});

		const plan = await planRoute(caseOne, { ...deps, remote });

		expect(plan.route?.id).toBe("SEG-MAL-EST-TAXI");
		expect(plan.chosenBy).toBe("openjev");
	});
});

describe("parsePlanRequest", () => {
	const known = new Set(CORRIDOR_SEED.stops.map((stop) => stop.code));

	it("accepts a valid body and fills defaults", () => {
		expect(
			parsePlanRequest(
				{ origin: "STOP-MALECON-SUR", destination: "STOP-ESTADIO" },
				known,
			),
		).toEqual({ ok: true, value: caseOne });
	});

	it("rejects unknown stops", () => {
		expect(
			parsePlanRequest(
				{ origin: "STOP-LUNA", destination: "STOP-ESTADIO" },
				known,
			),
		).toEqual({ ok: false, error: "Unknown origin stop: STOP-LUNA" });
	});

	it("rejects crowd values outside 0 to 1", () => {
		const result = parsePlanRequest(
			{
				origin: "STOP-MALECON-SUR",
				destination: "STOP-ESTADIO",
				crowdByZone: { centro: 4 },
			},
			known,
		);
		expect(result.ok).toBe(false);
	});
});
