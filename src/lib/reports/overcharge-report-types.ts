import type { CorridorZone } from "../corridor/corridor-types";
import type { ReportTransportMode } from "./overcharge-report";

/** A corridor leg selectable in the visitor overcharge report form. */
export interface SelectableFareRoute {
	segmentCode: string;
	label: string;
	originName: string;
	destinationName: string;
	zone: CorridorZone;
	defaultVehicle: ReportTransportMode;
	referenceFareCop: number;
	fareMinCop: number;
	fareMaxCop: number;
}

/** Response returned by POST /api/reports when saved in Supabase. */
export interface OverchargeSubmitResponse {
	saved: true;
	reportId: string;
	referenceFareCop: number;
	overchargePercent: number | null;
}

/** Live comparison between what the visitor paid and the official reference fare. */
export interface OverchargeComparison {
	deltaCop: number;
	percent: number | null;
	isOvercharge: boolean;
}

/** Payload queued in localStorage when the visitor is offline or the server is unreachable. */
export interface PendingOverchargeReport {
	segmentCode: string;
	transportMode: ReportTransportMode;
	chargedFareCop: number;
	driverQrCode: string;
	notes: string;
	queuedAt: string;
}
