// Loads the corridor map data on the server: Supabase first, local seed as fallback.

import { CORRIDOR_SEED } from "./corridor-seed";
import type {
	CorridorBusiness,
	CorridorData,
	CorridorDataSource,
	CorridorStop,
	FloodZone,
	RouteSegment,
} from "./corridor-types";

const STOP_COLUMNS =
	"code, name, zone, stop_type, latitude, longitude, is_accessible, has_shade, has_hydration, has_recycling, has_host_duo, is_simulated";
const FLOOD_ZONE_COLUMNS =
	"code, name, zone, latitude, longitude, radius_meters, risk_level, alert_active, advisory_es, is_simulated";
// Two foreign keys point at stops, so each embed names its column.
const SEGMENT_COLUMNS =
	"code, transport_mode, distance_km, estimated_minutes, reference_fare_cop, fare_min_cop, fare_max_cop, is_green_route, is_accessible, is_simulated, origin:stops!origin_stop_id(code), destination:stops!destination_stop_id(code), flood:flood_zones(code)";
const BUSINESS_COLUMNS =
	"code, name, category, zone, latitude, longitude, is_verified, is_open, commission_free, description_es, is_simulated";

export interface CorridorDataResult {
	data: CorridorData;
	source: CorridorDataSource;
}

async function loadFromSupabase(): Promise<CorridorData> {
	// Imported lazily: the client module throws when the Supabase env vars are missing.
	const { supabase } = await import("../supabase");
	const [stops, floodZones, businesses, segments] = await Promise.all([
		supabase
			.from("stops")
			.select(STOP_COLUMNS)
			.overrideTypes<CorridorStop[], { merge: false }>(),
		supabase
			.from("flood_zones")
			.select(FLOOD_ZONE_COLUMNS)
			.overrideTypes<FloodZone[], { merge: false }>(),
		supabase
			.from("businesses")
			.select(BUSINESS_COLUMNS)
			.overrideTypes<CorridorBusiness[], { merge: false }>(),
		supabase
			.from("route_segments")
			.select(SEGMENT_COLUMNS)
			.overrideTypes<SegmentRow[], { merge: false }>(),
	]);
	const error =
		stops.error ?? floodZones.error ?? businesses.error ?? segments.error;
	if (error) throw new Error(error.message);
	if (!stops.data?.length) throw new Error("Supabase has no stops yet");
	return {
		stops: stops.data,
		floodZones: floodZones.data ?? [],
		businesses: businesses.data ?? [],
		segments: (segments.data ?? []).flatMap(toSegment),
	};
}

/** A route_segments row with its stops and flood zone embedded by foreign key. */
interface SegmentRow
	extends Omit<
		RouteSegment,
		"origin_stop_code" | "destination_stop_code" | "flood_zone_code"
	> {
	origin: { code: string } | null;
	destination: { code: string } | null;
	flood: { code: string } | null;
}

function toSegment(row: SegmentRow): RouteSegment[] {
	if (!row.origin || !row.destination) return [];
	const { origin, destination, flood, ...rest } = row;
	return [
		{
			...rest,
			// Postgres numeric can arrive as a string.
			distance_km: Number(rest.distance_km),
			origin_stop_code: origin.code,
			destination_stop_code: destination.code,
			flood_zone_code: flood?.code ?? null,
		},
	];
}

export async function loadCorridorData(): Promise<CorridorDataResult> {
	try {
		return { data: await loadFromSupabase(), source: "supabase" };
	} catch (error) {
		const reason = error instanceof Error ? error.message : String(error);
		console.warn(`[corridor] Using local seed data: ${reason}`);
		return { data: CORRIDOR_SEED, source: "seed" };
	}
}
