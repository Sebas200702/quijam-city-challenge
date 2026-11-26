import type { FloodZone, ZoneVisitorCount } from "../city-dashboard-types";
import {
	CITY_MODE_LABELS,
	calculateOccupancyPercent,
	calculateTotalVisitors,
	getActiveFloodAlerts,
	getDensityVisualState,
	getSaturatedZones,
} from "../city-dashboard-utils";
import type {
	BusinessRow,
	ImpactMetrics,
	ReportRow,
} from "./impact-report-types";

function percent(part: number, whole: number): number | null {
	return whole > 0 ? Math.round((part / whole) * 100) : null;
}

function averageOverchargePct(reports: readonly ReportRow[]): number | null {
	const valid = reports.filter((report) => report.reference_fare_cop > 0);
	if (valid.length === 0) {
		return null;
	}
	const sum = valid.reduce(
		(total, report) =>
			total + report.charged_fare_cop / report.reference_fare_cop - 1,
		0,
	);
	return Math.round((sum / valid.length) * 100);
}

/** Turns raw rows into the aggregated figures the report may cite. */
export function computeImpactMetrics(input: {
	zones: readonly ZoneVisitorCount[];
	reports: readonly ReportRow[];
	floodZones: readonly FloodZone[];
	businesses: readonly BusinessRow[];
	now?: Date;
}): ImpactMetrics {
	const { zones, reports, floodZones, businesses } = input;
	const count = (status: ReportRow["status"]) =>
		reports.filter((report) => report.status === status).length;
	const openVerified = businesses.filter(
		(business) => business.is_open && business.is_verified,
	);
	const mode = zones[0]?.city_mode;

	return {
		generatedAt: (input.now ?? new Date()).toISOString(),
		cityModeLabel: mode ? CITY_MODE_LABELS[mode] : "Sin dato",
		totalVisitors: calculateTotalVisitors(zones),
		zones: zones.map((zone) => {
			const occupancyPct = calculateOccupancyPercent(zone);
			return {
				label: zone.zone_label,
				visitors: zone.active_visitors,
				capacity: zone.capacity_threshold,
				occupancyPct,
				state: getDensityVisualState(occupancyPct).label,
			};
		}),
		saturatedZoneLabels: getSaturatedZones(zones).map(
			(zone) => zone.zone_label,
		),
		reports: {
			total: reports.length,
			open: count("open"),
			inReview: count("in_review"),
			resolved: count("resolved"),
			dismissed: count("dismissed"),
			resolvedPct: percent(count("resolved"), reports.length),
			avgOverchargePct: averageOverchargePct(reports),
		},
		activeFloodAlerts: getActiveFloodAlerts(floodZones).map(
			(zone) => zone.name,
		),
		openVerifiedBusinesses: openVerified.length,
		openBarrioAbajoBusinesses: openVerified.filter(
			(business) => business.zone === "barrio_abajo",
		).length,
		divertedVisitors: null,
		businessVisits: null,
	};
}
