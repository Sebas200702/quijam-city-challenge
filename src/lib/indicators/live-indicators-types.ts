import type { ReportStatus } from "../city-dashboard-types";

export type ProgramDimension =
	| "territorio"
	| "sostenibilidad"
	| "ciudad_inteligente"
	| "ciudadania"
	| "economia";

export type IndicatorDataOrigin = "community" | "reference" | "mixed";

export type IndicatorProgressTone = "green" | "gold" | "red";

export type IndicatorStateLabel = "En meta" | "En avance" | "Por mejorar";

export interface IndicatorFact {
	label: string;
	value: string;
}

export interface DimensionIndicator {
	dimension: ProgramDimension;
	dimensionLabel: string;
	title: string;
	currentDisplay: string;
	targetDisplay: string;
	progressPercent: number;
	tone: IndicatorProgressTone;
	stateLabel: IndicatorStateLabel;
	origin: IndicatorDataOrigin;
	/** Real community metrics from citizen events, places, and moderation. */
	communityFacts: IndicatorFact[];
	/** Corridor pilot seed metrics explicitly marked as reference data (rule 9). */
	referenceFacts: IndicatorFact[];
	actionHref?: string;
	actionLabel?: string;
}

export interface LiveSegmentRow {
	is_accessible: boolean;
	is_green_route: boolean;
}

export interface LiveFloodZoneRow {
	code: string;
	alert_active: boolean;
}

export interface LivePlaceRow {
	is_accessible: boolean;
}

export interface LiveBusinessRow {
	is_verified: boolean;
	is_open: boolean;
	zone: string;
}

export interface LiveOverchargeRow {
	status: ReportStatus;
}

export interface LiveCommunityEventRow {
	status: string;
	moderation_status: string;
	registered_count: number;
	triage_priority: string;
	city_resolved_at: string | null;
}

export interface LiveCommunityNoticeRow {
	moderation_status: string;
	triage_priority: string;
	city_resolved_at: string | null;
}

export interface LiveIndicatorsRawInput {
	segments: readonly LiveSegmentRow[];
	floodZones: readonly LiveFloodZoneRow[];
	places: readonly LivePlaceRow[];
	businesses: readonly LiveBusinessRow[];
	reports: readonly LiveOverchargeRow[];
	events: readonly LiveCommunityEventRow[];
	forumThreads: readonly LiveCommunityNoticeRow[];
	forumPosts: readonly LiveCommunityNoticeRow[];
	openDatasetsCount: number;
	/** Stamps given at verified businesses (passport_visits rows); 0 when unavailable. */
	passportVisitsCount?: number;
	/** Active flood zone codes broadcast over `city-events` (`aguacero`). */
	liveEventFloodCodes?: readonly string[];
}

export type IndicatorsRealtimeStatus =
	| "connecting"
	| "live"
	| "offline"
	| "error";
