import { describe, expect, it } from "vitest";
import { CORRIDOR_SEED } from "../corridor/corridor-seed";
import type { CorridorData } from "../corridor/corridor-types";
import { planTrip } from "./trip-planner";

function withActiveFlood(code: string): CorridorData {
	return {
		...CORRIDOR_SEED,
		floodZones: CORRIDOR_SEED.floodZones.map((zone) =>
			zone.code === code ? { ...zone, alert_active: true } : zone,
		),
	};
}

describe("planTrip", () => {
	it("recommends the green Transmetro to the Estadio, with the verified taxi as alternative", () => {
		const plan = planTrip(CORRIDOR_SEED, "estadio");
		expect(plan.green?.code).toBe("SEG-MAL-EST-TM-GREEN");
		expect(plan.green?.reference_fare_cop).toBe(3500);
		expect(plan.confidence).toBe(1);
		expect(plan.taxi).toMatchObject({
			code: "SEG-MAL-EST-TAXI",
			fare_min_cop: 20000,
			fare_max_cop: 28000,
		});
		expect(plan.blockedByFlood).toEqual([]);
	});

	it("drops the taxi when its arroyo has an active alert", () => {
		const plan = planTrip(withActiveFlood("ARR-MURILLO-46"), "estadio");
		expect(plan.green?.code).toBe("SEG-MAL-EST-TM-GREEN");
		expect(plan.taxi).toBeNull();
		expect(plan.blockedByFlood).toEqual(["SEG-MAL-EST-TAXI"]);
	});

	it("walks to Barrio Abajo for free", () => {
		const plan = planTrip(CORRIDOR_SEED, "barrio_abajo");
		expect(plan.green).toMatchObject({
			transport_mode: "walk",
			reference_fare_cop: 0,
		});
		expect(plan.taxi).toBeNull();
	});

	it("has no green leg to the Centro, only the verified taxi", () => {
		const plan = planTrip(CORRIDOR_SEED, "centro");
		expect(plan.green).toBeNull();
		expect(plan.confidence).toBe(0);
		expect(plan.taxi?.code).toBe("SEG-MAL-CEN-TAXI");
	});
});
