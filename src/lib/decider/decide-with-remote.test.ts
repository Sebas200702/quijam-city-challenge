import { describe, expect, it, vi } from "vitest";
import { decideWithRemote } from "./decide-with-remote";
import type { AsyncChooser, DecisionState, RouteOption } from "./decider-types";

function route(
	overrides: Partial<RouteOption> & Pick<RouteOption, "id">,
): RouteOption {
	return {
		label: overrides.id,
		durationMinutes: 30,
		fareCop: 3500,
		crowdLevel: 0.5,
		accessible: true,
		floodZoneIds: [],
		...overrides,
	};
}

const calm: DecisionState = { activeFloodZoneIds: [], accessibleMode: false };
const transmetro = route({ id: "tm", durationMinutes: 38, fareCop: 3500 });
const taxi = route({
	id: "taxi",
	durationMinutes: 28,
	fareCop: 24000,
	floodZoneIds: ["ARR-MURILLO-46"],
});
const busMix = route({
	id: "bus-mix",
	durationMinutes: 63,
	fareCop: 7000,
	accessible: false,
});

describe("decideWithRemote", () => {
	it("uses the remote chooser when it answers with enough confidence", async () => {
		const remote: AsyncChooser = vi.fn(async () => ({
			optionId: "bus-mix",
			confidence: 0.8,
		}));

		const decision = await decideWithRemote(calm, [transmetro, taxi, busMix], {
			remote,
		});

		expect(decision.option?.id).toBe("bus-mix");
		expect(decision.confidence).toBe(0.8);
		expect(decision.chosenBy).toBe("openjev");
	});

	it("never lets the remote chooser see routes the hard rules discarded", async () => {
		const remote = vi.fn<AsyncChooser>(async (_state, options) => ({
			optionId: options[0].id,
			confidence: 0.9,
		}));
		const flooded: DecisionState = {
			activeFloodZoneIds: ["ARR-MURILLO-46"],
			accessibleMode: true,
		};

		const decision = await decideWithRemote(
			flooded,
			[transmetro, taxi, busMix],
			{ remote },
		);

		const seen = remote.mock.calls[0][1].map((option) => option.id);
		expect(seen).toEqual(["tm"]);
		expect(decision.discarded).toEqual([
			{ optionId: "taxi", reason: "active-flood" },
			{ optionId: "bus-mix", reason: "not-accessible" },
		]);
	});

	it("falls back to the weighted score when the remote chooser fails", async () => {
		const remote: AsyncChooser = async () => null;

		const decision = await decideWithRemote(calm, [transmetro, busMix], {
			remote,
		});

		expect(decision.option?.id).toBe("tm");
		expect(decision.chosenBy).toBe("weighted");
	});

	it("falls back when the remote chooser throws", async () => {
		const remote: AsyncChooser = async () => {
			throw new Error("network down");
		};

		const decision = await decideWithRemote(calm, [transmetro, busMix], {
			remote,
		});

		expect(decision.chosenBy).toBe("weighted");
	});

	it("falls back when the remote confidence is below the minimum", async () => {
		const remote: AsyncChooser = async () => ({
			optionId: "bus-mix",
			confidence: 0.2,
		});

		const decision = await decideWithRemote(calm, [transmetro, busMix], {
			remote,
			minConfidence: 0.35,
		});

		expect(decision.option?.id).toBe("tm");
		expect(decision.chosenBy).toBe("weighted");
	});

	it("falls back when the remote picks an option that is not allowed", async () => {
		const remote: AsyncChooser = async () => ({
			optionId: "taxi",
			confidence: 0.99,
		});
		const flooded: DecisionState = {
			activeFloodZoneIds: ["ARR-MURILLO-46"],
			accessibleMode: false,
		};

		const decision = await decideWithRemote(
			flooded,
			[transmetro, taxi, busMix],
			{ remote },
		);

		expect(decision.option?.id).not.toBe("taxi");
		expect(decision.chosenBy).toBe("weighted");
	});

	it("uses the weighted score when there is no remote chooser", async () => {
		const decision = await decideWithRemote(calm, [transmetro, busMix]);

		expect(decision.option?.id).toBe("tm");
		expect(decision.chosenBy).toBe("weighted");
	});

	it("returns no option when every route is discarded", async () => {
		const remote = vi.fn<AsyncChooser>();
		const decision = await decideWithRemote(
			{ activeFloodZoneIds: ["ARR-MURILLO-46"], accessibleMode: true },
			[taxi, busMix],
			{ remote },
		);

		expect(decision.option).toBeNull();
		expect(decision.confidence).toBe(0);
		expect(decision.chosenBy).toBe("none");
		expect(remote).not.toHaveBeenCalled();
	});
});
