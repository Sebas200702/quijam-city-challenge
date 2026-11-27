// Reads and writes screen state in the query string. Every value comes from
// the URL, so it is untrusted: each field has a spec that caps its length,
// whitelists enums and drops anything malformed. Values are always strings
// ("" means "not set") so they can be bound straight to inputs.

export type FieldSpec =
	| {
			kind: "text";
			/** Maximum length in characters (code points). */
			max: number;
			/** Keeps line breaks (textareas); otherwise they become spaces. */
			multiline?: boolean;
	  }
	| { kind: "enum"; values: readonly string[] }
	| { kind: "int"; min: number; max: number }
	| { kind: "date" }
	| { kind: "time" }
	| { kind: "custom"; parse: (raw: string) => string };

export type UrlSchema = Record<string, FieldSpec>;

type ValueOf<S extends FieldSpec> = S extends {
	kind: "enum";
	values: readonly (infer V)[];
}
	? V | ""
	: string;

export type UrlValues<S extends UrlSchema> = { [K in keyof S]: ValueOf<S[K]> };

/** Raw parameters are cut before cleaning so a huge URL costs nothing. */
const RAW_LIMIT = 4000;
// C0/C1 controls (except tab and line breaks), bidi overrides and isolates,
// zero-width characters: never useful in a form field, and a way to disguise text.
function isUnsafe(code: number): boolean {
	return (
		code <= 0x08 ||
		code === 0x0b ||
		code === 0x0c ||
		(code >= 0x0e && code <= 0x1f) ||
		(code >= 0x7f && code <= 0x9f) ||
		(code >= 0x200b && code <= 0x200f) ||
		(code >= 0x202a && code <= 0x202e) ||
		(code >= 0x2060 && code <= 0x2069) ||
		code === 0xfeff
	);
}

/** Cleans free text: unsafe characters out, NFC, capped length. */
export function cleanText(raw: string, max: number, multiline = false): string {
	let text = Array.from(raw.slice(0, RAW_LIMIT).normalize("NFC"))
		.filter((char) => !isUnsafe(char.codePointAt(0) ?? 0))
		.join("");
	text = multiline
		? text.replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n")
		: text.replace(/[\r\n\t]+/g, " ");
	const chars = Array.from(text);
	return chars.length > max ? chars.slice(0, max).join("") : text;
}

/** Whitelisted value, or "" (case-insensitive match, canonical spelling out). */
export function pickEnum<V extends string>(
	raw: string,
	values: readonly V[],
): V | "" {
	const wanted = raw.trim().toLowerCase();
	return values.find((value) => value.toLowerCase() === wanted) ?? "";
}

/** Whole number inside [min, max], as a string; "" when not one. */
export function cleanInt(raw: string, min: number, max: number): string {
	const text = raw.trim();
	if (!/^\d{1,9}$/.test(text)) return "";
	const value = Number(text);
	return value >= min && value <= max ? String(value) : "";
}

/** Real calendar date as YYYY-MM-DD (years 2000-2100); "" otherwise. */
export function cleanDate(raw: string): string {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
	if (!match) return "";
	const [year, month, day] = match.slice(1).map(Number);
	if (year < 2000 || year > 2100) return "";
	const date = new Date(Date.UTC(year, month - 1, day));
	return date.getUTCMonth() === month - 1 && date.getUTCDate() === day
		? match[0]
		: "";
}

/** 24-hour time as HH:MM ("8:30" becomes "08:30"); "" otherwise. */
export function cleanTime(raw: string): string {
	const match = /^(\d{1,2}):(\d{2})$/.exec(raw.trim());
	if (!match) return "";
	const hours = Number(match[1]);
	const minutes = Number(match[2]);
	if (hours > 23 || minutes > 59) return "";
	return `${String(hours).padStart(2, "0")}:${match[2]}`;
}

export function cleanValue(spec: FieldSpec, raw: string): string {
	switch (spec.kind) {
		case "text":
			return cleanText(raw, spec.max, spec.multiline);
		case "enum":
			return pickEnum(raw, spec.values);
		case "int":
			return cleanInt(raw, spec.min, spec.max);
		case "date":
			return cleanDate(raw);
		case "time":
			return cleanTime(raw);
		case "custom":
			return spec.parse(raw.slice(0, RAW_LIMIT));
	}
}

function toParams(search: string | URLSearchParams): URLSearchParams {
	return typeof search === "string" ? new URLSearchParams(search) : search;
}

/** Reads every field of the schema; missing or invalid ones come back as "". */
export function parseParams<S extends UrlSchema>(
	schema: S,
	search: string | URLSearchParams,
): UrlValues<S> {
	const params = toParams(search);
	const values: Record<string, string> = {};
	for (const [key, spec] of Object.entries(schema)) {
		const raw = params.get(key);
		values[key] = raw === null ? "" : cleanValue(spec, raw);
	}
	return values as UrlValues<S>;
}

/**
 * Writes the schema fields over `base` (other parameters are kept). Empty
 * values are removed so the URL stays short. Returns "?a=b" or "".
 */
export function serializeParams<S extends UrlSchema>(
	schema: S,
	values: Partial<UrlValues<S>>,
	base: string | URLSearchParams = "",
): string {
	const params = new URLSearchParams(toParams(base));
	for (const [key, spec] of Object.entries(schema)) {
		if (!(key in values)) continue;
		const raw = (values as Record<string, string | undefined>)[key] ?? "";
		const clean = cleanValue(spec, raw);
		if (clean.trim() === "") params.delete(key);
		else params.set(key, clean);
	}
	const text = params.toString();
	return text ? `?${text}` : "";
}

/** Fields that came with a value: the ones a link or the assistant suggested. */
export function prefilledKeys<S extends UrlSchema>(
	values: UrlValues<S>,
): Set<keyof S> {
	return new Set(
		(Object.keys(values) as (keyof S)[]).filter(
			(key) => String(values[key]).trim() !== "",
		),
	);
}
