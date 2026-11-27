// Helpers around the Guide's answer: coastal slang glossed inline in the
// answer's language, and the local "what does <slang> mean?" answer. The text of
// the cards around the answer (panel, trip card, report form) lives in the
// interface dictionary (src/lib/i18n/dictionaries/guide.ts) and follows the
// interface language; the language the Guide ANSWERS in is detected from the
// question.

import {
	detectLanguage,
	GUIDE_LANGUAGES,
	type GuideLanguage,
} from "../../lib/guide/guide-local";

/** Panel language from the browser: the visitor never has to pick it. */
export function browserLanguage(): GuideLanguage {
	if (typeof navigator === "undefined") return "es";
	const code = navigator.language.slice(0, 2).toLowerCase();
	return GUIDE_LANGUAGES.includes(code as GuideLanguage)
		? (code as GuideLanguage)
		: "en";
}

// ── Coastal slang ──
// The Guide may use local words; we gloss them inline, in the visitor's
// language, so nobody is left out. Same terms as the slang sheet mockup.

interface SlangTerm {
	term: string;
	/** Lower case spellings, without accents. */
	spellings: string[];
	gloss: Record<GuideLanguage, string>;
}

const SLANG: SlangTerm[] = [
	{
		term: "ajá",
		spellings: ["aja"],
		gloss: {
			es: "saludo para todo, como «claro» o «¿y qué?»",
			en: "all-purpose greeting, like “sure” or “so?”",
			pt: "saudação para tudo, como “claro” ou “e aí?”",
			fr: "salut passe-partout, comme « bien sûr » ou « alors ? »",
			de: "Gruß für alles, wie „klar“ oder „na?“",
		},
	},
	{
		term: "trancón",
		spellings: ["trancon"],
		gloss: {
			es: "atasco de carros",
			en: "traffic jam",
			pt: "engarrafamento",
			fr: "embouteillage",
			de: "Stau",
		},
	},
	{
		term: "bacano",
		spellings: ["bacano", "bacana"],
		gloss: {
			es: "muy bueno, chévere",
			en: "great, cool",
			pt: "muito legal",
			fr: "génial",
			de: "super, cool",
		},
	},
	{
		term: "mamar gallo",
		spellings: ["mamar gallo", "mamando gallo"],
		gloss: {
			es: "bromear",
			en: "to joke, to tease",
			pt: "brincar, zoar",
			fr: "plaisanter",
			de: "Spaß machen",
		},
	},
	{
		term: "arroyo",
		spellings: ["arroyo", "arroyos"],
		gloss: {
			es: "corriente de agua en la calle cuando llueve; no la cruces",
			en: "street flash flood when it rains; do not cross it",
			pt: "enxurrada na rua quando chove; não atravesse",
			fr: "torrent dans la rue quand il pleut ; ne le traversez pas",
			de: "Sturzflut auf der Straße bei Regen; nicht überqueren",
		},
	},
	{
		term: "pelao",
		spellings: ["pelao", "pelaos"],
		gloss: {
			es: "niño o joven",
			en: "kid, young person",
			pt: "criança, jovem",
			fr: "gamin, jeune",
			de: "Kind, junger Mensch",
		},
	},
	{
		term: "mi llave",
		spellings: ["mi llave"],
		gloss: {
			es: "amigo",
			en: "buddy, friend",
			pt: "amigo, parceiro",
			fr: "pote, ami",
			de: "Kumpel",
		},
	},
];

/** Lower case, no accents, same length as the input (one code unit per letter). */
function fold(text: string): string {
	return Array.from(text, (char) => {
		const plain = char
			.normalize("NFD")
			.replace(/\p{Diacritic}/gu, "")
			.toLowerCase();
		return plain.length === char.length ? plain : char;
	}).join("");
}

function wordPattern(spelling: string, unexplained: boolean): RegExp {
	// Not inside a longer word; optionally not already followed by "(…)".
	const after = unexplained ? "(?!\\s*\\()" : "";
	return new RegExp(`(?<!\\p{L})${spelling}(?!\\p{L})${after}`, "u");
}

/** A piece of an answer; slang pieces carry their gloss. */
export interface GlossedPart {
	text: string;
	gloss?: string;
}

/**
 * Splits an answer so each slang word (first use only) can be shown with its
 * meaning right after it. Words the answer already explains in parentheses
 * are left alone.
 */
export function glossSlang(
	text: string,
	language: GuideLanguage,
): GlossedPart[] {
	const folded = fold(text);
	const hits: { start: number; end: number; gloss: string }[] = [];
	for (const slang of SLANG) {
		for (const spelling of slang.spellings) {
			const match = wordPattern(spelling, true).exec(folded);
			if (match) {
				hits.push({
					start: match.index,
					end: match.index + spelling.length,
					gloss: slang.gloss[language],
				});
				break;
			}
		}
	}
	hits.sort((a, b) => a.start - b.start);
	const parts: GlossedPart[] = [];
	let cursor = 0;
	for (const hit of hits) {
		if (hit.start < cursor) continue;
		if (hit.start > cursor) parts.push({ text: text.slice(cursor, hit.start) });
		parts.push({ text: text.slice(hit.start, hit.end), gloss: hit.gloss });
		cursor = hit.end;
	}
	if (cursor < text.length) parts.push({ text: text.slice(cursor) });
	return parts;
}

// "What does X mean?" in the five languages the Guide speaks.
const MEANING_WORDS: { pattern: RegExp; language: GuideLanguage | null }[] = [
	{ pattern: /\bquer dizer\b/, language: "pt" },
	{ pattern: /\bsignifica\b/, language: null },
	{ pattern: /\bmeans?\b/, language: "en" },
	{ pattern: /\b(veut dire|signifie)\b/, language: "fr" },
	{ pattern: /\bbedeutet\b/, language: "de" },
];

const SLANG_ANSWER: Record<
	GuideLanguage,
	(term: string, gloss: string) => string
> = {
	es: (term, gloss) => `«${term}» es jerga de la costa: ${gloss}.`,
	en: (term, gloss) => `“${term}” is coastal slang: ${gloss}.`,
	pt: (term, gloss) => `“${term}” é gíria da costa: ${gloss}.`,
	fr: (term, gloss) => `« ${term} » est de l'argot de la côte : ${gloss}.`,
	de: (term, gloss) => `„${term}“ ist Küstenslang: ${gloss}.`,
};

/**
 * Answers "what does <slang> mean?" right on the phone, so it works offline.
 * Null when the question is not about a slang word we know.
 */
export function answerSlang(
	question: string,
): { reply: string; language: GuideLanguage } | null {
	const folded = fold(question);
	const asked = MEANING_WORDS.find(({ pattern }) => pattern.test(folded));
	if (!asked) return null;
	const slang = SLANG.find(({ spellings }) =>
		spellings.some((spelling) => wordPattern(spelling, false).test(folded)),
	);
	if (!slang) return null;
	// "significa" is Spanish and Portuguese: trust the detector only for Portuguese.
	const language =
		asked.language ?? (detectLanguage(question) === "pt" ? "pt" : "es");
	return {
		reply: SLANG_ANSWER[language](slang.term, slang.gloss[language]),
		language,
	};
}
