import { describe, expect, it } from "vitest";
import type {
	AssistantMessage,
	AssistantToolResult,
} from "../assistant/assistant-types";
import {
	liveHistoryTurns,
	toFunctionResponses,
	toLiveToolCalls,
} from "./live-tool-calls";

describe("toLiveToolCalls", () => {
	it("keeps the Live call id and sanitizes the arguments with the tool schema", () => {
		const { accepted, rejected } = toLiveToolCalls("agenda", [
			{
				id: "c1",
				name: "search_events",
				args: { query: "  salsa ", unknown: "x" },
			},
		]);
		expect(accepted).toEqual([
			{ id: "c1", name: "search_events", args: { query: "salsa" } },
		]);
		expect(rejected).toEqual([]);
	});

	it("rejects tools outside the agent and invalid arguments with an error response", () => {
		const { accepted, rejected } = toLiveToolCalls("agenda", [
			{ id: "c1", name: "create_thread", args: { title: "a", body: "b" } },
			{ id: "c2", name: "get_event", args: {} },
		]);
		expect(accepted).toEqual([]);
		expect(rejected.map((item) => item.id)).toEqual(["c1", "c2"]);
		expect(rejected[0].response).toHaveProperty("error");
		expect(rejected[0].name).toBe("create_thread");
	});

	it("keeps only one action per turn and answers the extra ones as not done", () => {
		const { accepted, rejected } = toLiveToolCalls("agenda", [
			{ id: "a1", name: "register_for_event", args: { event_id: "e1" } },
			{ id: "a2", name: "register_for_event", args: { event_id: "e2" } },
			{ id: "r1", name: "search_events", args: {} },
		]);
		expect(accepted.map((call) => call.id)).toEqual(["a1", "r1"]);
		expect(rejected.map((item) => item.id)).toEqual(["a2"]);
	});

	it("gives calls without an id a stable one so the response can match", () => {
		const { accepted } = toLiveToolCalls("agenda", [
			{ name: "search_events", args: {} },
		]);
		expect(accepted[0].id).toBe("live-call-0");
	});
});

describe("toFunctionResponses", () => {
	it("sends the compact summary as output, or as error when declined", () => {
		const results: AssistantToolResult[] = [
			{
				callId: "c1",
				name: "search_events",
				summary: { events: [] },
				display: { kind: "notice", tone: "ok", text: "x" },
			},
			{
				callId: "c2",
				name: "register_for_event",
				summary: { declined: true },
				declined: true,
			},
		];
		expect(toFunctionResponses(results)).toEqual([
			{ id: "c1", name: "search_events", response: { output: { events: [] } } },
			{
				id: "c2",
				name: "register_for_event",
				response: { error: { declined: true } },
			},
		]);
	});
});

describe("liveHistoryTurns", () => {
	it("replays only the text of recent turns, never tool calls or results", () => {
		const messages: AssistantMessage[] = [
			{ role: "user", text: "Planes hoy" },
			{
				role: "assistant",
				agent: "agenda",
				text: "Mira estos",
				toolCalls: [{ id: "1", name: "search_events", args: {} }],
			},
			{
				role: "tool",
				results: [{ callId: "1", name: "search_events", summary: {} }],
			},
			{ role: "assistant", agent: "agenda", text: "  ", toolCalls: [] },
		];
		expect(liveHistoryTurns(messages)).toEqual([
			{ role: "user", parts: [{ text: "Planes hoy" }] },
			{ role: "model", parts: [{ text: "Mira estos" }] },
		]);
	});

	it("keeps at most the last turns asked for", () => {
		const messages: AssistantMessage[] = Array.from({ length: 5 }, (_, i) => ({
			role: "user" as const,
			text: `m${i}`,
		}));
		expect(liveHistoryTurns(messages, 2).map((turn) => turn.parts)).toEqual([
			[{ text: "m3" }],
			[{ text: "m4" }],
		]);
	});
});
