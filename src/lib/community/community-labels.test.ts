import { afterEach, describe, expect, it, vi } from "vitest";
import type { Language } from "../i18n/languages";

// 2026-11-28 11:00 UTC = Saturday 28 November, 6:00 a. m. in Bogotá.
const ISO = "2026-11-28T11:00:00.000Z";

/** Loads the labels as if the person had chosen `language` in the app. */
async function labelsIn(language: Language) {
	vi.resetModules();
	vi.stubGlobal("window", {});
	vi.stubGlobal("localStorage", {
		getItem: () => language,
		setItem: () => undefined,
	});
	return import("./community-labels");
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("event dates and times follow the interface language", () => {
	it.each([
		["es", /sáb/i, /6:00/],
		["en", /sat/i, /6:00/],
		["pt", /sáb/i, /06:00/],
		["fr", /sam/i, /06:00/],
	] as const)("in %s", async (language, day, time) => {
		const labels = await labelsIn(language);
		const dayText = labels.formatEventDay(ISO);
		expect(dayText).toMatch(day);
		expect(dayText).toMatch(/28/);
		expect(dayText).not.toContain(".");
		expect(labels.formatTime(ISO)).toMatch(time);
		expect(labels.formatEventLongDay(ISO)).toMatch(/28/);
	});

	it("keeps the Spanish phrasing for relative times", async () => {
		const labels = await labelsIn("es");
		const now = new Date("2026-11-28T12:00:00.000Z");
		expect(labels.formatRelative("2026-11-28T11:55:00.000Z", now)).toBe(
			"hace 5 min",
		);
	});

	it("translates relative times in the other languages", async () => {
		const now = new Date("2026-11-28T12:00:00.000Z");
		const fr = await labelsIn("fr");
		expect(fr.formatRelative("2026-11-28T11:55:00.000Z", now)).not.toMatch(
			/hace/,
		);
		const en = await labelsIn("en");
		expect(en.formatRelative("2026-11-28T11:55:00.000Z", now)).toMatch(/ago/);
	});
});
