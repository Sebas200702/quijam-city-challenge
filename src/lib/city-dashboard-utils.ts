import type {
	CityMode,
	CorridorZone,
	FloodRiskLevel,
	FloodZone,
	OverchargeReport,
	ReportFilter,
	ReportStatus,
	ReportStatusAction,
	ReportStatusSummary,
	ZoneVisitorCount,
} from "./city-dashboard-types";

export interface DensityVisualState {
	tone: "green" | "gold" | "red";
	label: "Fluido" | "Moderado" | "Saturado";
}

const RISK_PRIORITY: Record<FloodRiskLevel, number> = {
	critical: 4,
	high: 3,
	moderate: 2,
	low: 1,
};

export const ZONE_LABELS: Record<CorridorZone, string> = {
	estadio: "Estadio Metropolitano",
	troncal_murillo: "Troncal Murillo",
	centro: "Centro Histórico",
	barrio_abajo: "Barrio Abajo",
	gran_malecon: "Gran Malecón",
};

export const CITY_MODE_LABELS: Record<CityMode, string> = {
	world_cup: "Mundial",
	carnival: "Carnaval",
	daily: "Cotidiano",
};

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
	open: "Nuevo",
	in_review: "En revisión",
	resolved: "Resuelto",
	dismissed: "Descartado",
};

export const REPORT_TRANSPORT_LABELS: Record<
	OverchargeReport["transport_mode"],
	string
> = {
	taxi: "Taxi",
	bus: "Bus",
	informal: "Informal",
	other: "Otro",
};

export function calculateResolvedReportsRate(
	summary: ReportStatusSummary,
): number {
	if (summary.total <= 0) {
		return 0;
	}
	return Math.round((summary.resolved / summary.total) * 100);
}

export function filterReportsByStatus(
	reports: readonly OverchargeReport[],
	filter: ReportFilter,
): OverchargeReport[] {
	if (filter === "all") {
		return [...reports];
	}
	return reports.filter((report) => report.status === filter);
}

export function getReportStatusActions(
	status: ReportStatus,
): ReportStatusAction[] {
	switch (status) {
		case "open":
			return [
				{
					nextStatus: "in_review",
					label: "Revisar",
					emphasis: "primary",
				},
				{
					nextStatus: "resolved",
					label: "Resolver",
					emphasis: "secondary",
				},
			];
		case "in_review":
			return [
				{
					nextStatus: "resolved",
					label: "Marcar resuelto",
					emphasis: "primary",
				},
				{
					nextStatus: "dismissed",
					label: "Descartar",
					emphasis: "ghost",
				},
			];
		case "resolved":
		case "dismissed":
			return [
				{
					nextStatus: "in_review",
					label: "Reabrir",
					emphasis: "ghost",
				},
			];
	}
}

export function formatRelativeReportTime(
	createdAtIso: string,
	nowMs: number = Date.now(),
): string {
	const diffSeconds = Math.max(
		0,
		Math.floor((nowMs - new Date(createdAtIso).getTime()) / 1000),
	);
	if (diffSeconds < 60) {
		return "Hace un momento";
	}
	const diffMinutes = Math.floor(diffSeconds / 60);
	if (diffMinutes < 60) {
		return `Hace ${diffMinutes} min`;
	}
	const diffHours = Math.floor(diffMinutes / 60);
	if (diffHours < 24) {
		return `Hace ${diffHours} h`;
	}
	const diffDays = Math.floor(diffHours / 24);
	return `Hace ${diffDays} d`;
}

export function summarizeReportsByStatus(
	reports: readonly OverchargeReport[],
): ReportStatusSummary {
	const summary: ReportStatusSummary = {
		open: 0,
		in_review: 0,
		resolved: 0,
		dismissed: 0,
		total: reports.length,
	};

	for (const report of reports) {
		summary[report.status] += 1;
	}

	return summary;
}

export function getActiveFloodAlerts(
	floodZones: readonly FloodZone[],
): FloodZone[] {
	return floodZones
		.filter((zone) => zone.alert_active)
		.sort((a, b) => RISK_PRIORITY[b.risk_level] - RISK_PRIORITY[a.risk_level]);
}

export function calculateTotalVisitors(
	zones: readonly ZoneVisitorCount[],
): number {
	return zones.reduce((total, zone) => total + zone.active_visitors, 0);
}

export function calculateOccupancyPercent(zone: ZoneVisitorCount): number {
	if (zone.capacity_threshold <= 0) {
		return 0;
	}
	return Math.round((zone.active_visitors / zone.capacity_threshold) * 100);
}

/**
 * QUILLART density scale: green < 60 <= gold < 85 <= red.
 * State always pairs color with an explicit Spanish label.
 */
export function getDensityVisualState(
	occupancyPercent: number,
): DensityVisualState {
	if (occupancyPercent >= 85) {
		return { tone: "red", label: "Saturado" };
	}
	if (occupancyPercent >= 60) {
		return { tone: "gold", label: "Moderado" };
	}
	return { tone: "green", label: "Fluido" };
}

export function getSaturatedZones(
	zones: readonly ZoneVisitorCount[],
): ZoneVisitorCount[] {
	return zones.filter(
		(zone) =>
			zone.saturation_level === "saturated" ||
			calculateOccupancyPercent(zone) >= 85,
	);
}

export function formatFreshnessLabel(
	updatedAtIso: string,
	nowMs: number = Date.now(),
): string {
	const diffSeconds = Math.max(
		0,
		Math.floor((nowMs - new Date(updatedAtIso).getTime()) / 1000),
	);
	if (diffSeconds < 5) {
		return "Actualizado ahora";
	}
	if (diffSeconds < 60) {
		return `Actualizado hace ${diffSeconds} s`;
	}
	const diffMinutes = Math.floor(diffSeconds / 60);
	return `Actualizado hace ${diffMinutes} min`;
}

export function formatCop(amount: number): string {
	return `$${new Intl.NumberFormat("es-CO").format(amount)} COP`;
}
