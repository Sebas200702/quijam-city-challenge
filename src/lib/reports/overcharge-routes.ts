import type {
	CorridorData,
	RouteSegment,
	TransportMode,
} from "../corridor/corridor-types";
import {
	overchargePercent,
	type ReportTransportMode,
} from "./overcharge-report";
import type {
	OverchargeComparison,
	PendingOverchargeReport,
	SelectableFareRoute,
} from "./overcharge-report-types";

export const PENDING_REPORTS_STORAGE_KEY = "quillart-pending-reports";

/** Strips verbose parenthetical suffixes when rendering compact route labels. */
export function shortenStopName(name: string): string {
	return name
		.replace(/\s*\([^)]*\)\s*/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

export function formatRouteLabel(
	originName: string,
	destinationName: string,
): string {
	return `${shortenStopName(originName)} → ${shortenStopName(destinationName)}`;
}

export function mapCorridorModeToReportMode(
	mode: TransportMode,
): ReportTransportMode {
	if (mode === "taxi_verified") return "taxi";
	if (mode === "bus" || mode === "transmetro") return "bus";
	return "other";
}

function toSelectableRoute(
	segment: RouteSegment,
	stopByCode: ReadonlyMap<
		string,
		{ name: string; zone: CorridorData["stops"][number]["zone"] }
	>,
): SelectableFareRoute | null {
	const origin = stopByCode.get(segment.origin_stop_code);
	const destination = stopByCode.get(segment.destination_stop_code);
	if (!origin || !destination) return null;

	return {
		segmentCode: segment.code,
		label: formatRouteLabel(origin.name, destination.name),
		originName: origin.name,
		destinationName: destination.name,
		zone: origin.zone,
		defaultVehicle: mapCorridorModeToReportMode(segment.transport_mode),
		referenceFareCop: segment.reference_fare_cop,
		fareMinCop: segment.fare_min_cop,
		fareMaxCop: segment.fare_max_cop,
	};
}

/**
 * Builds the selectable fare routes for the overcharge report form from corridor data.
 * Prefers paid legs (taxi, bus, Transmetro), sorted with taxis first so the most common
 * overcharge routes appear at the top.
 */
export function buildSelectableFareRoutes(
	data: CorridorData,
): SelectableFareRoute[] {
	const stopByCode = new Map(
		data.stops.map((stop) => [stop.code, { name: stop.name, zone: stop.zone }]),
	);
	const paidSegments = data.segments.filter(
		(segment) => segment.reference_fare_cop > 0,
	);
	const source = paidSegments.length > 0 ? paidSegments : data.segments;

	return source
		.map((segment) => toSelectableRoute(segment, stopByCode))
		.filter((route): route is SelectableFareRoute => route !== null)
		.sort((a, b) => {
			if (a.defaultVehicle === "taxi" && b.defaultVehicle !== "taxi") return -1;
			if (a.defaultVehicle !== "taxi" && b.defaultVehicle === "taxi") return 1;
			return b.referenceFareCop - a.referenceFareCop;
		});
}

/** Evaluates how much above (or within) the reference fare a charged amount is. */
export function evaluateOvercharge(
	chargedCop: number,
	referenceCop: number,
): OverchargeComparison | null {
	if (!Number.isFinite(chargedCop) || chargedCop <= 0) {
		return null;
	}
	const deltaCop = Math.round(chargedCop - referenceCop);
	return {
		deltaCop,
		percent: overchargePercent(Math.round(chargedCop), referenceCop),
		isOvercharge: referenceCop > 0 && chargedCop > referenceCop,
	};
}

export function readPendingReports(): PendingOverchargeReport[] {
	try {
		const raw = localStorage.getItem(PENDING_REPORTS_STORAGE_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw) as unknown;
		return Array.isArray(parsed) ? (parsed as PendingOverchargeReport[]) : [];
	} catch {
		return [];
	}
}

export function queuePendingReport(report: PendingOverchargeReport): number {
	const next = [...readPendingReports(), report];
	try {
		localStorage.setItem(PENDING_REPORTS_STORAGE_KEY, JSON.stringify(next));
	} catch {
		// Storage blocked: the UI still informs the visitor.
	}
	return next.length;
}

export function writePendingReports(reports: PendingOverchargeReport[]): void {
	try {
		if (reports.length === 0) {
			localStorage.removeItem(PENDING_REPORTS_STORAGE_KEY);
		} else {
			localStorage.setItem(
				PENDING_REPORTS_STORAGE_KEY,
				JSON.stringify(reports),
			);
		}
	} catch {
		// Storage blocked: ignore.
	}
}
