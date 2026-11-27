import { describe, expect, it } from "vitest";
import { CORRIDOR_SEED } from "../corridor/corridor-seed";
import {
	AMB_BBOX,
	AMB_RING,
	ambAnchor,
	bboxOf,
	isInsideAmb,
	MUNICIPALITIES,
	municipalityAt,
	nearestEdgePoint,
	padBbox,
	pointInRing,
	ringCentroid,
	ringFromFlat,
} from "./amb-boundary";

const SQUARE = ringFromFlat([0, 0, 0, 2, 2, 2, 2, 0]);

describe("ring helpers", () => {
	it("reads flat lists as [lat, lng] pairs", () => {
		expect(ringFromFlat([1, 2, 3, 4])).toEqual([
			[1, 2],
			[3, 4],
		]);
	});

	it("tells inside from outside", () => {
		expect(pointInRing(SQUARE, 1, 1)).toBe(true);
		expect(pointInRing(SQUARE, 3, 1)).toBe(false);
	});

	it("finds the box, pads it and the centroid", () => {
		expect(bboxOf(SQUARE)).toEqual({ south: 0, west: 0, north: 2, east: 2 });
		expect(padBbox(bboxOf(SQUARE), 0.5)).toEqual({
			south: -1,
			west: -1,
			north: 3,
			east: 3,
		});
		expect(ringCentroid(SQUARE)).toEqual([1, 1]);
	});
});

describe("Barranquilla Metropolitan Area", () => {
	it("has the five municipalities, each one 50 to 220 points", () => {
		expect(MUNICIPALITIES.map((item) => item.name)).toEqual([
			"Barranquilla",
			"Soledad",
			"Malambo",
			"Puerto Colombia",
			"Galapa",
		]);
		for (const item of MUNICIPALITIES) {
			expect(item.ring.length).toBeGreaterThanOrEqual(50);
			expect(item.ring.length).toBeLessThanOrEqual(220);
		}
		expect(AMB_RING.length).toBeLessThanOrEqual(320);
	});

	it("spans from Malambo to Bocas de Ceniza and from Puerto Colombia to the river", () => {
		expect(AMB_BBOX.south).toBeCloseTo(10.81, 2);
		expect(AMB_BBOX.north).toBeCloseTo(11.11, 2);
		expect(AMB_BBOX.west).toBeCloseTo(-74.98, 2);
		expect(AMB_BBOX.east).toBeCloseTo(-74.73, 2);
	});

	it("places each label inside its own municipality", () => {
		for (const item of MUNICIPALITIES) {
			expect(municipalityAt(...item.labelAt)?.key).toBe(item.key);
		}
	});

	it("knows which municipality a point is in", () => {
		expect(municipalityAt(10.9269, -74.8006)?.key).toBe("barranquilla");
		expect(municipalityAt(10.9184, -74.7646)?.key).toBe("soledad");
		expect(municipalityAt(10.8594, -74.7739)?.key).toBe("malambo");
		expect(municipalityAt(10.8975, -74.8869)?.key).toBe("galapa");
		expect(municipalityAt(10.9878, -74.9547)?.key).toBe("puertoColombia");
	});

	it("leaves out the Magdalena, the sea and neighbouring towns", () => {
		// Vía Parque Isla de Salamanca (Sitionuevo, Magdalena).
		expect(isInsideAmb(11.0215, -74.66)).toBe(false);
		// Sitionuevo, across the river.
		expect(isInsideAmb(10.776, -74.72)).toBe(false);
		// Caribbean Sea off Puerto Colombia.
		expect(isInsideAmb(11.05, -74.9)).toBe(false);
		// Pital de Megua (Baranoa), south-west of Galapa.
		expect(isInsideAmb(10.79, -74.98)).toBe(false);
		expect(isInsideAmb(Number.NaN, -74.8)).toBe(false);
	});

	it("contains every corridor stop, arroyo and business of the seed", () => {
		const points = [
			...CORRIDOR_SEED.stops,
			...CORRIDOR_SEED.floodZones,
			...CORRIDOR_SEED.businesses,
		];
		for (const point of points) {
			expect(isInsideAmb(point.latitude, point.longitude)).toBe(true);
		}
	});
});

describe("ambAnchor", () => {
	it("keeps a point that is inside", () => {
		expect(ambAnchor(10.9835, -74.779)).toEqual([10.9835, -74.779]);
	});

	it("moves a point on the water next to the shore onto the shore", () => {
		// The Muelle de Puerto Colombia: its centre is on the sea.
		const pier = ambAnchor(11.0003, -74.955);
		expect(pier).not.toBeNull();
		if (!pier) return;
		expect(isInsideAmb(...pier)).toBe(true);
		expect(nearestEdgePoint(...pier).meters).toBeLessThan(60);
	});

	it("drops a point far from the area", () => {
		expect(ambAnchor(11.0215, -74.66)).toBeNull();
		expect(ambAnchor(11.0003, -74.955, 10)).toBeNull();
	});
});
