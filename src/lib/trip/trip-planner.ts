// Plans a visitor's trip from the Gran Malecon with the Decider: the green
// route first, and a verified taxi with its fair fare range as the alternative.

import type { CorridorData, RouteSegment } from "../corridor/corridor-types";
import {
	applyHardRules,
	type DecisionState,
	decide,
	type RouteOption,
} from "../decider";

export type DestinationKey = "estadio" | "barrio_abajo" | "centro";

export const DESTINATIONS: Record<
	DestinationKey,
	{ stopCode: string; name: string }
> = {
	estadio: { stopCode: "STOP-ESTADIO", name: "Estadio Metropolitano" },
	barrio_abajo: { stopCode: "STOP-BARRIO-ABAJO", name: "Barrio Abajo" },
	centro: { stopCode: "STOP-CENTRO", name: "Centro" },
};

/** Case 1 starts at the Gran Malecon (simulated visitor location). */
export const VISITOR_ORIGIN = {
	stopCode: "STOP-MALECON-SUR",
	name: "Gran Malecón",
};

export interface TripPlan {
	destination: DestinationKey;
	/** Recommended green leg (transit, walk or bike), or null if none is safe. */
	green: RouteSegment | null;
	/** Decider confidence for the green leg, 0 to 1. */
	confidence: number;
	/** Verified taxi leg with its fair fare range, if one is safe. */
	taxi: RouteSegment | null;
	/** Legs dropped because they cross an active flood. */
	blockedByFlood: string[];
}

function toOption(segment: RouteSegment): RouteOption {
	return {
		id: segment.code,
		label: segment.code,
		durationMinutes: segment.estimated_minutes,
		fareCop: segment.reference_fare_cop,
		// No crowd data per leg yet: duration and fare decide.
		crowdLevel: 0,
		accessible: segment.is_accessible,
		floodZoneIds: segment.flood_zone_code ? [segment.flood_zone_code] : [],
	};
}

export function decisionState(
	data: CorridorData,
	accessibleMode = false,
): DecisionState {
	return {
		activeFloodZoneIds: data.floodZones
			.filter((zone) => zone.alert_active)
			.map((zone) => zone.code),
		accessibleMode,
	};
}

export function planTrip(
	data: CorridorData,
	destination: DestinationKey,
	accessibleMode = false,
): TripPlan {
	const state = decisionState(data, accessibleMode);
	const legs = data.segments.filter(
		(segment) =>
			segment.origin_stop_code === VISITOR_ORIGIN.stopCode &&
			segment.destination_stop_code === DESTINATIONS[destination].stopCode,
	);
	const byCode = new Map(legs.map((leg) => [leg.code, leg]));

	const greenLegs = legs.filter((leg) => leg.is_green_route);
	const decision = decide(state, greenLegs.map(toOption));

	const taxiLegs = legs.filter((leg) => leg.transport_mode === "taxi_verified");
	const taxiRules = applyHardRules(state, taxiLegs.map(toOption));
	const taxiCode = taxiRules.allowed[0]?.id;

	return {
		destination,
		green: decision.option ? (byCode.get(decision.option.id) ?? null) : null,
		confidence: decision.confidence,
		taxi: taxiCode ? (byCode.get(taxiCode) ?? null) : null,
		blockedByFlood: [...decision.discarded, ...taxiRules.discarded]
			.filter((item) => item.reason === "active-flood")
			.map((item) => item.optionId),
	};
}
