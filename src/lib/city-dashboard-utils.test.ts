import { describe, expect, it } from "vitest";
import type {
	FloodZone,
	OverchargeReport,
	ZoneVisitorCount,
} from "./city-dashboard-types";
import {
	buildDimensionKpis,
	CITY_MODE_BADGES,
	calculateOccupancyPercent,
	calculateResolvedReportsRate,
	calculateTotalVisitors,
	countVerifiedOpenBusinesses,
	crowdDotCount,
	filterReportsByStatus,
	formatCop,
	formatFreshnessLabel,
	formatLastDataLabel,
	formatRelativeReportTime,
	getActiveFloodAlerts,
	getConnectionView,
	getDensityVisualState,
	getReportStatusActions,
	getSaturatedZones,
	REPORT_STATUS_LABELS,
	SATURATION_GLYPHS,
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

	it("uses consistent Spanish labels for inbox states and calculates resolved rate", () => {
		expect(REPORT_STATUS_LABELS).toEqual({
			open: "Nuevo",
			in_review: "En revisión",
			resolved: "Resuelto",
			dismissed: "Descartado",
		});

		const summary = summarizeReportsByStatus(sampleReports);
		expect(calculateResolvedReportsRate(summary)).toBe(33);
		expect(
			calculateResolvedReportsRate({
				open: 0,
				in_review: 0,
				resolved: 0,
				dismissed: 0,
				total: 0,
			}),
		).toBe(0);
	});

	it("filters reports by status and returns valid workflow transitions", () => {
		expect(filterReportsByStatus(sampleReports, "all")).toHaveLength(3);
		expect(
			filterReportsByStatus(sampleReports, "open").map((r) => r.id),
		).toEqual(["r1"]);
		expect(
			filterReportsByStatus(sampleReports, "in_review").map((r) => r.id),
		).toEqual(["r2"]);
		expect(
			filterReportsByStatus(sampleReports, "resolved").map((r) => r.id),
		).toEqual(["r3"]);

		expect(
			getReportStatusActions("open").map((action) => action.nextStatus),
		).toEqual(["in_review", "resolved"]);
		expect(
			getReportStatusActions("in_review").map((action) => action.nextStatus),
		).toEqual(["resolved", "dismissed"]);
		expect(
			getReportStatusActions("resolved").map((action) => action.nextStatus),
		).toEqual(["in_review"]);
	});

	it("formats relative report arrival times in Spanish", () => {
		const base = new Date("2026-11-26T18:00:00Z").getTime();
		expect(
			formatRelativeReportTime("2026-11-26T18:00:00Z", base + 20_000),
		).toBe("Hace un momento");
		expect(
			formatRelativeReportTime("2026-11-26T18:00:00Z", base + 5 * 60_000),
		).toBe("Hace 5 min");
		expect(
			formatRelativeReportTime("2026-11-26T18:00:00Z", base + 2 * 3_600_000),
		).toBe("Hace 2 h");
	});
});

describe("city dashboard shell helpers", () => {
	it("labels the city mode badge in plain words", () => {
		expect(CITY_MODE_BADGES.world_cup).toBe("Modo Mundial");
	});

	it("pairs each density tone with a shape glyph", () => {
		expect(SATURATION_GLYPHS).toEqual({ green: "○", gold: "◐", red: "●" });
	});

	it("formats the last known data label for the offline state", () => {
		const base = new Date("2026-11-26T18:00:00Z").getTime();
		expect(formatLastDataLabel("2026-11-26T18:00:00Z", base + 30000)).toBe(
			"Último dato hace 30 s",
		);
		expect(formatLastDataLabel("2026-11-26T18:00:00Z", base + 480000)).toBe(
			"Último dato hace 8 min",
		);
	});

	it("treats a lost realtime channel or network as offline", () => {
		expect(getConnectionView("live", true)).toBe("live");
		expect(getConnectionView("connecting", true)).toBe("connecting");
		expect(getConnectionView("error", true)).toBe("offline");
		expect(getConnectionView("live", false)).toBe("offline");
	});

	it("caps crowd dots so the map stays legible", () => {
		expect(crowdDotCount(0)).toBe(0);
		expect(crowdDotCount(4200)).toBe(42);
		expect(crowdDotCount(90000)).toBe(48);
	});

	it("counts only verified businesses that are open", () => {
		expect(
			countVerifiedOpenBusinesses([
				{ is_verified: true, is_open: true },
				{ is_verified: true, is_open: false },
				{ is_verified: false, is_open: true },
			]),
		).toBe(1);
	});

	it("builds one indicator per dimension from loaded data", () => {
		const kpis = buildDimensionKpis({
			zones: sampleZones,
			reports: sampleReports,
			floodZones: sampleFloods,
			connectedVisitors: 12,
			qrVisitors: 4,
			verifiedOpenBusinesses: 9,
		});
		expect(kpis.map((kpi) => kpi.key)).toEqual([
			"territorio",
			"sostenibilidad",
			"ciudad_inteligente",
			"ciudadania",
			"economia",
		]);
		expect(kpis[0].caption).toContain("1 zona saturada");
		expect(kpis[1].value).toBe("2");
		expect(kpis[1].tone).toBe("bad");
		expect(kpis[3]).toMatchObject({ value: "1", unit: "de 3", tone: "bad" });
		expect(kpis[3].caption).toBe("reportes resueltos · 33 %");
		expect(kpis[4].value).toBe("9");
	});
});
