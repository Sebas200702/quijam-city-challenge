import { describe, expect, it } from "vitest";
import { decide } from "./decider";
import type { Chooser, DecisionState, RouteOption } from "./decider-types";
import { applyHardRules } from "./hard-rules";
import { createWeightedChooser } from "./weighted-chooser";

function route(
	overrides: Partial<RouteOption> & Pick<RouteOption, "id">,
): RouteOption {
	return {
		label: overrides.id,
		durationMinutes: 30,
		fareCop: 3000,
		crowdLevel: 0.5,
		accessible: true,
		floodZoneIds: [],
		...overrides,
	};
}

const calm: DecisionState = { activeFloodZoneIds: [], accessibleMode: false };

// Simulated corridor: the fastest route crosses the Calle 84 stream.
const fastThroughStream = route({
	id: "fast-stream",
	durationMinutes: 15,
	fareCop: 2500,
	crowdLevel: 0.2,
	floodZoneIds: ["arroyo-84"],
});
const troncalBus = route({
	id: "troncal",
	durationMinutes: 35,
	fareCop: 3200,
	crowdLevel: 0.6,
});
const stairsShortcut = route({
	id: "stairs",
	durationMinutes: 20,
	fareCop: 0,
	crowdLevel: 0.3,
	accessible: false,
});

describe("applyHardRules", () => {
	it("discards routes crossing an active flood and keeps the rest", () => {
		const { allowed, discarded } = applyHardRules(
			{ activeFloodZoneIds: ["arroyo-84"], accessibleMode: false },
			[fastThroughStream, troncalBus],
		);
		expect(allowed.map((option) => option.id)).toEqual(["troncal"]);
		expect(discarded).toEqual([
			{ optionId: "fast-stream", reason: "active-flood" },
		]);
	});

	it("keeps flood-prone routes when their zone has no active alert", () => {
		const { allowed } = applyHardRules(
			{ activeFloodZoneIds: ["arroyo-other"], accessibleMode: false },
			[fastThroughStream],
		);
		expect(allowed).toHaveLength(1);
	});

	it("discards non-accessible routes only in accessible mode", () => {
		expect(applyHardRules(calm, [stairsShortcut]).allowed).toHaveLength(1);
		expect(
			applyHardRules({ ...calm, accessibleMode: true }, [stairsShortcut])
				.discarded,
		).toEqual([{ optionId: "stairs", reason: "not-accessible" }]);
	});
});

describe("decide", () => {
	it("never returns a route with an active flood, even when it scores best", () => {
		const decision = decide(
			{ activeFloodZoneIds: ["arroyo-84"], accessibleMode: false },
			[fastThroughStream, troncalBus],
		);
		expect(decision.option?.id).toBe("troncal");
	});

	it("never returns a flooded route even if the chooser asks for it", () => {
		const unsafeChooser: Chooser = () => ({
			optionId: "fast-stream",
			confidence: 0.99,
		});
		const decision = decide(
			{ activeFloodZoneIds: ["arroyo-84"], accessibleMode: false },
			[fastThroughStream, troncalBus],
			unsafeChooser,
		);
		expect(decision.option?.id).toBe("troncal");
	});

	it("in accessible mode discards non-accessible routes", () => {
		const decision = decide({ ...calm, accessibleMode: true }, [
			stairsShortcut,
			troncalBus,
		]);
		expect(decision.option?.id).toBe("troncal");
		expect(decision.discarded).toEqual([
			{ optionId: "stairs", reason: "not-accessible" },
		]);
	});

	it("returns no option and zero confidence when every route is unsafe", () => {
		const decision = decide(
			{ activeFloodZoneIds: ["arroyo-84"], accessibleMode: true },
			[fastThroughStream, stairsShortcut],
		);
		expect(decision.option).toBeNull();
		expect(decision.confidence).toBe(0);
		expect(decision.discarded).toHaveLength(2);
	});

	it("picks the best weighted route when nothing is discarded", () => {
		const decision = decide(calm, [troncalBus, fastThroughStream]);
		expect(decision.option?.id).toBe("fast-stream");
	});

	it("returns full confidence when the winner beats the runner-up on every criterion", () => {
		const decision = decide(calm, [troncalBus, fastThroughStream]);
		expect(decision.confidence).toBe(1);
	});

	it("returns 0.5 confidence on a tie", () => {
		const decision = decide(calm, [route({ id: "a" }), route({ id: "b" })]);
		expect(decision.confidence).toBe(0.5);
	});

	it("returns full confidence with a single safe option", () => {
		expect(decide(calm, [troncalBus]).confidence).toBe(1);
	});

	it("always returns confidence between 0 and 1", () => {
		const wildChooser: Chooser = () => ({ optionId: "troncal", confidence: 7 });
		expect(decide(calm, [troncalBus], wildChooser).confidence).toBe(1);
	});

	it("falls back to the weighted score when the chooser throws", () => {
		const brokenChooser: Chooser = () => {
			throw new Error("OpenJev is not running");
		};
		const decision = decide(
			calm,
			[troncalBus, fastThroughStream],
			brokenChooser,
		);
		expect(decision.option?.id).toBe("fast-stream");
	});

	it("respects custom weights", () => {
		const cheapFirst = createWeightedChooser({
			duration: 0,
			fare: 1,
			crowd: 0,
		});
		const decision = decide(
			calm,
			[fastThroughStream, stairsShortcut],
			cheapFirst,
		);
		expect(decision.option?.id).toBe("stairs");
	});
});
