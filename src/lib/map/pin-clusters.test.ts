import { describe, expect, it } from "vitest";
import { clusterPins } from "./pin-clusters";

describe("clusterPins", () => {
	const item = (key: string, x: number, y: number, group = "stops") => ({
		key,
		x,
		y,
		group,
	});

	it("groups pins closer than the radius and counts each layer", () => {
		const clusters = clusterPins(
			[
				item("a", 0, 0),
				item("b", 10, 0, "places"),
				item("c", 0, 20),
				item("d", 200, 200),
			],
			44,
		);
		expect(clusters).toHaveLength(2);
		expect(clusters[0]).toMatchObject({
			keys: ["a", "b", "c"],
			groups: { stops: 2, places: 1 },
		});
		expect(clusters[0].x).toBeCloseTo(10 / 3);
		expect(clusters[1].keys).toEqual(["d"]);
	});

	it("never groups the kept (selected) pin", () => {
		const clusters = clusterPins(
			[item("a", 0, 0), item("b", 5, 5), item("c", 8, 0)],
			44,
			new Set(["b"]),
		);
		expect(clusters.map((cluster) => cluster.keys)).toEqual([
			["b"],
			["a", "c"],
		]);
	});
});
