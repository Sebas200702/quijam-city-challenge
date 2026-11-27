import { describe, expect, it } from "vitest";
import { CORRIDOR_SEED } from "../corridor/corridor-seed";
import { buildItineraries } from "./build-itineraries";
import { fromCorridorSegment } from "./from-corridor-segment";

const ROUTE_SEGMENTS_SEED = CORRIDOR_SEED.segments.map(fromCorridorSegment);

const stopZones = Object.fromEntries(
	CORRIDOR_SEED.stops.map((stop) => [stop.code, stop.zone]),
);

function malecónToStadium(crowdByZone = {}) {
	return buildItineraries({
		segments: ROUTE_SEGMENTS_SEED,
		stopZones,
		origin: "STOP-MALECON-SUR",
		destination: "STOP-ESTADIO",
		crowdByZone,
	});
}

describe("buildItineraries", () => {
	it("finds every trip from the Malecón to the stadium in the seed data", () => {
		const ids = malecónToStadium().map((itinerary) => itinerary.id);

		expect(ids.sort()).toEqual(
			[
				"SEG-MAL-BAR-WALK+SEG-BAR-CEN-WALK+SEG-CEN-MUR46-BUS+SEG-MUR46-EST-TM",
				"SEG-MAL-CEN-TAXI+SEG-CEN-MUR46-BUS+SEG-MUR46-EST-TM",
				"SEG-MAL-EST-TAXI",
				"SEG-MAL-EST-TM-GREEN",
			].sort(),
		);
	});

	it("adds up time and fare, and keeps every flood zone and stop", () => {
		const walkBus = malecónToStadium().find((itinerary) =>
			itinerary.id.startsWith("SEG-MAL-BAR-WALK"),
		);

		expect(walkBus).toMatchObject({
			label: "A pie + bus + Transmetro",
			durationMinutes: 63,
			fareCop: 7000,
			accessible: false,
			isGreen: true,
			floodZoneIds: ["ARR-BARRIO-ABAJO", "ARR-FELICIDAD"],
			stopCodes: [
				"STOP-MALECON-SUR",
				"STOP-BARRIO-ABAJO",
				"STOP-CENTRO",
				"STOP-MURILLO-46",
				"STOP-ESTADIO",
			],
		});
	});

	it("labels single-leg trips by their mode", () => {
		const labels = malecónToStadium().map((itinerary) => itinerary.label);

		expect(labels).toContain("Transmetro");
		expect(labels).toContain("Taxi verificado");
	});

	it("uses the most crowded zone along the trip as its crowding", () => {
		const trips = malecónToStadium({ gran_malecon: 0.2, centro: 0.9 });
		const viaCentro = trips.find((trip) => trip.id.startsWith("SEG-MAL-CEN"));
		const direct = trips.find((trip) => trip.id === "SEG-MAL-EST-TM-GREEN");

		expect(viaCentro?.crowdLevel).toBe(0.9);
		expect(direct?.crowdLevel).toBe(0.2);
	});

	it("returns no trips when the destination is unreachable", () => {
		const trips = buildItineraries({
			segments: ROUTE_SEGMENTS_SEED,
			stopZones,
			origin: "STOP-ESTADIO",
			destination: "STOP-MALECON-SUR",
			crowdByZone: {},
		});

		expect(trips).toEqual([]);
	});

	it("gives each trip the share of its stops with shade", () => {
		const trips = buildItineraries({
			segments: ROUTE_SEGMENTS_SEED,
			stopZones,
			origin: "STOP-MALECON-SUR",
			destination: "STOP-ESTADIO",
			crowdByZone: {},
			shadedStops: new Set(["STOP-MALECON-SUR", "STOP-CENTRO"]),
		});
		const direct = trips.find((trip) => trip.id === "SEG-MAL-EST-TM-GREEN");
		const viaCentro = trips.find((trip) => trip.id.startsWith("SEG-MAL-CEN"));

		expect(direct?.shadeShare).toBe(0.5);
		expect(viaCentro?.shadeShare).toBe(0.5);
		expect(malecónToStadium()[0].shadeShare).toBeUndefined();
	});
});
