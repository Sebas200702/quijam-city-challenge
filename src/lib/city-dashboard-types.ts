export type CorridorZone =
	| "estadio"
	| "troncal_murillo"
	| "centro"
	| "barrio_abajo"
	| "gran_malecon";

export type CityMode = "world_cup" | "carnival" | "daily";

export type SaturationLevel = "normal" | "high" | "saturated";

export type ReportStatus = "open" | "in_review" | "resolved" | "dismissed";

export type FloodRiskLevel = "low" | "moderate" | "high" | "critical";

export type UserRole = "visitor" | "vendor" | "city";

export interface ZoneVisitorCount {
	zone: CorridorZone;
	zone_label: string;
	active_visitors: number;
	capacity_threshold: number;
	city_mode: CityMode;
	saturation_level: SaturationLevel;
	is_simulated: boolean;
	updated_at: string;
}

export interface OverchargeReport {
	id: string;
	segment_id: string | null;
	zone: CorridorZone;
	transport_mode: "taxi" | "bus" | "informal" | "other";
	charged_fare_cop: number;
	reference_fare_cop: number;
	driver_qr_code: string | null;
	notes: string | null;
	status: ReportStatus;
	is_simulated: boolean;
	created_at: string;
	updated_at: string;
}

export interface FloodZone {
	id: string;
	code: string;
	name: string;
	zone: CorridorZone;
	risk_level: FloodRiskLevel;
	alert_active: boolean;
	advisory_es: string | null;
	advisory_en: string | null;
	is_simulated: boolean;
	updated_at: string;
}

export interface ReportStatusSummary {
	open: number;
	in_review: number;
	resolved: number;
	dismissed: number;
	total: number;
}

export interface CityDashboardSnapshot {
	zones: ZoneVisitorCount[];
	reports: OverchargeReport[];
	floodZones: FloodZone[];
	lastUpdatedAt: string;
}

export interface CitySessionInfo {
	userId: string;
	email: string;
	role: UserRole;
}
