import type {
	OpenDataCell,
	OpenDataDatasetMeta,
	OpenDataFormat,
	OpenDataRecord,
	OpenDataSlug,
} from "./open-data-types";

export const OPEN_DATA_PORTAL_NAME =
	"QUILLART · Datos abiertos de Barranquilla";
export const OPEN_DATA_LICENSE = "CC BY 4.0";
export const OPEN_DATA_LICENSE_URL =
	"https://creativecommons.org/licenses/by/4.0/deed.es";
export const OPEN_DATA_PRIVACY_NOTE = "Sin datos personales (Ley 1581 de 2012)";

/**
 * Public datasets published by QUILLART.
 * Every column list acts as a strict allowlist: personal data, accounts,
 * registrations, tokens, and held/removed content are excluded by design.
 */
export const OPEN_DATA_CATALOG: readonly OpenDataDatasetMeta[] = [
	{
		slug: "lugares",
		title: "Espacios públicos y naturaleza",
		description:
			"Parques, ciénagas, malecón y espacios culturales de Barranquilla y su área metropolitana, con accesibilidad, gratuidad y horarios.",
		origin: "community",
		dimension: "territorio",
		license: OPEN_DATA_LICENSE,
		licenseUrl: OPEN_DATA_LICENSE_URL,
		privacyNote: OPEN_DATA_PRIVACY_NOTE,
		columns: [
			"slug",
			"name",
			"kind",
			"neighborhood",
			"description",
			"address",
			"latitude",
			"longitude",
			"is_accessible",
			"is_free",
			"opening_hours",
		],
	},
	{
		slug: "eventos",
		title: "Agenda pública de eventos",
		description:
			"Eventos publicados y aprobados por moderación: título, categoría, fechas, lugar, cupos y acceso. Nunca incluye inscripciones ni perfiles.",
		origin: "community",
		dimension: "ciudadania",
		license: OPEN_DATA_LICENSE,
		licenseUrl: OPEN_DATA_LICENSE_URL,
		privacyNote: OPEN_DATA_PRIVACY_NOTE,
		columns: [
			"id",
			"title",
			"category",
			"starts_at",
			"ends_at",
			"place_name",
			"location_text",
			"capacity",
			"registered_count",
			"is_free",
			"price_cop",
		],
	},
	{
		slug: "paraderos",
		title: "Paraderos y servicios del corredor",
		description:
			"Paraderos y estaciones del corredor piloto con accesibilidad, sombra, hidratación, puntos de reciclaje y duplas de anfitriones (datos de referencia).",
		origin: "reference",
		dimension: "territorio",
		license: OPEN_DATA_LICENSE,
		licenseUrl: OPEN_DATA_LICENSE_URL,
		privacyNote: OPEN_DATA_PRIVACY_NOTE,
		columns: [
			"code",
			"name",
			"zone",
			"stop_type",
			"latitude",
			"longitude",
			"is_accessible",
			"has_shade",
			"has_hydration",
			"has_recycling",
			"has_host_duo",
		],
	},
	{
		slug: "tarifas-y-tramos",
		title: "Tramos y tarifas de referencia",
		description:
			"Tramos del corredor piloto con tarifa de referencia en COP, rango justo, tiempo estimado, modo verde y accesibilidad (datos de referencia).",
		origin: "reference",
		dimension: "ciudad_inteligente",
		license: OPEN_DATA_LICENSE,
		licenseUrl: OPEN_DATA_LICENSE_URL,
		privacyNote: OPEN_DATA_PRIVACY_NOTE,
		columns: [
			"code",
			"origin_stop_code",
			"destination_stop_code",
			"transport_mode",
			"distance_km",
			"estimated_minutes",
			"reference_fare_cop",
			"fare_min_cop",
			"fare_max_cop",
			"is_green_route",
			"is_accessible",
			"flood_zone_code",
		],
	},
	{
		slug: "arroyos",
		title: "Zonas de arroyos y riesgo hídrico",
		description:
			"Puntos críticos de arroyos en el corredor piloto con radio de afectación, nivel de riesgo, estado de alerta y recomendación (datos de referencia).",
		origin: "reference",
		dimension: "sostenibilidad",
		license: OPEN_DATA_LICENSE,
		licenseUrl: OPEN_DATA_LICENSE_URL,
		privacyNote: OPEN_DATA_PRIVACY_NOTE,
		columns: [
			"code",
			"name",
			"zone",
			"latitude",
			"longitude",
			"radius_meters",
			"risk_level",
			"alert_active",
			"advisory_es",
		],
	},
	{
		slug: "negocios-verificados",
		title: "Negocios populares verificados",
		description:
			"Comercios locales verificados sin comisión en el corredor piloto, con categoría, ubicación pública y estado de apertura (datos de referencia).",
		origin: "reference",
		dimension: "economia",
		license: OPEN_DATA_LICENSE,
		licenseUrl: OPEN_DATA_LICENSE_URL,
		privacyNote: OPEN_DATA_PRIVACY_NOTE,
		columns: [
			"code",
			"name",
			"category",
			"zone",
			"latitude",
			"longitude",
			"is_verified",
			"is_open",
			"commission_free",
			"description_es",
		],
	},
] as const;

export function findOpenDataMeta(slug: string): OpenDataDatasetMeta | null {
	return OPEN_DATA_CATALOG.find((dataset) => dataset.slug === slug) ?? null;
}

export function isOpenDataSlug(value: string): value is OpenDataSlug {
	return findOpenDataMeta(value) !== null;
}

export function parseOpenDataFormat(
	value: string | null,
): OpenDataFormat | null {
	if (!value || value === "json") return "json";
	if (value === "csv") return "csv";
	return null;
}

function toSafeCell(value: unknown): OpenDataCell {
	if (value === null || value === undefined) return null;
	if (
		typeof value === "string" ||
		typeof value === "number" ||
		typeof value === "boolean"
	) {
		return value;
	}
	return String(value);
}

/**
 * Keeps only allowlisted public columns from raw rows so no personal or
 * internal field can leak into the open data API or downloads.
 */
export function projectPublicRecords(
	rows: readonly Record<string, unknown>[],
	allowedColumns: readonly string[],
): OpenDataRecord[] {
	return rows.map((row) => {
		const projected: OpenDataRecord = {};
		for (const column of allowedColumns) {
			projected[column] = toSafeCell(row[column]);
		}
		return projected;
	});
}

const FORMULA_PREFIX = /^[=+\-@\t\r]/;
const PLAIN_NUMBER = /^-?\d+(?:\.\d+)?$/;

function escapeCsvCell(value: OpenDataCell): string {
	if (value === null) return "";
	let text = String(value);
	// Neutralize spreadsheet formula injection while preserving negative numbers (e.g. longitude -74.78).
	if (FORMULA_PREFIX.test(text) && !PLAIN_NUMBER.test(text)) {
		text = `'${text}`;
	}
	if (/[",\n\r]/.test(text)) {
		return `"${text.replaceAll('"', '""')}"`;
	}
	return text;
}

/** Serializes allowlisted records into RFC 4180 CSV with UTF-8 safe cells. */
export function serializeToCsv(
	columns: readonly string[],
	records: readonly OpenDataRecord[],
): string {
	const header = columns.map((col) => escapeCsvCell(col)).join(",");
	const lines = records.map((record) =>
		columns.map((col) => escapeCsvCell(record[col] ?? null)).join(","),
	);
	return `${[header, ...lines].join("\r\n")}\r\n`;
}

export function buildDatasetEndpoints(slug: OpenDataSlug): {
	json: string;
	csv: string;
} {
	return {
		json: `/api/datos/${slug}?format=json`,
		csv: `/api/datos/${slug}?format=csv`,
	};
}
