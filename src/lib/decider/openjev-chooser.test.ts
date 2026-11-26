import { describe, expect, it, vi } from "vitest";
import type { DecisionResult, OpenJevClient } from "../openjev/openjev-types";
import type { RouteOption } from "./decider-types";
import { createOpenJevChooser } from "./openjev-chooser";

const options: RouteOption[] = [
	{
		id: "tm",
		label: "Transmetro directo",
		durationMinutes: 38,
		fareCop: 3500,
		crowdLevel: 0.4,
		accessible: true,
		floodZoneIds: [],
	},
	{
		id: "taxi",
		label: "Taxi verificado",
		durationMinutes: 28,
		fareCop: 24000,
		crowdLevel: 0.7,
		accessible: true,
		floodZoneIds: [],
	},
];

function clientReturning(result: DecisionResult): OpenJevClient {
	return { decide: vi.fn(async () => result) };
}

describe("createOpenJevChooser", () => {
	it("asks one choice question with every allowed route and returns the pick", async () => {
		const client = clientReturning({
			ok: true,
			model: "openjev-0.1",
			inputTokens: 200,
			answers: {
				route: {
					type: "choice",
					choice: "tm",
					probabilities: { tm: 0.9, taxi: 0.1 },
					confidence: 0.6,
				},
			},
		});
		const chooser = createOpenJevChooser(client);

		const result = await chooser(
			{ activeFloodZoneIds: [], accessibleMode: false },
			options,
		);

		expect(result).toEqual({ optionId: "tm", confidence: 0.6 });
		const [, questions] = (client.decide as ReturnType<typeof vi.fn>).mock
			.calls[0];
		expect(questions.route.type).toBe("choice");
		expect(Object.keys(questions.route.criteria)).toEqual(["tm", "taxi"]);
		expect(questions.route.criteria.tm).toContain("38 min");
	});

	it("returns null when the API fails", async () => {
		const chooser = createOpenJevChooser(
			clientReturning({ ok: false, reason: "timeout" }),
		);

		const result = await chooser(
			{ activeFloodZoneIds: [], accessibleMode: false },
			options,
		);

		expect(result).toBeNull();
	});

	it("returns null when the answer is not a choice", async () => {
		const chooser = createOpenJevChooser(
			clientReturning({
				ok: true,
				model: "openjev-0.1",
				inputTokens: 10,
				answers: { route: { type: "noul", noul: 0.4 } },
			}),
		);

		const result = await chooser(
			{ activeFloodZoneIds: [], accessibleMode: false },
			options,
		);

		expect(result).toBeNull();
	});
});
