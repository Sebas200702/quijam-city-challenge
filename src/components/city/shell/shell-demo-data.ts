// Dev-only fixtures for /ciudad?demo[=offline|loading|empty|error]: lets you
// review the city dashboard shell without Supabase credentials. Never loaded
// in production builds (loaded with a dynamic import behind import.meta.env.DEV).
import type {
	CityDashboardSnapshot,
	CitySessionInfo,
	ZoneVisitorCount,
} from "../../../lib/city-dashboard-types";
import type { ShellDemoMode } from "./shell-demo-mode";

export const DEMO_SESSION: CitySessionInfo = {
	userId: "demo-city",
	email: "operador.demo@quillart.local",
	role: "city",
};

function zone(
	key: ZoneVisitorCount["zone"],
	label: string,
	visitors: number,
	capacity: number,
	updatedAt: string,
): ZoneVisitorCount {
	return {
		zone: key,
		zone_label: label,
		active_visitors: visitors,
		capacity_threshold: capacity,
		city_mode: "world_cup",
		saturation_level: visitors / capacity >= 0.85 ? "saturated" : "normal",
		is_simulated: true,
		updated_at: updatedAt,
	};
}

export function buildDemoSnapshot(
	mode: ShellDemoMode,
	nowMs: number,
): CityDashboardSnapshot {
	const updatedAt = new Date(
		nowMs - (mode === "offline" ? 8 * 60_000 : 30_000),
	).toISOString();
	if (mode === "empty") {
		return { zones: [], reports: [], floodZones: [], lastUpdatedAt: updatedAt };
	}
	return {
		lastUpdatedAt: updatedAt,
		zones: [
			zone("gran_malecon", "Gran Malecón", 2700, 3500, updatedAt),
			zone("barrio_abajo", "Barrio Abajo", 620, 1800, updatedAt),
			zone("centro", "Centro Histórico", 1400, 2500, updatedAt),
			zone("troncal_murillo", "Troncal Murillo", 1850, 3000, updatedAt),
			zone("estadio", "Estadio Metropolitano", 4200, 6000, updatedAt),
		],
		reports: [
			{
				id: "demo-r1",
				segment_id: null,
				zone: "gran_malecon",
				transport_mode: "taxi",
				charged_fare_cop: 35000,
				reference_fare_cop: 12000,
				driver_qr_code: "DRV-104",
				notes: null,
				status: "in_review",
				is_simulated: true,
				created_at: updatedAt,
				updated_at: updatedAt,
			},
			{
				id: "demo-r2",
				segment_id: null,
				zone: "centro",
				transport_mode: "informal",
				charged_fare_cop: 25000,
				reference_fare_cop: 12000,
				driver_qr_code: null,
				notes: null,
				status: "resolved",
				is_simulated: true,
				created_at: updatedAt,
				updated_at: updatedAt,
			},
		],
		floodZones: [
			{
				id: "demo-f1",
				code: "ARR-FELICIDAD",
				name: "Arroyo La Felicidad",
				zone: "centro",
				risk_level: "high",
				alert_active: false,
				advisory_es: null,
				advisory_en: null,
				is_simulated: true,
				updated_at: updatedAt,
			},
			{
				id: "demo-f2",
				code: "ARR-MURILLO-46",
				name: "Arroyo Carrera 46",
				zone: "troncal_murillo",
				risk_level: "critical",
				alert_active: false,
				advisory_es: null,
				advisory_en: null,
				is_simulated: true,
				updated_at: updatedAt,
			},
		],
	};
}
