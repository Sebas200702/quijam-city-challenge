import type { SlangEntry } from "./visitor-menu-types";

/** Lower-case, strip accents and punctuation so "aja" finds "¡Ajá!". */
export function normalizeForSearch(text: string): string {
	return text
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase()
		.replace(/[^\p{Letter}\p{Number}\s]/gu, " ")
		.replace(/\s+/g, " ")
		.trim();
}

/**
 * Entries whose term, Spanish or English meaning contains the query.
 * Matches on the term come first so the expression the visitor typed wins.
 */
export function filterSlang(
	entries: SlangEntry[],
	query: string,
): SlangEntry[] {
	const needle = normalizeForSearch(query);
	if (!needle) return entries;

	const byTerm: SlangEntry[] = [];
	const byMeaning: SlangEntry[] = [];
	for (const entry of entries) {
		if (normalizeForSearch(entry.term).includes(needle)) {
			byTerm.push(entry);
		} else if (
			normalizeForSearch(
				`${entry.meaningEs} ${entry.meaningEn} ${entry.example}`,
			).includes(needle)
		) {
			byMeaning.push(entry);
		}
	}
	return [...byTerm, ...byMeaning];
}
