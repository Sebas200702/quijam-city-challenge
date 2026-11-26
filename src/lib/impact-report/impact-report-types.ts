import type { CorridorZone, ReportStatus } from "../city-dashboard-types";

/** Only the columns the report needs. No notes, no driver QR, no personal data. */
export interface ReportRow {
	status: ReportStatus;
	charged_fare_cop: number;
	reference_fare_cop: number;
}

export interface BusinessRow {
	zone: CorridorZone;
	is_open: boolean;
	is_verified: boolean;
}

export interface ZoneMetric {
	label: string;
	visitors: number;
	capacity: number;
	occupancyPct: number;
	state: "Fluido" | "Moderado" | "Saturado";
}

/** Aggregated figures for the daily report. Every number in the report must come from here. */
export interface ImpactMetrics {
	generatedAt: string;
	cityModeLabel: string;
	totalVisitors: number;
	zones: ZoneMetric[];
	saturatedZoneLabels: string[];
	reports: {
		total: number;
		open: number;
		inReview: number;
		resolved: number;
		dismissed: number;
		/** Resolved over total, rounded. Null with no reports. */
		resolvedPct: number | null;
		/** Average of charged over reference fare minus 100 %, rounded. Null with no reports. */
		avgOverchargePct: number | null;
	};
	activeFloodAlerts: string[];
	openVerifiedBusinesses: number;
	openBarrioAbajoBusinesses: number;
	/** Not tracked yet: comes with the crowd simulator (#42). */
	divertedVisitors: number | null;
	/** Not tracked yet: needs visit stamps (#45). */
	businessVisits: number | null;
}

export type ReportSource = "ai" | "template";

export interface ImpactReportResponse {
	markdown: string;
	source: ReportSource;
	/** Why the template was used instead of the AI text. */
	fallbackReason?: string;
	metrics: ImpactMetrics;
}
