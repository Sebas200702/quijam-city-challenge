// Types for the pilot corridor map. Columns mirror supabase/migrations/20261126000001_corridor_schema.sql.

export type CorridorZone =
	| "estadio"
	| "troncal_murillo"
	| "centro"
	| "barrio_abajo"
	| "gran_malecon";

export type StopType = "transmetro" | "bus_stop" | "qr_point" | "host_hub";

export type RiskLevel = "low" | "moderate" | "high" | "critical";

export type BusinessCategory =
	| "food_popular"
	| "crafts"
	| "culture"
	| "eco_event"
	| "coffee";

export interface CorridorStop {
	code: string;
	name: string;
	zone: CorridorZone;
	stop_type: StopType;
	latitude: number;
	longitude: number;
	is_accessible: boolean;
	has_shade: boolean;
	has_hydration: boolean;
	has_recycling: boolean;
	has_host_duo: boolean;
	is_simulated: boolean;
}

export interface FloodZone {
	code: string;
	name: string;
	zone: CorridorZone;
	latitude: number;
	longitude: number;
	radius_meters: number;
	risk_level: RiskLevel;
	alert_active: boolean;
	advisory_es: string | null;
	is_simulated: boolean;
}

export interface CorridorBusiness {
	code: string;
	name: string;
	category: BusinessCategory;
	zone: CorridorZone;
	latitude: number;
	longitude: number;
	is_verified: boolean;
	is_open: boolean;
	commission_free: boolean;
	description_es: string;
	is_simulated: boolean;
}

export interface CorridorData {
	stops: CorridorStop[];
	floodZones: FloodZone[];
	businesses: CorridorBusiness[];
}

/** Where the map data came from: the Supabase project or the local seed copy. */
export type CorridorDataSource = "supabase" | "seed";

/** Status colour from the design system: colour is state, never decoration. */
export type StatusTone = "green" | "gold" | "red" | "neutral";

export interface MapStatus {
	tone: StatusTone;
	/** Word that carries the state, so it never depends on colour alone. */
	label: string;
}
