import { describe, expect, it } from "vitest";
import { CORRIDOR_SEED } from "../corridor/corridor-seed";
import {
	buildSelectableFareRoutes,
	evaluateOvercharge,
	formatRouteLabel,
	mapCorridorModeToReportMode,
	shortenStopName,
} from "./overcharge-routes";

describe("overcharge-routes", () => {
	it("shortens parenthetical stop suffixes and formats route labels", () => {
		expect(shortenStopName("Estadio Metropolitano (Acceso Norte)")).toBe(
			"Estadio Metropolitano",
		);
		expect(
			formatRouteLabel(
				"Gran Malecon (Sector Caiman del Rio)",
				"Estadio Metropolitano (Acceso Norte)",
			),
		).toBe("Gran Malecon → Estadio Metropolitano");
	});

	it("maps corridor transport modes to visitor report vehicle modes", () => {
		expect(mapCorridorModeToReportMode("taxi_verified")).toBe("taxi");
		expect(mapCorridorModeToReportMode("transmetro")).toBe("bus");
		expect(mapCorridorModeToReportMode("bus")).toBe("bus");
		expect(mapCorridorModeToReportMode("walk")).toBe("other");
	});

	it("builds selectable paid fare routes sorted with taxis first", () => {
		const routes = buildSelectableFareRoutes(CORRIDOR_SEED);

		expect(routes.length).toBeGreaterThan(0);
		expect(routes.every((route) => route.referenceFareCop > 0)).toBe(true);
		expect(routes[0]?.segmentCode).toBe("SEG-MAL-EST-TAXI");
		expect(routes[0]?.defaultVehicle).toBe("taxi");
		expect(routes[0]?.referenceFareCop).toBe(24000);
		expect(routes[0]?.fareMinCop).toBe(20000);
		expect(routes[0]?.fareMaxCop).toBe(28000);
		expect(routes[1]?.segmentCode).toBe("SEG-MAL-CEN-TAXI");
	});

	it("evaluates overcharge delta, percent, and flag", () => {
		expect(evaluateOvercharge(55000, 24000)).toEqual({
			deltaCop: 31000,
			percent: 129,
			isOvercharge: true,
		});
		expect(evaluateOvercharge(24000, 24000)).toEqual({
			deltaCop: 0,
			percent: 0,
			isOvercharge: false,
		});
		expect(evaluateOvercharge(18000, 24000)).toEqual({
			deltaCop: -6000,
			percent: -25,
			isOvercharge: false,
		});
		expect(evaluateOvercharge(0, 24000)).toBeNull();
		expect(evaluateOvercharge(-1000, 24000)).toBeNull();
	});
});
