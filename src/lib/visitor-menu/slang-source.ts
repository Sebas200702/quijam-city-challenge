import type { SlangEntry } from "./visitor-menu-types";

/**
 * Curated costeño slang glossary (real expressions, written by the team).
 * Issue #48 may move it to the server; then only `loadSlangEntries` changes.
 */
const SLANG_GLOSSARY: SlangEntry[] = [
	{
		id: "aja",
		term: "¡Ajá!",
		meaningEs: "Saludo o asentimiento para todo: «¿y qué más?», «claro».",
		meaningEn: "All-purpose greeting or agreement: “what's up?”, “sure”.",
		example: "¡Ajá! ¿Y qué más, mi llave?",
	},
	{
		id: "trancon",
		term: "Trancón",
		meaningEs: "Atasco de tráfico.",
		meaningEn: "Traffic jam.",
		example: "Hay trancón en la Vía 40.",
	},
	{
		id: "bacano",
		term: "Bacano",
		meaningEs: "Muy bueno, chévere.",
		meaningEn: "Great, cool.",
		example: "El Malecón está bacano.",
	},
	{
		id: "mamar-gallo",
		term: "Mamar gallo",
		meaningEs: "Bromear, tomar del pelo.",
		meaningEn: "To joke around, to pull someone's leg.",
		example: "Tranquilo, te estoy mamando gallo.",
	},
	{
		id: "arroyo",
		term: "Arroyo",
		meaningEs:
			"Corriente de agua en la calle durante un aguacero. Peligroso: no lo cruces.",
		meaningEn:
			"Flash flood running down the street in heavy rain. Dangerous: never cross it.",
		example: "Cayó un aguacero y se metió el arroyo.",
	},
	{
		id: "pelao",
		term: "Pelao",
		meaningEs: "Niño o persona joven.",
		meaningEn: "Kid or young person.",
		example: "Ese pelao habla inglés.",
	},
	{
		id: "mi-llave",
		term: "Mi llave",
		meaningEs: "Amigo, compañero.",
		meaningEn: "Buddy, mate.",
		example: "Gracias, mi llave.",
	},
	{
		id: "eche",
		term: "¡Eche!",
		meaningEs: "Expresión de sorpresa.",
		meaningEn: "Expression of surprise, like “wow!”.",
		example: "¡Eche, qué calor!",
	},
	{
		id: "bololo",
		term: "Bololó",
		meaningEs: "Desorden o pelea con mucha gente.",
		meaningEn: "Commotion or brawl with a lot of people.",
		example: "Se armó un bololó a la salida del estadio.",
	},
	{
		id: "vaina",
		term: "Vaina",
		meaningEs: "Cualquier cosa o asunto. Sirve para todo.",
		meaningEn: "Any thing or matter; a catch-all word.",
		example: "Pásame esa vaina, porfa.",
	},
];

/**
 * The glossary's terms, read synchronously: the assistant uses them to tell a
 * slang question ("¿qué significa bacano?") from any other question.
 */
export const SLANG_TERMS: readonly string[] = SLANG_GLOSSARY.map(
	(entry) => entry.term,
);

export async function loadSlangEntries(): Promise<SlangEntry[]> {
	return structuredClone(SLANG_GLOSSARY);
}
