// The languages of the app interface: the four the project works in so far.
// The language itself (its type, where it is saved, the browser detection and the
// change event) lives in src/lib/home-content-language.ts, shared with the visitor
// shell; this file only adds what the translated pages need on top.

import {
	DEFAULT_LANGUAGE,
	isVisitorLanguage,
	LANGUAGE_STORAGE_KEY,
	VISITOR_LANGUAGES,
} from "../home-content-language";
import type { VisitorLanguage } from "../home-content-types";

export type Language = VisitorLanguage;

export { DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY };

export const LANGUAGES: readonly Language[] = VISITOR_LANGUAGES.map(
	(language) => language.code,
);

/** Each language written in itself, so anyone can find theirs. */
export const LANGUAGE_NAMES: Record<Language, string> = Object.fromEntries(
	VISITOR_LANGUAGES.map((language) => [language.code, language.name]),
) as Record<Language, string>;

/** BCP 47 tags for speech recognition and synthesis. */
export const VOICE_LOCALES: Record<Language, string> = {
	es: "es-CO",
	en: "en-US",
	pt: "pt-BR",
	fr: "fr-FR",
};

export const isLanguage = isVisitorLanguage;
