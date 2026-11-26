import { describe, expect, it } from "vitest";
import type {
	FloodZone,
	OverchargeReport,
	ZoneVisitorCount,
} from "./city-dashboard-types";
import {
	calculateOccupancyPercent,
	calculateTotalVisitors,
	formatCop,
	formatFreshnessLabel,
	getActiveFloodAlerts,
	getDensityVisualState,
	getSaturatedZones,
	summarizeReportsByStatus,
} from "./city-dashboard-utils";

const sampleZones: ZoneVisitorCount[] = [
	{
		zone: "estadio",
		zone_label: "Estadio Metropolitano",
		active_visitors: 4200,
		capacity_threshold: 6000,
		city_mode: "world_cup",
		saturation_level: "normal",
		is_simulated: true,
		updated_at: "2026-11-26T18:00:00Z",
	},
	{
		zone: "gran_malecon",
		zone_label: "Gran Malecón",
		active_visitors: 3600,
		capacity_threshold: 3500,
		city_mode: "world_cup",
		saturation_level: "saturated",
		is_simulated: true,
		updated_at: "2026-11-26T18:00:00Z",
	},
];

const sampleReports: OverchargeReport[] = [
	{
		id: "r1",
		segment_id: null,
		zone: "gran_malecon",
		transport_mode: "taxi",
		charged_fare_cop: 35000,
		reference_fare_cop: 12000,
		driver_qr_code: null,
		notes: null,
		status: "open",
		is_simulated: true,
		created_at: "2026-11-26T18:00:00Z",
		updated_at: "2026-11-26T18:00:00Z",
	},
	{
		id: "r2",
		segment_id: null,
		zone: "estadio",
		transport_mode: "taxi",
		charged_fare_cop: 55000,
		reference_fare_cop: 24000,
		driver_qr_code: "DRV-104",
		notes: null,
		status: "in_review",
		is_simulated: true,
		created_at: "2026-11-26T18:05:00Z",
		updated_at: "2026-11-26T18:05:00Z",
	},
	{
		id: "r3",
		segment_id: null,
		zone: "centro",
		transport_mode: "taxi",
		charged_fare_cop: 25000,
		reference_fare_cop: 12000,
		driver_qr_code: null,
		notes: null,
		status: "resolved",
		is_simulated: true,
		created_at: "2026-11-26T18:10:00Z",
		updated_at: "2026-11-26T18:10:00Z",
	},
];

const sampleFloods: FloodZone[] = [
	{
		id: "f1",
		code: "ARR-FELICIDAD",
		name: "Arroyo La Felicidad",
		zone: "centro",
		risk_level: "moderate",
		alert_active: true,
		advisory_es: "Precaución",
		advisory_en: "Caution",
		is_simulated: true,
		updated_at: "2026-11-26T18:00:00Z",
	},
	{
		id: "f2",
		code: "ARR-MURILLO-46",
		name: "Arroyo Carrera 46 con Murillo",
		zone: "troncal_murillo",
		risk_level: "critical",
		alert_active: true,
		advisory_es: "Evitar cruce",
		advisory_en: "Avoid crossing",
		is_simulated: true,
		updated_at: "2026-11-26T18:00:00Z",
	},
	{
		id: "f3",
		code: "ARR-VIA-40",
		name: "Escorrentía Vía 40",
		zone: "gran_malecon",
		risk_level: "high",
		alert_active: false,
		advisory_es: null,
		advisory_en: null,
		is_simulated: true,
		updated_at: "2026-11-26T18:00:00Z",
	},
];

describe("city-dashboard-utils", () => {
	it("summarizes overcharge reports by status", () => {
		expect(summarizeReportsByStatus(sampleReports)).toEqual({
			open: 1,
			in_review: 1,
			resolved: 1,
			dismissed: 0,
			total: 3,
		});
	});

	it("returns only active flood alerts sorted by highest risk", () => {
		const active = getActiveFloodAlerts(sampleFloods);
		expect(active.map((item) => item.code)).toEqual([
			"ARR-MURILLO-46",
			"ARR-FELICIDAD",
		]);
	});

	it("calculates total visitors, occupancy percentage, and saturated zones", () => {
		expect(calculateTotalVisitors(sampleZones)).toBe(7800);
		expect(calculateOccupancyPercent(sampleZones[0])).toBe(70);
		expect(calculateOccupancyPercent(sampleZones[1])).toBe(103);
		expect(getSaturatedZones(sampleZones).map((z) => z.zone)).toEqual([
			"gran_malecon",
		]);
	});

	it("formats Colombian peso fares cleanly", () => {
		expect(formatCop(12000)).toContain("12");
		expect(formatCop(12000)).toContain("COP");
	});

	it("maps occupancy percentages to QUILLART density states", () => {
		expect(getDensityVisualState(59)).toEqual({
			tone: "green",
			label: "Fluido",
		});
		expect(getDensityVisualState(60)).toEqual({
			tone: "gold",
			label: "Moderado",
		});
		expect(getDensityVisualState(84)).toEqual({
			tone: "gold",
			label: "Moderado",
		});
		expect(getDensityVisualState(85)).toEqual({
			tone: "red",
			label: "Saturado",
		});
	});

	it("formats data freshness labels in Spanish", () => {
		const base = new Date("2026-11-26T18:00:00Z").getTime();
		expect(formatFreshnessLabel("2026-11-26T18:00:00Z", base + 2000)).toBe(
			"Actualizado ahora",
		);
		expect(formatFreshnessLabel("2026-11-26T18:00:00Z", base + 30000)).toBe(
			"Actualizado hace 30 s",
		);
		expect(formatFreshnessLabel("2026-11-26T18:00:00Z", base + 125000)).toBe(
			"Actualizado hace 2 min",
		);
	});
});
