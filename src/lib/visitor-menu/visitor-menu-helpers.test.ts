import { describe, expect, it } from "vitest";
import { parsePassport } from "./passport-source";
import { filterSlang, normalizeForSearch } from "./slang-search";
import { loadSlangEntries } from "./slang-source";

describe("normalizeForSearch", () => {
	it("drops accents, punctuation and case", () => {
		expect(normalizeForSearch("  ¡Ajá!  ")).toBe("aja");
		expect(normalizeForSearch("Trancón")).toBe("trancon");
	});
});

describe("filterSlang", () => {
	it("returns every entry for an empty query", async () => {
		const entries = await loadSlangEntries();
		expect(filterSlang(entries, "   ")).toHaveLength(entries.length);
	});

	it("finds a term without accents", async () => {
		const entries = await loadSlangEntries();
		expect(filterSlang(entries, "trancon").map((e) => e.id)).toEqual([
			"trancon",
		]);
	});

	it("searches meanings in English too, after term matches", async () => {
		const entries = await loadSlangEntries();
		expect(filterSlang(entries, "traffic").map((e) => e.id)).toContain(
			"trancon",
		);
		const results = filterSlang(entries, "llave").map((e) => e.id);
		expect(results[0]).toBe("mi-llave");
		expect(results).toContain("aja");
	});

	it("returns nothing for an unknown word", async () => {
		expect(filterSlang(await loadSlangEntries(), "zzz")).toEqual([]);
	});
});

describe("parsePassport", () => {
	const business = {
		id: "a",
		name: "Arepas La Esquina",
		place: "Centro",
		source: "verified-business",
		collectedAt: "2034-06-14T12:40:00-05:00",
	};

	it("starts empty when nothing is stored or the value is broken", () => {
		expect(parsePassport(null)).toEqual({ stamps: [] });
		expect(parsePassport("{not json")).toEqual({ stamps: [] });
		expect(parsePassport('{"stamps":"x"}')).toEqual({ stamps: [] });
	});

	it("keeps valid stamps and drops malformed ones", () => {
		const raw = JSON.stringify({
			stamps: [business, { id: "b", name: 3 }, { ...business, source: "x" }],
		});
		expect(parsePassport(raw).stamps.map((s) => s.id)).toEqual(["a"]);
	});

	it("only green events keep a reward", () => {
		const raw = JSON.stringify({
			stamps: [
				{ ...business, reward: "termo" },
				{ ...business, id: "g", source: "green-event", reward: "termo" },
			],
		});
		const [shop, green] = parsePassport(raw).stamps;
		expect(shop.reward).toBeUndefined();
		expect(green.reward).toBe("termo");
	});
});
