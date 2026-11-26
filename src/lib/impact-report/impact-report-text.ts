import type { ImpactMetrics } from "./impact-report-types";

const NUMBER_FORMAT = new Intl.NumberFormat("es-CO");

/** Numbers that may appear in any report besides the metrics: year and privacy law. */
const FIXED_NUMBERS = [2034, 1581, 2012];

const NOT_TRACKED = "aún sin datos";

function list(items: string[], empty: string): string {
	return items.length > 0 ? items.join(", ") : empty;
}

function pct(value: number | null): string {
	return value === null ? "sin reportes" : `${value} %`;
}

function dateParts(iso: string): number[] {
	const date = new Date(iso);
	return [date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()];
}

/** Every number the report is allowed to contain. */
export function allowedNumbers(metrics: ImpactMetrics): Set<number> {
	const values = [
		...FIXED_NUMBERS,
		...dateParts(metrics.generatedAt),
		metrics.totalVisitors,
		metrics.reports.total,
		metrics.reports.open,
		metrics.reports.inReview,
		metrics.reports.resolved,
		metrics.reports.dismissed,
		metrics.reports.resolvedPct,
		metrics.reports.avgOverchargePct,
		metrics.openVerifiedBusinesses,
		metrics.openBarrioAbajoBusinesses,
		metrics.divertedVisitors,
		metrics.businessVisits,
		metrics.saturatedZoneLabels.length,
		metrics.activeFloodAlerts.length,
		...metrics.zones.flatMap((zone) => [
			zone.visitors,
			zone.capacity,
			zone.occupancyPct,
		]),
		// Names from the database can carry numbers, e.g. "Arroyo Calle 48".
		...[
			...metrics.zones.map((zone) => zone.label),
			...metrics.activeFloodAlerts,
		].flatMap(extractNumbers),
	];
	return new Set(
		values
			.filter((value): value is number => value !== null)
			.map((value) => Math.abs(value)),
	);
}

/** Numbers written in the text, reading "1.234" and "1,234" as thousands. */
export function extractNumbers(text: string): number[] {
	return (text.match(/\d+(?:[.,]\d{3})*/g) ?? []).map((token) =>
		Number(token.replace(/[.,]/g, "")),
	);
}

/** Numbers in the text that are not in the data. Empty means every figure matches. */
export function findUnknownNumbers(
	text: string,
	metrics: ImpactMetrics,
): number[] {
	const allowed = allowedNumbers(metrics);
	return [...new Set(extractNumbers(text))].filter(
		(value) => !allowed.has(value),
	);
}

/** Report written from a fixed template. Used without AI or when the AI text fails the check. */
export function buildTemplateReport(metrics: ImpactMetrics): string {
	const { reports } = metrics;
	const zoneLines = metrics.zones.map(
		(zone) =>
			`| ${zone.label} | ${NUMBER_FORMAT.format(zone.visitors)} | ${NUMBER_FORMAT.format(zone.capacity)} | ${zone.occupancyPct} % | ${zone.state} |`,
	);
	return [
		"# Informe de impacto del día",
		"",
		`_Datos de referencia del corredor · Modo de ciudad: ${metrics.cityModeLabel} · Generado: ${metrics.generatedAt.slice(0, 10)}_`,
		"",
		"## Resumen",
		"",
		`- Visitantes en el corredor: ${NUMBER_FORMAT.format(metrics.totalVisitors)}.`,
		`- Zonas saturadas: ${list(metrics.saturatedZoneLabels, "ninguna")}.`,
		`- Alertas de arroyo activas: ${list(metrics.activeFloodAlerts, "ninguna")}.`,
		"",
		"## Ocupación por zona",
		"",
		"| Zona | Visitantes | Umbral | Ocupación | Estado |",
		"|---|---|---|---|---|",
		...zoneLines,
		"",
		"## Economía local",
		"",
		`- Negocios verificados abiertos: ${metrics.openVerifiedBusinesses}, de ellos ${metrics.openBarrioAbajoBusinesses} en Barrio Abajo.`,
		`- Personas desviadas: ${metrics.divertedVisitors ?? NOT_TRACKED}.`,
		`- Visitas a negocios: ${metrics.businessVisits ?? NOT_TRACKED}.`,
		"",
		"## Tarifa justa",
		"",
		`- Reportes de cobro abusivo: ${reports.total} (abiertos ${reports.open}, en revisión ${reports.inReview}, resueltos ${reports.resolved}, descartados ${reports.dismissed}).`,
		`- Porcentaje resuelto: ${pct(reports.resolvedPct)}.`,
		`- Sobrecobro promedio frente a la tarifa de referencia: ${pct(reports.avgOverchargePct)}.`,
		"",
		"---",
		"",
		"Solo conteos anónimos agregados (Ley 1581 de 2012).",
		"",
	].join("\n");
}

export const REPORT_SYSTEM_INSTRUCTION = [
	"Eres analista de la Alcaldía de Barranquilla. Redactas el informe diario de impacto de QUILLART para la ciudad.",
	"Reglas obligatorias:",
	"- Usa SOLO las cifras del JSON. No calcules cifras nuevas, no redondees distinto y no inventes datos.",
	"- Si un valor es null, escribe que aún no hay datos.",
	"- No uses listas numeradas ni escribas números que no estén en el JSON.",
	"- Español claro, frases cortas, en Markdown, máximo 250 palabras.",
	"- Indica al inicio que son datos de referencia del corredor, no mediciones en vivo.",
	"- Secciones: Resumen, Ocupación por zona, Economía local, Tarifa justa, Recomendación para mañana (sin cifras nuevas).",
].join("\n");

export function buildReportPrompt(metrics: ImpactMetrics): string {
	return `Datos agregados del día (JSON):\n\n${JSON.stringify(metrics, null, 2)}`;
}
