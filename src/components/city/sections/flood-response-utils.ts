import type {
	FloodRiskLevel,
	FloodZone,
} from "../../../lib/city-dashboard-types";
import { ZONE_LABELS } from "../../../lib/city-dashboard-utils";
import {
	type FloodCountdowns,
	floodStatus,
} from "../../../lib/flood-alert/flood-countdown";
import type { ArroyoRow } from "./city-sections-types";

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
