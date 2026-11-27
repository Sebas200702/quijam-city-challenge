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

/** Shape glyph that pairs with each density tone, so state never relies on color alone. */
export const SATURATION_GLYPHS: Record<DensityVisualState["tone"], string> = {
	green: "○",
	gold: "◐",
	red: "●",
};

/** "Último dato hace 8 min": shown while the dashboard is offline. */
export function formatLastDataLabel(
	updatedAtIso: string,
	nowMs: number = Date.now(),
): string {
	const diffSeconds = Math.max(
		0,
		Math.floor((nowMs - new Date(updatedAtIso).getTime()) / 1000),
	);
	if (diffSeconds < 60) {
		return `Último dato hace ${diffSeconds} s`;
	}
	return `Último dato hace ${Math.floor(diffSeconds / 60)} min`;
}

export type ConnectionView = "live" | "connecting" | "offline";

/** A lost realtime channel or a lost network both read as offline to the operator. */
export function getConnectionView(
	realtimeStatus: "connecting" | "live" | "error",
	online: boolean,
): ConnectionView {
	if (!online || realtimeStatus === "error") {
		return "offline";
	}
	return realtimeStatus;
}

/** Dots drawn per zone on the schematic map: one per 100 people, capped to stay legible. */
export function crowdDotCount(activeVisitors: number): number {
	return Math.max(0, Math.min(48, Math.round(activeVisitors / 100)));
}

export function countVerifiedOpenBusinesses(
	businesses: readonly { is_verified: boolean; is_open: boolean }[],
): number {
	return businesses.filter((item) => item.is_verified && item.is_open).length;
}

export type DimensionKey =
	| "territorio"
	| "sostenibilidad"
	| "ciudad_inteligente"
	| "ciudadania"
	| "economia";

export interface DimensionKpi {
	key: DimensionKey;
	label: string;
	value: string;
	/** Short unit or qualifier drawn smaller next to the value. */
	unit: string;
	/** One short sentence that says what the number counts. */
	caption: string;
	tone: "good" | "bad";
	/** Plain-language source, shown under "Ver detalles". */
	details: string;
}

export interface DimensionKpiInput {
	zones: readonly ZoneVisitorCount[];
	reports: readonly OverchargeReport[];
	floodZones: readonly FloodZone[];
	connectedVisitors: number;
	qrVisitors: number;
	verifiedOpenBusinesses: number;
}

const numberEs = new Intl.NumberFormat("es-CO");

/** One indicator per QUILLART dimension, built only from data the dashboard already loads. */
export function buildDimensionKpis(input: DimensionKpiInput): DimensionKpi[] {
	const saturated = getSaturatedZones(input.zones).length;
	const activeFloods = getActiveFloodAlerts(input.floodZones).length;
	const reports = summarizeReportsByStatus(input.reports);

	return [
		{
			key: "territorio",
			label: "Territorio",
			value: numberEs.format(calculateTotalVisitors(input.zones)),
			unit: "personas",
			caption:
				saturated > 0
					? `en el corredor · ${saturated} ${saturated === 1 ? "zona saturada" : "zonas saturadas"}`
					: "en el corredor · paso fluido",
			tone: saturated > 0 ? "bad" : "good",
			details:
				"Suma de conteos anónimos de las cinco zonas del corredor. Nunca usamos ubicación exacta.",
		},
		{
			key: "sostenibilidad",
			label: "Sostenibilidad",
			value: String(activeFloods),
			unit: activeFloods === 1 ? "arroyo" : "arroyos",
			caption: activeFloods > 0 ? "activos ahora" : "activos · corredor seguro",
			tone: activeFloods > 0 ? "bad" : "good",
			details:
				"Arroyos con alerta activa en el corredor. Las rutas evitan los cruces en riesgo.",
		},
		{
			key: "ciudad_inteligente",
			label: "Ciudad inteligente",
			value: numberEs.format(input.connectedVisitors),
			unit: "conectados",
			caption: `visitantes en la app · ${input.qrVisitors} por QR`,
			tone: "good",
			details:
				"Visitantes con QUILLART abierta ahora. Solo contamos conexiones, sin datos personales.",
		},
		{
			key: "ciudadania",
			label: "Ciudadanía",
			value: String(reports.resolved),
			unit: `de ${reports.total}`,
			caption: `reportes resueltos · ${calculateResolvedReportsRate(reports)} %`,
			tone: reports.open > 0 ? "bad" : "good",
			details: `${reports.open} ${reports.open === 1 ? "nuevo" : "nuevos"} y ${reports.in_review} en revisión. Cada reporte de cobro abusivo llega desde /reportar o desde la app.`,
		},
		{
			key: "economia",
			label: "Economía",
			value: String(input.verifiedOpenBusinesses),
			unit: "negocios",
			caption: "verificados y abiertos",
			tone: "good",
			details:
				"Negocios populares con sello de verificado marcados abiertos en el catálogo del piloto.",
		},
	];
}

/** Header badge for the active city mode: "Modo Mundial". */
export const CITY_MODE_BADGES: Record<CityMode, string> = {
	world_cup: "Modo Mundial",
	carnival: "Modo Carnaval",
	daily: "Modo cotidiano",
};
