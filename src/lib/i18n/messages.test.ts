import { describe, expect, it } from "vitest";
import {
	isLanguage,
	LANGUAGE_NAMES,
	LANGUAGES,
	VOICE_LOCALES,
} from "./languages";
import { messages } from "./messages";

function keyPaths(value: unknown, prefix = ""): string[] {
	if (Array.isArray(value)) return [`${prefix}[${value.length}]`];
	if (value && typeof value === "object") {
		return Object.entries(value).flatMap(([key, child]) =>
			keyPaths(child, prefix ? `${prefix}.${key}` : key),
		);
	}
	return [prefix];
}

describe("interface languages", () => {
	it("offers Spanish, English, Portuguese and French", () => {
		expect([...LANGUAGES]).toEqual(["es", "en", "pt", "fr"]);
		for (const language of LANGUAGES) {
			expect(LANGUAGE_NAMES[language]).toBeTruthy();
			expect(VOICE_LOCALES[language].startsWith(language)).toBe(true);
		}
	});

	it("only accepts the supported language codes", () => {
		expect(isLanguage("fr")).toBe(true);
		expect(isLanguage("de")).toBe(false);
		expect(isLanguage(null)).toBe(false);
	});

	it("has the same keys (and the same number of starters) in every language", () => {
		const reference = keyPaths(messages.es);
		for (const language of LANGUAGES) {
			expect(keyPaths(messages[language])).toEqual(reference);
		}
	});

	it("has no empty text in any language", () => {
		for (const language of LANGUAGES) {
			const texts = JSON.stringify(messages[language]);
			expect(texts).not.toContain('""');
		}
	});
});
