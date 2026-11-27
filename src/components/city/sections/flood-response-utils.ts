import type {
	FloodRiskLevel,
	FloodZone,
} from "../../../lib/city-dashboard-types";
import { ZONE_LABELS } from "../../../lib/city-dashboard-utils";
import type {
	CorridorStop,
	RouteSegment,
	TransportMode,
} from "../../../lib/corridor/corridor-types";
import {
	type FloodCountdowns,
	floodStatus,
} from "../../../lib/flood-alert/flood-countdown";
import type { AffectedRoute, ArroyoRow } from "./city-sections-types";

export const RISK_LABELS: Record<FloodRiskLevel, string> = {
	low: "riesgo bajo",
	moderate: "riesgo moderado",
	high: "riesgo alto",
	critical: "riesgo crítico",
};

const STATUS_ORDER = { active: 0, countdown: 1, none: 2 } as const;

/** Flood zones as section rows: active first, then countdowns, then safe ones. */
export function toArroyoRows(
	floodZones: readonly FloodZone[],
	countdowns: FloodCountdowns,
	nowMs: number,
): ArroyoRow[] {
	return floodZones
		.map((zone) => ({
			id: zone.id,
			name: zone.name,
			zoneLabel: ZONE_LABELS[zone.zone],
			riskLabel: RISK_LABELS[zone.risk_level],
			status: floodStatus(zone, countdowns, nowMs),
		}))
		.sort((a, b) => STATUS_ORDER[a.status.kind] - STATUS_ORDER[b.status.kind]);
}

export interface ArroyoSummary {
	/** Rows active or counting down. */
	alerted: ArroyoRow[];
	activeCount: number;
	/** Minutes until the closest countdown ends; null without countdowns. */
	nextMinutes: number | null;
}

export function summarizeArroyos(rows: readonly ArroyoRow[]): ArroyoSummary {
	const alerted = rows.filter((row) => row.status.kind !== "none");
	const minutes = alerted.flatMap((row) =>
		row.status.kind === "countdown" ? [row.status.minutesLeft] : [],
	);
	return {
		alerted,
		activeCount: alerted.filter((row) => row.status.kind === "active").length,
		nextMinutes: minutes.length > 0 ? Math.min(...minutes) : null,
	};
}

/** Title of the one alert of the section, in plain words. */
export function arroyoAlertTitle(summary: ArroyoSummary): string {
	const total = summary.alerted.length;
	const noun = total === 1 ? "arroyo" : "arroyos";
	if (summary.activeCount === total) {
		return `${total} ${noun} ${total === 1 ? "activo" : "activos"}`;
	}
	if (summary.activeCount === 0 && summary.nextMinutes !== null) {
		return `${total} ${noun} se ${total === 1 ? "activa" : "activan"} en ${summary.nextMinutes} min`;
	}
	return `${summary.activeCount} ${summary.activeCount === 1 ? "arroyo activo" : "arroyos activos"} y ${total - summary.activeCount} por activarse`;
}

/** Names joined in Spanish: "A", "A y B", "A, B y C". */
export function joinNames(names: readonly string[]): string {
	if (names.length <= 1) return names[0] ?? "";
	return `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`;
}

const ROUTE_ICON: Record<TransportMode, AffectedRoute["icon"]> = {
	transmetro: "bus-front",
	bus: "bus",
	taxi_verified: "taxi",
	walk: "walk",
	bike: "walk",
};

/**
 * Corridor legs that cross an alerted arroyo: the Decider no longer offers them
 * (hard rule), so the city sees them as blocked.
 */
export function toAffectedRoutes(
	segments: readonly RouteSegment[],
	stops: readonly CorridorStop[],
	alertedFloodCodes: readonly string[],
): AffectedRoute[] {
	const alerted = new Set(alertedFloodCodes);
	const nameOf = new Map(stops.map((stop) => [stop.code, stop.name]));
	return segments
		.filter((s) => s.flood_zone_code && alerted.has(s.flood_zone_code))
		.map((s) => ({
			id: s.code,
			label: `${nameOf.get(s.origin_stop_code) ?? s.origin_stop_code} → ${
				nameOf.get(s.destination_stop_code) ?? s.destination_stop_code
			}`,
			detail: "Cruza un arroyo con alerta: el Decisor ya no la ofrece.",
			state: "blocked",
			icon: ROUTE_ICON[s.transport_mode],
		}));
}
