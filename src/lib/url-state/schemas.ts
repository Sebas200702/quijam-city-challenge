// The query-string contracts of each screen. The assistant builds links with
// `buildHref` and the screens read them with `useUrlState` / `parseParams`, so
// both sides share one definition. Parameter names are public: do not rename.

import type {
	EventCategory,
	ForumCategory,
	PlaceKind,
} from "../community/community-types";
import { REPORT_TRANSPORT_MODES } from "../reports/overcharge-report";
import {
	cleanDate,
	cleanText,
	type FieldSpec,
	pickEnum,
	serializeParams,
	type UrlSchema,
	type UrlValues,
} from "./params";

export const EVENT_CATEGORIES = [
	"culture",
	"music",
	"nature",
	"sport",
	"volunteer",
	"food",
	"learning",
	"community",
] as const satisfies readonly EventCategory[];

export const FORUM_CATEGORIES = [
	"general",
	"visitors",
	"neighborhood",
	"nature",
	"mobility",
	"culture",
	"safety",
] as const satisfies readonly ForumCategory[];

export const PLACE_KINDS = [
	"nature",
	"park",
	"waterfront",
	"culture",
	"heritage",
	"sport",
] as const satisfies readonly PlaceKind[];

export const AGENDA_WHEN = ["hoy", "manana", "finde"] as const;

/** Database ids, slugs and codes: letters, digits, "-", "_" and ".". */
const idSpec = (max = 64): FieldSpec => ({
	kind: "custom",
	parse: (raw) => {
		const text = raw.trim();
		return text.length <= max && /^[A-Za-z0-9_.-]+$/.test(text) ? text : "";
	},
});

/** "hoy" | "manana" | "finde" | YYYY-MM-DD. */
export function cleanWhen(raw: string): string {
	const word = pickEnum(raw.toLowerCase().replace("ñ", "n"), AGENDA_WHEN);
	return word || cleanDate(raw);
}

/** Event price: "0" when free ("gratis", "free", "0"), digits otherwise. */
export function cleanCost(raw: string): string {
	const text = raw.trim().toLowerCase().replace(/[\s$]/g, "").replace(/cop$/, "");
	if (["gratis", "gratuito", "libre", "free", "gratuit", "0"].includes(text))
		return "0";
	if (!/^\d{1,8}$|^\d{1,3}([.,]\d{3}){1,2}$/.test(text)) return "";
	const value = Number(text.replace(/[.,]/g, ""));
	return value > 0 && value <= 10_000_000 ? String(value) : "";
}

/** Fare as typed ("35.000", "$35000"): only digits and separators survive. */
function cleanFare(raw: string): string {
	const text = cleanText(raw, 20).trim();
	return /^\$?\s?[\d.,]{1,12}$/.test(text) ? text.replace(/[$\s]/g, "") : "";
}

/** /agenda: search, category and date. */
export const AGENDA_SCHEMA = {
	q: { kind: "text", max: 80 },
	categoria: { kind: "enum", values: EVENT_CATEGORIES },
	fecha: { kind: "custom", parse: cleanWhen },
} as const satisfies UrlSchema;

/** /lugares: search and kind of place. */
export const PLACES_SCHEMA = {
	q: { kind: "text", max: 80 },
	tipo: { kind: "enum", values: PLACE_KINDS },
} as const satisfies UrlSchema;

/** /agenda/nuevo: draft of an event. Nothing is published without the person. */
export const EVENT_FORM_SCHEMA = {
	titulo: { kind: "text", max: 120 },
	descripcion: { kind: "text", max: 2000, multiline: true },
	categoria: { kind: "enum", values: EVENT_CATEGORIES },
	fecha: { kind: "date" },
	hora: { kind: "time" },
	/** Place id or slug from the catalog, or a free-text address. */
	lugar: { kind: "text", max: 160 },
	/** "0" = free; otherwise the price in COP. */
	costo: { kind: "custom", parse: cleanCost },
	cupos: { kind: "int", min: 1, max: 100_000 },
} as const satisfies UrlSchema;

/** /foro?nuevo=1: draft of a conversation (lugar and evento are ids). */
export const THREAD_FORM_SCHEMA = {
	nuevo: { kind: "enum", values: ["1"] },
	titulo: { kind: "text", max: 140 },
	cuerpo: { kind: "text", max: 5000, multiline: true },
	categoria: { kind: "enum", values: FORUM_CATEGORIES },
	lugar: idSpec(),
	evento: idSpec(),
} as const satisfies UrlSchema;

/** /reportar: draft of an overcharge report. */
export const REPORT_FORM_SCHEMA = {
	segment: {
		kind: "custom",
		parse: (raw) => (/^SEG-[A-Z0-9-]{1,60}$/.test(raw.trim()) ? raw.trim() : ""),
	},
	monto: { kind: "custom", parse: cleanFare },
	vehiculo: { kind: "enum", values: REPORT_TRANSPORT_MODES },
	codigo: {
		kind: "custom",
		parse: (raw) => (/^[A-Za-z0-9-]{1,40}$/.test(raw.trim()) ? raw.trim() : ""),
	},
	notas: { kind: "text", max: 280, multiline: true },
} as const satisfies UrlSchema;

/** Link to `path` with the given values (cleaned, empty ones left out). */
export function buildHref<S extends UrlSchema>(
	path: string,
	schema: S,
	values: Partial<UrlValues<S>>,
): string {
	return `${path}${serializeParams(schema, values)}`;
}
