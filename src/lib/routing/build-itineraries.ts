import type {
	CrowdByZone,
	Itinerary,
	RouteSegment,
	TransportMode,
} from "./routing-types";

const MODE_LABEL: Record<TransportMode, string> = {
	transmetro: "Transmetro",
	bus: "bus",
	taxi_verified: "taxi verificado",
	walk: "a pie",
	bike: "bici",
};

export interface BuildItinerariesInput {
	segments: RouteSegment[];
	/** Stop code -> corridor zone. */
	stopZones: Record<string, string>;
	origin: string;
	destination: string;
	crowdByZone: CrowdByZone;
	/** Longest trip, in legs. */
	maxLegs?: number;
}

function labelFor(legs: RouteSegment[]): string {
	const modes: TransportMode[] = [];
	for (const leg of legs) {
		if (modes[modes.length - 1] !== leg.mode) modes.push(leg.mode);
	}
	const text = modes.map((mode) => MODE_LABEL[mode]).join(" + ");
	return text.charAt(0).toUpperCase() + text.slice(1);
}

function toItinerary(
	legs: RouteSegment[],
	stopZones: Record<string, string>,
	crowdByZone: CrowdByZone,
): Itinerary {
	const stopCodes = [
		legs[0].originStopCode,
		...legs.map((leg) => leg.destinationStopCode),
	];
	const crowdLevel = Math.max(
		...stopCodes.map((code) => crowdByZone[stopZones[code] ?? ""] ?? 0),
	);
	return {
		id: legs.map((leg) => leg.code).join("+"),
		label: labelFor(legs),
		durationMinutes: legs.reduce((sum, leg) => sum + leg.minutes, 0),
		fareCop: legs.reduce((sum, leg) => sum + leg.fareCop, 0),
		crowdLevel,
		accessible: legs.every((leg) => leg.isAccessible),
		floodZoneIds: legs.flatMap((leg) =>
			leg.floodZoneCode ? [leg.floodZoneCode] : [],
		),
		legs,
		stopCodes,
		isGreen: legs.every((leg) => leg.isGreen),
	};
}

/** Every trip from origin to destination over the segment graph, without repeating stops. */
export function buildItineraries(input: BuildItinerariesInput): Itinerary[] {
	const maxLegs = input.maxLegs ?? 4;
	const trips: Itinerary[] = [];
	const walk = (stop: string, legs: RouteSegment[], visited: Set<string>) => {
		if (stop === input.destination && legs.length > 0) {
			trips.push(toItinerary(legs, input.stopZones, input.crowdByZone));
			return;
		}
		if (legs.length >= maxLegs) return;
		for (const segment of input.segments) {
			if (segment.originStopCode !== stop) continue;
			if (visited.has(segment.destinationStopCode)) continue;
			visited.add(segment.destinationStopCode);
			walk(segment.destinationStopCode, [...legs, segment], visited);
			visited.delete(segment.destinationStopCode);
		}
	};
	walk(input.origin, [], new Set([input.origin]));
	return trips;
}
