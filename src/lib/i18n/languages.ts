// The languages of the app interface: the four the project works in so far.

export const LANGUAGES = ["es", "en", "pt", "fr"] as const;
export type Language = (typeof LANGUAGES)[number];

export const DEFAULT_LANGUAGE: Language = "es";

/** Where the person's choice is kept; the layout reads it before first paint. */
export const LANGUAGE_STORAGE_KEY = "quillart-lang";

/** Each language written in itself, so anyone can find theirs. */
export const LANGUAGE_NAMES: Record<Language, string> = {
	es: "Español",
	en: "English",
	pt: "Português",
	fr: "Français",
};

/** BCP 47 tags for speech recognition and synthesis. */
export const VOICE_LOCALES: Record<Language, string> = {
	es: "es-CO",
	en: "en-US",
	pt: "pt-BR",
	fr: "fr-FR",
};

export function isLanguage(value: unknown): value is Language {
	return (
		typeof value === "string" &&
		(LANGUAGES as readonly string[]).includes(value)
	);
}
