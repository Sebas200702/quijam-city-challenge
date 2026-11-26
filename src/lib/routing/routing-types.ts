import type { RouteOption } from "../decider/decider-types";

export type TransportMode =
	| "transmetro"
	| "bus"
	| "taxi_verified"
	| "walk"
	| "bike";

/** One leg between two stops, as stored in public.route_segments. */
export interface RouteSegment {
	code: string;
	originStopCode: string;
	destinationStopCode: string;
	mode: TransportMode;
	distanceKm: number;
	minutes: number;
	/** Reference fare in COP (fair fare). */
	fareCop: number;
	isGreen: boolean;
	isAccessible: boolean;
	/** Flood zone the leg crosses, if any. */
	floodZoneCode: string | null;
}

/** A full trip from origin to destination: a Decider option plus its legs. */
export interface Itinerary extends RouteOption {
	legs: RouteSegment[];
	stopCodes: string[];
	/** Every leg is public transport, walking or bike. */
	isGreen: boolean;
}

/** Crowding per corridor zone, from 0 (empty) to 1 (saturated). */
export type CrowdByZone = Partial<Record<string, number>>;
