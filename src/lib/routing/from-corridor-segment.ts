import type { RouteSegment as CorridorSegment } from "../corridor/corridor-types";
import type { RouteSegment } from "./routing-types";

/** Maps a corridor data segment (route_segments row) to the routing shape. */
export function fromCorridorSegment(segment: CorridorSegment): RouteSegment {
	return {
		code: segment.code,
		originStopCode: segment.origin_stop_code,
		destinationStopCode: segment.destination_stop_code,
		mode: segment.transport_mode,
		distanceKm: segment.distance_km,
		minutes: segment.estimated_minutes,
		fareCop: segment.reference_fare_cop,
		isGreen: segment.is_green_route,
		isAccessible: segment.is_accessible,
		floodZoneCode: segment.flood_zone_code,
	};
}
