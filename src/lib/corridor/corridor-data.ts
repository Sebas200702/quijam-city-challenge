// Loads the corridor map data on the server: Supabase first, local seed as fallback.

import { CORRIDOR_SEED } from "./corridor-seed";
import type {
	CorridorBusiness,
	CorridorData,
	CorridorDataSource,
	CorridorStop,
	FloodZone,
} from "./corridor-types";

const STOP_COLUMNS =
	"code, name, zone, stop_type, latitude, longitude, is_accessible, has_shade, has_hydration, has_recycling, has_host_duo, is_simulated";
const FLOOD_ZONE_COLUMNS =
	"code, name, zone, latitude, longitude, radius_meters, risk_level, alert_active, advisory_es, is_simulated";
const BUSINESS_COLUMNS =
	"code, name, category, zone, latitude, longitude, is_verified, is_open, commission_free, description_es, is_simulated";

export interface CorridorDataResult {
	data: CorridorData;
	source: CorridorDataSource;
}

async function loadFromSupabase(): Promise<CorridorData> {
	// Imported lazily: the client module throws when the Supabase env vars are missing.
	const { supabase } = await import("../supabase");
	const [stops, floodZones, businesses] = await Promise.all([
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
	]);
	const error = stops.error ?? floodZones.error ?? businesses.error;
	if (error) throw new Error(error.message);
	if (!stops.data?.length) throw new Error("Supabase has no stops yet");
	return {
		stops: stops.data,
		floodZones: floodZones.data ?? [],
		businesses: businesses.data ?? [],
	};
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
