import { describe, expect, it } from "vitest";
import { CORRIDOR_SEED } from "./corridor-seed";
import { coolPoints, ZONE_HEAT } from "./heat-reference";

describe("heat reference", () => {
	it("puts the stadium (far south) hotter than the Gran Malecón (north)", () => {
		expect(ZONE_HEAT.estadio).toBe("hotter");
		expect(ZONE_HEAT.gran_malecon).toBe("cooler");
	});

	it("lists every stop with shade or water, and what it offers", () => {
		const points = coolPoints(CORRIDOR_SEED.stops);
		expect(points).toHaveLength(CORRIDOR_SEED.stops.length);
		expect(points.find((p) => p.code === "STOP-MALECON-NORTE")).toMatchObject({
			shade: false,
			water: true,
		});
	});

	it("leaves out stops without shade or water", () => {
		const [stop] = CORRIDOR_SEED.stops;
		const bare = { ...stop, has_shade: false, has_hydration: false };
		expect(coolPoints([bare])).toEqual([]);
	});
});
