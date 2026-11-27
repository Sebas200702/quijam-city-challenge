import { describe, expect, it } from "vitest";
import { type RiskReport, reportsToEscalate } from "./corroboration";

const at = (hours: number) =>
	new Date(Date.UTC(2026, 10, 27, 12 + hours)).toISOString();

function report(id: string, overrides: Partial<RiskReport> = {}): RiskReport {
	return {
		id,
		authorId: `person-${id}`,
		placeId: "malecon",
		priority: "city_attention",
		createdAt: at(0),
		resolved: false,
		...overrides,
	};
}

describe("reportsToEscalate", () => {
	it("raises the whole group when three different people report the same place", () => {
		const seed = report("c");
		expect(reportsToEscalate(seed, [report("a"), report("b")]).sort()).toEqual([
			"a",
			"b",
			"c",
		]);
	});

	it("does nothing with fewer than three different people", () => {
		expect(reportsToEscalate(report("b"), [report("a")])).toEqual([]);
		// Two reports by the same person count once.
		const same = [
			report("a", { authorId: "x" }),
			report("b", { authorId: "x" }),
		];
		expect(reportsToEscalate(report("c", { authorId: "y" }), same)).toEqual([]);
	});

	it("ignores other places, reports far apart in time, attended and anonymous ones", () => {
		const seed = report("d");
		const others = [
			report("a", { placeId: "estadio" }),
			report("b", { createdAt: at(-7) }),
			report("c", { resolved: true }),
			report("e", { authorId: null }),
		];
		expect(reportsToEscalate(seed, others)).toEqual([]);
	});

	it("does not touch reports already in emergency, and needs a place", () => {
		const others = [report("a", { priority: "emergency" }), report("b")];
		expect(reportsToEscalate(report("c"), others).sort()).toEqual(["b", "c"]);
		expect(
			reportsToEscalate(report("c", { placeId: null }), [
				report("a"),
				report("b"),
			]),
		).toEqual([]);
	});
});
