// Reading an event out of what the person said: the quoted name, the hour,
// the date, how many people fit and what it costs. Pure helpers, used by the
// local Agenda agent to draft create_event without a model.

import { hasAnyKeyword, normalizeText } from "./assistant-text";

const BOGOTA_OFFSET_MS = -5 * 60 * 60 * 1000;

/** "8 am", "8:30 p. m.", "a las 18", "6 de la tarde" → "08:00", "20:30", "18:00", "18:00". */
export function timeFromText(text: string): string | null {
	const match =
		/\b(\d{1,2})(?::(\d{2}))?\s*(a\.?\s?m\.?|p\.?\s?m\.?)/i.exec(text) ??
		/\b(\d{1,2})(?::(\d{2}))?\s+(?:de la\s+)?(tarde|noche|mañana|manana)\b/i.exec(
			text,
		) ??
		/\ba las (\d{1,2})(?::(\d{2}))?\b/i.exec(text);
	if (!match) return null;
	let hour = Number(match[1]);
	const minutes = Number(match[2] ?? "0");
	const meridiem = (match[3] ?? "").toLowerCase();
	const afternoon =
		meridiem.startsWith("p") || meridiem === "tarde" || meridiem === "noche";
	const morning = meridiem.startsWith("a") || meridiem.startsWith("ma");
	if (afternoon && hour < 12) hour += 12;
	if (morning && hour === 12) hour = 0;
	if (hour > 23 || minutes > 59) return null;
	return `${String(hour).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

const MONTHS: Record<string, number> = {
	enero: 0,
	febrero: 1,
	marzo: 2,
	abril: 3,
	mayo: 4,
	junio: 5,
	julio: 6,
	agosto: 7,
	septiembre: 8,
	setiembre: 8,
	octubre: 9,
	noviembre: 10,
	diciembre: 11,
};

/** "el 5 de diciembre" or "12/12" → "2026-12-05" (the next one from now), or null. */
export function dateFromText(text: string, nowIso: string): string | null {
	const normalized = normalizeText(text);
	let day: number;
	let month: number;
	const named = /\s(\d{1,2}) de ([a-z]+)\s/.exec(normalized);
	if (named && Object.hasOwn(MONTHS, named[2])) {
		day = Number(named[1]);
		month = MONTHS[named[2]];
	} else {
		const numeric =
			/(?:^|\s)(\d{1,2})\/(\d{1,2})(?:\/\d{2,4})?(?=$|[\s.,;])/.exec(text);
		if (!numeric) return null;
		day = Number(numeric[1]);
		month = Number(numeric[2]) - 1;
	}
	if (day < 1 || day > 31 || month < 0 || month > 11) return null;
	const now = Date.parse(nowIso);
	const today = new Date(
		(Number.isNaN(now) ? Date.now() : now) + BOGOTA_OFFSET_MS,
	);
	const key = (year: number) =>
		`${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
	let year = today.getUTCFullYear();
	if (key(year) < today.toISOString().slice(0, 10)) year += 1;
	// 31 de febrero does not exist.
	if (new Date(`${key(year)}T00:00:00Z`).getUTCDate() !== day) return null;
	return key(year);
}

const CAPACITY_PATTERNS = [
	/\b(\d{1,6})\s*(?:cupos?|puestos?|plazas?|personas|asistentes|participantes|spots?|seats?|people)\b/i,
	/\bcupos?\s+(?:de\s+|para\s+|m[aá]ximo(?:\s+de)?\s+|limitado\s+a\s+)?(\d{1,6})\b/i,
	/\b(?:m[aá]ximo|aforo(?:\s+de)?|capacidad(?:\s+(?:de|para))?)\s+(\d{1,6})\b/i,
];

/** "con 50 cupos", "para 50 personas", "cupo de 50" → 50; null when not said. */
export function capacityFromText(text: string): number | null {
	for (const pattern of CAPACITY_PATTERNS) {
		const match = pattern.exec(text);
		if (!match) continue;
		const value = Number(match[1]);
		if (value >= 1 && value <= 100000) return value;
	}
	return null;
}

const FREE_WORDS = [
	"gratis",
	"gratuito",
	"gratuita",
	"entrada libre",
	"sin costo",
	"free",
];

const AMOUNT = String.raw`(\d{1,3}(?:[.,]\d{3})+|\d+)`;
const PRICE_PATTERNS = [
	new RegExp(String.raw`\$\s?${AMOUNT}\s*(mil\b)?`, "i"),
	new RegExp(String.raw`\b${AMOUNT}\s*(mil\s+)?(?:pesos|cop)\b`, "i"),
	new RegExp(
		String.raw`\b(?:cuesta|vale|valor(?:\s+de)?|precio(?:\s+de)?|entrada(?:\s+de)?|cover(?:\s+de)?)\s+\$?\s?${AMOUNT}\s*(mil\b)?`,
		"i",
	),
];

/**
 * What the event costs in pesos; null when free or not said.
 * "$10.000", "10 mil pesos", "la entrada cuesta 5000" → 10000, 10000, 5000.
 */
export function priceFromText(text: string): number | null {
	if (hasAnyKeyword(normalizeText(text), FREE_WORDS)) return null;
	for (const pattern of PRICE_PATTERNS) {
		const match = pattern.exec(text);
		if (!match) continue;
		const value = Number(match[1].replace(/[.,]/g, "")) * (match[2] ? 1000 : 1);
		if (value > 0 && value <= 10_000_000) return value;
	}
	return null;
}

/** A quoted name: "…", “…”, «…», ‘…’ or '…'. */
const QUOTED_PATTERNS = [
	/"([^"]{3,120})"/,
	/“([^”"]{3,120})[”"]/,
	/«([^»]{3,120})»/,
	/‘([^’]{3,120})’/,
	/(?:^|[\s:(])'([^']{3,120})'(?=$|[\s.,;:!?)])/,
];

/** The name the person put in quotes, or null. */
export function quotedTitle(text: string): string | null {
	for (const pattern of QUOTED_PATTERNS) {
		const title = pattern
			.exec(text)?.[1]
			.trim()
			.replace(/[.,;:]+$/, "");
		if (title && title.length >= 3) return title;
	}
	return null;
}

/** The text without quote marks around names. */
export function withoutQuotes(text: string): string {
	return text
		.replace(/(^|[\s:(])'([^']{3,120})'(?=$|[\s.,;:!?)])/g, "$1$2")
		.replace(/["“”«»‘’]/g, "")
		.replace(/\s+/g, " ")
		.trim();
}

/** Where the "when / how many / how much" part of a sentence starts. */
const TITLE_END =
	/\s+(?:(?:el|este|esta|pr[oó]xim[oa]|para el|del)\s+(?:lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo|fin de semana|finde|\d)|hoy\b|ma[nñ]ana\b|pasado ma[nñ]ana\b|esta noche\b|a las\s|desde las\s|con\s+(?:\d|cupo|capacidad|aforo)|para\s+\d|\d+\s+cupos?\b|cupos?\b|cuesta\b|vale\b|\$)|[,;.!?](?:\s|$)/i;

const TRAILING_SMALL_WORD =
	/\s+(?:en|de|del|el|la|los|las|a|al|con|para|y|que)$/i;

function trimSmallWords(text: string): string {
	let title = text.trim().replace(/[.,;:]+$/, "");
	while (TRAILING_SMALL_WORD.test(title)) {
		title = title.replace(TRAILING_SMALL_WORD, "");
	}
	return title;
}

/** A short title from free text: the words before the date, hour, capacity or price. */
export function titleFromBody(body: string): string {
	const end = TITLE_END.exec(body);
	const title = trimSmallWords(end ? body.slice(0, end.index) : body);
	if (title.length <= 80) return title;
	const cut = title.slice(0, 80);
	const space = cut.lastIndexOf(" ");
	return trimSmallWords(space > 40 ? cut.slice(0, space) : cut);
}
