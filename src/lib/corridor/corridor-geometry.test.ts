import { describe, expect, it } from "vitest";
import {
	boundsOf,
	buildCorridorPath,
	businessStatus,
	CORRIDOR_STOP_ORDER,
	corridorLine,
	decodePolyline,
	floodZoneStatus,
	stopServices,
} from "./corridor-geometry";
import { CORRIDOR_SEED } from "./corridor-seed";
import type { FloodZone } from "./corridor-types";

const baseZone = CORRIDOR_SEED.floodZones[0] as FloodZone;

describe("buildCorridorPath", () => {
	it("follows the corridor order from the Estadio to the Gran Malecon", () => {
		const shuffled = [...CORRIDOR_SEED.stops].reverse();
		const path = buildCorridorPath(shuffled);

		expect(path).toHaveLength(CORRIDOR_STOP_ORDER.length);
		expect(path[0]).toEqual([10.9269, -74.8006]);
		expect(path.at(-1)).toEqual([11.0115, -74.7865]);
	});

	it("skips stops that are missing from the data", () => {
		const withoutCentro = CORRIDOR_SEED.stops.filter(
			(stop) => stop.code !== "STOP-CENTRO",
		);
		expect(buildCorridorPath(withoutCentro)).toHaveLength(
			CORRIDOR_STOP_ORDER.length - 1,
		);
	});

	it("has every corridor stop in the local seed", () => {
		const codes = CORRIDOR_SEED.stops.map((stop) => stop.code);
		expect(codes).toEqual(expect.arrayContaining([...CORRIDOR_STOP_ORDER]));
	});
});

describe("decodePolyline", () => {
	it("decodes the reference example of the polyline algorithm", () => {
		expect(decodePolyline("_p~iF~ps|U_ulLnnqC_mqNvxq`@")).toEqual([
			[38.5, -120.2],
			[40.7, -120.95],
			[43.252, -126.453],
		]);
	});

	it("returns no points for a truncated string", () => {
		expect(decodePolyline("_p~iF")).toEqual([]);
	});
});

describe("corridorLine", () => {
	const distanceTo = ([lat, lng]: [number, number], code: string) => {
		const stop = CORRIDOR_SEED.stops.find((item) => item.code === code);
		if (!stop) throw new Error(`missing ${code}`);
		return Math.hypot(lat - stop.latitude, lng - stop.longitude);
	};

	it("follows the streets from the Estadio to the Gran Malecon", () => {
		const line = corridorLine(CORRIDOR_SEED.stops);
		const first = line[0];
		const last = line.at(-1);
		if (!first || !last) throw new Error("empty corridor line");

		// Many more points than stops: the line bends with the streets.
		expect(line.length).toBeGreaterThan(CORRIDOR_STOP_ORDER.length * 10);
		// Within ~0.002 degrees (about 200 m) of the first and last stops.
		expect(distanceTo(first, "STOP-ESTADIO")).toBeLessThan(0.002);
		expect(distanceTo(last, "STOP-MALECON-NORTE")).toBeLessThan(0.002);
	});
});

describe("boundsOf", () => {
	it("returns south-west and north-east corners", () => {
		expect(
			boundsOf([
				[10.9, -74.8],
				[11.0, -74.7],
			]),
		).toEqual([
			[10.9, -74.8],
			[11.0, -74.7],
		]);
	});

	it("returns null without points", () => {
		expect(boundsOf([])).toBeNull();
	});
});

describe("floodZoneStatus", () => {
	it("is red with an active alert, whatever the risk", () => {
		expect(
			floodZoneStatus({ ...baseZone, risk_level: "low", alert_active: true }),
		).toEqual({ tone: "red", label: "Alerta activa" });
	});

	it("is gold for high risk without an alert", () => {
		expect(
			floodZoneStatus({ ...baseZone, risk_level: "high", alert_active: false }),
		).toEqual({ tone: "gold", label: "Riesgo alto" });
	});

	it("is green for moderate risk without an alert", () => {
		expect(
			floodZoneStatus({
				...baseZone,
				risk_level: "moderate",
				alert_active: false,
			}),
		).toEqual({ tone: "green", label: "Riesgo moderado" });
	});
});

describe("businessStatus and stopServices", () => {
	it("labels open and closed businesses with a word", () => {
		const [open] = CORRIDOR_SEED.businesses;
		if (!open) throw new Error("seed has no businesses");
		expect(businessStatus(open).label).toBe("Abierto");
		expect(businessStatus({ ...open, is_open: false }).label).toBe("Cerrado");
	});

	it("lists only the services a stop offers", () => {
		const [stop] = CORRIDOR_SEED.stops;
		if (!stop) throw new Error("seed has no stops");
		expect(
			stopServices({
				...stop,
				is_accessible: true,
				has_shade: false,
				has_hydration: true,
				has_recycling: false,
				has_host_duo: false,
			}),
		).toEqual(["accessible", "hydration"]);
	});
});
