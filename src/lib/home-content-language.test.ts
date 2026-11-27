import { describe, expect, it } from "vitest";
import { VISITOR_SHELL_COPY } from "./home-content-copy";
import {
	detectLanguage,
	isVisitorLanguage,
	languageName,
	VISITOR_LANGUAGES,
} from "./home-content-language";

describe("detectLanguage", () => {
	it("takes the first supported browser preference", () => {
		expect(detectLanguage(["de-DE", "en-US", "es-CO"])).toBe("en");
	});

	it("ignores region and case", () => {
		expect(detectLanguage(["PT-br"])).toBe("pt");
	});

	it("returns null when no preference is supported", () => {
		expect(detectLanguage(["de", "ja"])).toBeNull();
		expect(detectLanguage([])).toBeNull();
	});
});

describe("visitor languages", () => {
	it("lists Spanish first, as the city's language", () => {
		expect(VISITOR_LANGUAGES[0]?.code).toBe("es");
	});

	it("names each language in its own language", () => {
		expect(languageName("fr")).toBe("Français");
	});

	it("rejects unknown codes", () => {
		expect(isVisitorLanguage("de")).toBe(false);
		expect(isVisitorLanguage(null)).toBe(false);
	});

	it("has shell copy for every language", () => {
		for (const { code } of VISITOR_LANGUAGES) {
			expect(VISITOR_SHELL_COPY[code].nextStepAction).toBeTruthy();
		}
	});
});
