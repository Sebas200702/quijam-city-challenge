// Text written by other people (event titles and descriptions, forum titles,
// organizer names, place text) reaches the model inside tool results. It is
// DATA, never instructions: every such field goes to the model wrapped in an
// explicit envelope, cleaned of control characters and cut short.

/** Envelope key the agent instructions tell the model to treat as data. */
export const UNTRUSTED_KEY = "untrusted_text";

/** Default length for long user text (descriptions, bodies) in summaries. */
export const UNTRUSTED_BODY_MAX = 280;
/** Default length for short user text (titles, names, locations). */
export const UNTRUSTED_TITLE_MAX = 120;

export interface UntrustedText {
	untrusted_text: string;
	/** Present when the original text was longer than the limit. */
	truncated?: true;
}

// C0/C1 controls (except tab and newline), zero-width characters and bidi
// overrides that could hide or reorder text. Code point ranges, inclusive.
const HIDDEN_RANGES: readonly [number, number][] = [
	[0x00, 0x08],
	[0x0b, 0x1f],
	[0x7f, 0x9f],
	[0x200b, 0x200f],
	[0x202a, 0x202e],
	[0x2060, 0x2064],
	[0x2066, 0x2069],
	[0xfeff, 0xfeff],
];

function isHidden(char: string): boolean {
	const code = char.codePointAt(0) ?? 0;
	return HIDDEN_RANGES.some(([from, to]) => code >= from && code <= to);
}

/** Removes control, zero-width and bidi characters; collapses whitespace. */
export function stripControlChars(text: string): string {
	return text
		.split("")
		.filter((char) => !isHidden(char))
		.join("")
		.replace(/[ \t]+/g, " ")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

/** Wraps user-generated text as data for the model, cleaned and truncated. */
export function untrusted(
	text: string | null | undefined,
	max: number = UNTRUSTED_BODY_MAX,
): UntrustedText | null {
	if (typeof text !== "string") return null;
	const clean = stripControlChars(text);
	if (clean === "") return null;
	if (clean.length <= max) return { untrusted_text: clean };
	return {
		untrusted_text: `${clean.slice(0, Math.max(0, max - 1)).trimEnd()}…`,
		truncated: true,
	};
}

export function isUntrusted(value: unknown): value is UntrustedText {
	return (
		typeof value === "object" &&
		value !== null &&
		!Array.isArray(value) &&
		typeof (value as Record<string, unknown>)[UNTRUSTED_KEY] === "string"
	);
}
