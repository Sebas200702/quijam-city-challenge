import { describe, expect, it } from "vitest";
import type { AssistantMessage } from "../assistant/assistant-types";
import {
	ASK_QUILLART_DECLARATION,
	ASK_QUILLART_TOOL,
	conduitResponse,
	conduitResultOf,
	confirmedActionNote,
	MAX_CONDUIT_REQUEST,
	toConduitCalls,
} from "./live-conduit";

describe("ASK_QUILLART_DECLARATION", () => {
	it("declares ask_quillart with a single required string request", () => {
		expect(ASK_QUILLART_DECLARATION.name).toBe(ASK_QUILLART_TOOL);
		expect(ASK_QUILLART_DECLARATION.parametersJsonSchema).toMatchObject({
			type: "object",
			properties: { request: { type: "string" } },
			required: ["request"],
		});
	});

	it("names every capability and forbids prices from memory", () => {
		const description = ASK_QUILLART_DECLARATION.description ?? "";
		for (const topic of [
			/fares/i,
			/events/i,
			/places/i,
			/forum/i,
			/reports/i,
			/account/i,
			/news/i,
			/open data/i,
			/historical/i,
			/synthetic/i,
			/indicators/i,
			/crowd simulation/i,
		]) {
			expect(description).toMatch(topic);
		}
		expect(description).toMatch(/never answer those from memory/i);
	});
});

describe("toConduitCalls", () => {
	it("turns ask_quillart calls into trimmed requests", () => {
		const { requests, rejected } = toConduitCalls([
			{
				id: "c1",
				name: "ask_quillart",
				args: { request: "  Plan a route from Prado to the Malecón  " },
			},
		]);
		expect(requests).toEqual([
			{ id: "c1", request: "Plan a route from Prado to the Malecón" },
		]);
		expect(rejected).toEqual([]);
	});

	it("rejects any other tool, pointing back to ask_quillart", () => {
		const { requests, rejected } = toConduitCalls([
			{ id: "c2", name: "plan_route", args: { from: "a", to: "b" } },
		]);
		expect(requests).toEqual([]);
		expect(rejected).toHaveLength(1);
		expect(rejected[0]?.id).toBe("c2");
		expect(rejected[0]?.name).toBe("plan_route");
		expect(JSON.stringify(rejected[0]?.response)).toContain("ask_quillart");
	});

	it("rejects a missing or empty request", () => {
		const { requests, rejected } = toConduitCalls([
			{ id: "c3", name: "ask_quillart", args: {} },
			{ id: "c4", name: "ask_quillart", args: { request: "   " } },
			{ id: "c5", name: "ask_quillart", args: { request: 42 } },
		]);
		expect(requests).toEqual([]);
		expect(rejected.map((item) => item.id)).toEqual(["c3", "c4", "c5"]);
		expect(rejected[0]?.response).toHaveProperty("error");
	});

	it("gives an id to calls without one and caps the request length", () => {
		const { requests } = toConduitCalls([
			{ name: "ask_quillart", args: { request: "x".repeat(5000) } },
		]);
		expect(requests[0]?.id).toBe("live-call-0");
		expect(requests[0]?.request).toHaveLength(MAX_CONDUIT_REQUEST);
	});

	it("handles no calls", () => {
		expect(toConduitCalls(undefined)).toEqual({ requests: [], rejected: [] });
	});
});

describe("conduitResultOf", () => {
	const added: AssistantMessage[] = [
		{
			role: "assistant",
			agent: "mobility",
			text: "Toma el bus A.",
			toolCalls: [],
		},
		{ role: "tool", results: [] },
		{
			role: "assistant",
			agent: "mobility",
			text: " Llega en 20 min. ",
			toolCalls: [],
		},
	];

	it("joins the assistant replies and keeps the last agent", () => {
		expect(conduitResultOf(added, null)).toEqual({
			reply: "Toma el bus A.\nLlega en 20 min.",
			agent: "mobility",
			confirmationWaiting: false,
		});
	});

	it("reports a waiting confirmation card from the text pipeline", () => {
		expect(
			conduitResultOf(added, { remaining: [{}], live: false })
				.confirmationWaiting,
		).toBe(true);
		expect(conduitResultOf(added, { remaining: [] }).confirmationWaiting).toBe(
			false,
		);
		expect(
			conduitResultOf(added, { remaining: [{}], live: true })
				.confirmationWaiting,
		).toBe(false);
	});

	it("has no agent when nothing answered", () => {
		expect(conduitResultOf([], null)).toEqual({
			reply: "",
			agent: null,
			confirmationWaiting: false,
		});
	});
});

describe("conduitResponse", () => {
	it("sends the reply and the confirmation state as output", () => {
		const response = conduitResponse("c1", {
			reply: "Te inscribo al evento.",
			agent: "agenda",
			confirmationWaiting: true,
		});
		expect(response).toMatchObject({
			id: "c1",
			name: "ask_quillart",
			response: {
				output: { reply: "Te inscribo al evento.", confirmationWaiting: true },
			},
		});
		expect(JSON.stringify(response.response)).toMatch(/Confirm/);
	});

	it("leaves out the card note when nothing waits", () => {
		const response = conduitResponse("c1", {
			reply: "Hay 3 eventos hoy.",
			agent: "agenda",
			confirmationWaiting: false,
		});
		expect(response.response).toEqual({
			output: { reply: "Hay 3 eventos hoy.", confirmationWaiting: false },
		});
	});

	it("answers with an error when the pipeline could not answer", () => {
		expect(conduitResponse("c9", null).response).toHaveProperty("error");
	});
});

describe("confirmedActionNote (S4)", () => {
	it("tells Live the outcome of an action confirmed later on the card", () => {
		const note = confirmedActionNote(
			[
				{ role: "user", text: "inscríbeme" },
				{
					role: "assistant",
					agent: "agenda",
					text: "Confírmame abajo.",
					toolCalls: [
						{ id: "c1", name: "register_for_event", args: { event_id: "e1" } },
					],
				},
				{
					role: "tool",
					results: [
						{ callId: "c1", name: "register_for_event", summary: { ok: true } },
					],
				},
				{
					role: "assistant",
					agent: "agenda",
					text: "¡Listo! Quedaste inscrito.",
					toolCalls: [],
				},
			],
			"c1",
		);
		expect(note).toMatch(/confirmed/);
		expect(note).toMatch(/¡Listo! Quedaste inscrito\./);
		expect(confirmedActionNote([], "c1")).toBeNull();
	});
});
