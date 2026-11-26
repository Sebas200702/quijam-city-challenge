// Small text helpers shared by the orchestrator and the local agents:
// accent-insensitive matching and place lookup in the public catalog.

import type { Place } from "../community/community-types";
import { PLACES } from "../community/places-catalog";

/** Lower case, no accents, single spaces, only letters and digits: " hola mundo ". */
export function normalizeText(text: string): string {
	const plain = text
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase()
		.replace(/[^a-z0-9ñ]+/g, " ")
		.trim();
	return ` ${plain} `;
}

/**
 * True when `normalized` (from normalizeText) contains the keyword. A keyword
 * ending in "*" matches as a prefix ("inscrib*" matches "inscribirme");
 * otherwise it must be a whole word or phrase.
 */
export function hasKeyword(normalized: string, keyword: string): boolean {
	if (keyword.endsWith("*")) {
		return normalized.includes(` ${keyword.slice(0, -1)}`);
	}
	return normalized.includes(` ${keyword} `);
}

export function countKeywords(normalized: string, keywords: string[]): number {
	return keywords.filter((keyword) => hasKeyword(normalized, keyword)).length;
}

export function hasAnyKeyword(normalized: string, keywords: string[]): boolean {
	return keywords.some((keyword) => hasKeyword(normalized, keyword));
}

/** Distinctive words of each catalog place, so "el malecón" finds it. */
const PLACE_KEYWORDS: Record<string, string[]> = {
	"cienaga-de-mallorquin": ["mallorquin", "cienaga", "ecoparque"],
	"gran-malecon": ["malecon"],
	"bocas-de-ceniza": ["bocas de ceniza", "tajamar"],
	"isla-salamanca": ["salamanca"],
	"parque-washington": ["washington"],
	"zoologico-barranquilla": ["zoologico", "zoo"],
	"parque-cultural-del-caribe": ["parque cultural", "museo del caribe"],
	"casa-del-carnaval": ["casa del carnaval"],
	"paseo-bolivar": ["paseo bolivar", "bolivar"],
	"plaza-de-la-paz": ["plaza de la paz", "catedral"],
	"estadio-metropolitano": ["estadio", "metropolitano"],
	"muelle-puerto-colombia": ["muelle", "puerto colombia"],
};

/** First catalog place the text names, or null. */
export function matchPlace(text: string): Place | null {
	const normalized = normalizeText(text);
	for (const place of PLACES) {
		const keywords = PLACE_KEYWORDS[place.slug] ?? [];
		if (hasAnyKeyword(normalized, keywords)) return place;
		if (normalized.includes(normalizeText(place.name))) return place;
	}
	return null;
}
