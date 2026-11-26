import { describe, expect, it } from "vitest";
import type { FloodZone, ZoneVisitorCount } from "../city-dashboard-types";
import { computeImpactMetrics } from "./impact-metrics";
import {
	buildTemplateReport,
	extractNumbers,
	findUnknownNumbers,
} from "./impact-report-text";
import type { BusinessRow, ReportRow } from "./impact-report-types";

function zone(
	key: ZoneVisitorCount["zone"],
	label: string,
	visitors: number,
	capacity: number,
): ZoneVisitorCount {
	return {
		zone: key,
		zone_label: label,
		active_visitors: visitors,
		capacity_threshold: capacity,
		city_mode: "world_cup",
		saturation_level: visitors >= capacity ? "saturated" : "normal",
		is_simulated: true,
		updated_at: "2026-11-26T12:00:00Z",
	};
}

// Same figures as supabase/seed.sql (simulated).
const zones = [
	zone("estadio", "Estadio Metropolitano", 4200, 6000),
	zone("barrio_abajo", "Barrio Abajo", 620, 1800),
	zone("gran_malecon", "Gran Malecon", 3100, 3500),
];

const reports: ReportRow[] = [
	{ status: "resolved", charged_fare_cop: 35000, reference_fare_cop: 12000 },
	{ status: "open", charged_fare_cop: 15000, reference_fare_cop: 12000 },
	{ status: "in_review", charged_fare_cop: 12000, reference_fare_cop: 12000 },
	{ status: "resolved", charged_fare_cop: 18000, reference_fare_cop: 12000 },
];

const floodZones = [
	{ name: "Arroyo Calle 48", alert_active: true, risk_level: "high" },
	{ name: "Arroyo Calle 84", alert_active: false, risk_level: "critical" },
] as FloodZone[];

const businesses: BusinessRow[] = [
	{ zone: "barrio_abajo", is_open: true, is_verified: true },
	{ zone: "barrio_abajo", is_open: false, is_verified: true },
	{ zone: "centro", is_open: true, is_verified: true },
	{ zone: "centro", is_open: true, is_verified: false },
];

const metrics = computeImpactMetrics({
	zones,
	reports,
	floodZones,
	businesses,
	now: new Date("2026-11-26T22:00:00Z"),
});

describe("computeImpactMetrics", () => {
	it("aggregates visitors and occupancy per zone", () => {
		expect(metrics.totalVisitors).toBe(7920);
		expect(metrics.zones.find((z) => z.label === "Gran Malecon")).toMatchObject(
			{
				occupancyPct: 89,
				state: "Saturado",
			},
		);
		expect(metrics.saturatedZoneLabels).toEqual(["Gran Malecon"]);
		expect(metrics.cityModeLabel).toBe("Mundial 2034");
	});

	it("summarizes overcharge reports", () => {
		expect(metrics.reports).toEqual({
			total: 4,
			open: 1,
			inReview: 1,
			resolved: 2,
			dismissed: 0,
			resolvedPct: 50,
			// (192 % + 25 % + 0 % + 50 %) / 4 = 66.7 %
			avgOverchargePct: 67,
		});
	});

	it("counts only open and verified businesses", () => {
		expect(metrics.openVerifiedBusinesses).toBe(2);
		expect(metrics.openBarrioAbajoBusinesses).toBe(1);
	});

	it("lists only active flood alerts", () => {
		expect(metrics.activeFloodAlerts).toEqual(["Arroyo Calle 48"]);
	});

	it("leaves untracked figures empty instead of inventing them", () => {
		expect(metrics.divertedVisitors).toBeNull();
		expect(metrics.businessVisits).toBeNull();
	});

	it("handles a day without reports", () => {
		const empty = computeImpactMetrics({
			zones,
			reports: [],
			floodZones,
			businesses,
		});
		expect(empty.reports.resolvedPct).toBeNull();
		expect(empty.reports.avgOverchargePct).toBeNull();
	});
});

describe("number check", () => {
	it("reads thousands separators", () => {
		expect(extractNumbers("7.920 visitantes y 3,100 más, 89 %")).toEqual([
			7920, 3100, 89,
		]);
	});

	it("accepts the template report: every figure comes from the data", () => {
		expect(findUnknownNumbers(buildTemplateReport(metrics), metrics)).toEqual(
			[],
		);
	});

	it("accepts numbers that are part of names from the database", () => {
		expect(
			findUnknownNumbers("Alerta en el Arroyo Calle 48.", metrics),
		).toEqual([]);
	});

	it("flags invented figures", () => {
		const text =
			"Hoy se desviaron 1.200 personas y 7.920 visitantes recorrieron el corredor.";
		expect(findUnknownNumbers(text, metrics)).toEqual([1200]);
	});
});

describe("buildTemplateReport", () => {
	it("marks the data as simulated and says what is not tracked yet", () => {
		const report = buildTemplateReport(metrics);
		expect(report).toContain("Datos simulados 2034");
		expect(report).toContain("Personas desviadas: aún sin datos");
		expect(report).toContain(
			"| Gran Malecon | 3.100 | 3.500 | 89 % | Saturado |",
		);
	});
});
