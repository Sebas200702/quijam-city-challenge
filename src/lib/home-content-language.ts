import type { VisitorLanguage } from "./home-content-types";

/** Where the visitor's choice is remembered on this device. */
export const LANGUAGE_STORAGE_KEY = "quillart-lang";

/** Fired on `window` after the visitor picks a language, so other islands can follow. */
export const LANGUAGE_CHANGE_EVENT = "quillart:language-change";

/** Order of the language sheet: the city's language first. */
export const VISITOR_LANGUAGES: readonly {
	code: VisitorLanguage;
	/** Name in its own language, so anyone can find theirs. */
	name: string;
}[] = [
	{ code: "es", name: "Español" },
	{ code: "en", name: "English" },
	{ code: "pt", name: "Português" },
	{ code: "fr", name: "Français" },
];

export const DEFAULT_LANGUAGE: VisitorLanguage = "es";

export function isVisitorLanguage(value: unknown): value is VisitorLanguage {
	return VISITOR_LANGUAGES.some((language) => language.code === value);
}

export function languageName(code: VisitorLanguage): string {
	return (
		VISITOR_LANGUAGES.find((language) => language.code === code)?.name ?? code
	);
}

/**
 * First supported language among the browser's preferences ("en-US" → "en"),
 * or null when none of them is supported.
 */
export function detectLanguage(
	preferences: readonly string[],
): VisitorLanguage | null {
	for (const tag of preferences) {
		const base = tag.trim().toLowerCase().split("-")[0];
		if (isVisitorLanguage(base)) return base;
	}
	return null;
}

/** The browser's preference list, safe on the server and in old browsers. */
export function browserLanguages(): string[] {
	if (typeof navigator === "undefined") return [];
	if (navigator.languages?.length) return [...navigator.languages];
	return navigator.language ? [navigator.language] : [];
}

export function readSavedLanguage(): VisitorLanguage | null {
	try {
		const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
		return isVisitorLanguage(saved) ? saved : null;
	} catch {
		return null;
	}
}

/**
 * Remembers the choice on this device and tells other islands. `<html lang>` stays "es"
 * while the map and the Guide are Spanish-only; translated parts set their own `lang`.
 */
export function saveLanguage(code: VisitorLanguage) {
	try {
		localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
	} catch {
		// Storage can be blocked (private mode); the change still applies to this visit.
	}
	window.dispatchEvent(
		new CustomEvent(LANGUAGE_CHANGE_EVENT, { detail: { language: code } }),
	);
}
