// Loads route segments on the server: Supabase first, local seed as fallback.

import { ROUTE_SEGMENTS_SEED } from "./route-segments-seed";
import type { RouteSegment, TransportMode } from "./routing-types";

interface SegmentRow {
	code: string;
	transport_mode: TransportMode;
	distance_km: number;
	estimated_minutes: number;
	reference_fare_cop: number;
	is_green_route: boolean;
	is_accessible: boolean;
	origin: { code: string } | null;
	destination: { code: string } | null;
	flood: { code: string } | null;
}

const SEGMENT_SELECT =
	"code, transport_mode, distance_km, estimated_minutes, reference_fare_cop, is_green_route, is_accessible, origin:stops!route_segments_origin_stop_id_fkey(code), destination:stops!route_segments_destination_stop_id_fkey(code), flood:flood_zones(code)";

async function loadFromSupabase(): Promise<RouteSegment[]> {
	// Imported lazily: the client module throws when the Supabase env vars are missing.
	const { supabase } = await import("../supabase");
	const { data, error } = await supabase
		.from("route_segments")
		.select(SEGMENT_SELECT)
		.overrideTypes<SegmentRow[], { merge: false }>();
	if (error) throw new Error(error.message);
	if (!data?.length) throw new Error("Supabase has no route segments yet");
	return data.flatMap((row) =>
		row.origin && row.destination
			? [
					{
						code: row.code,
						originStopCode: row.origin.code,
						destinationStopCode: row.destination.code,
						mode: row.transport_mode,
						distanceKm: Number(row.distance_km),
						minutes: row.estimated_minutes,
						fareCop: row.reference_fare_cop,
						isGreen: row.is_green_route,
						isAccessible: row.is_accessible,
						floodZoneCode: row.flood?.code ?? null,
					},
				]
			: [],
	);
}

export async function loadRouteSegments(): Promise<RouteSegment[]> {
	try {
		return await loadFromSupabase();
	} catch (error) {
		const reason = error instanceof Error ? error.message : String(error);
		console.warn(`[routing] Using local seed segments: ${reason}`);
		return ROUTE_SEGMENTS_SEED;
	}
}
