import { describe, expect, it } from "vitest";
import { toolDeclarationsFor } from "../assistant/assistant-agents";
import { AssistantRequestError } from "../assistant/assistant-server";
import type {
	AssistantContext,
	AssistantMessage,
} from "../assistant/assistant-types";
import { systemInstructionFor } from "../assistant/gemini-agent";
import { DEFAULT_AGENT, routeMessage } from "../assistant/orchestrator";
import {
	LIVE_VOICE_RULES,
	liveAgentSetup,
	parseLiveTokenRequest,
	pickLiveAgent,
} from "./live-agent";

const context: AssistantContext = {
	now: "2026-11-27T15:00:00.000Z",
	signedIn: true,
	displayName: "Ana",
	isVisitor: false,
	fromPath: null,
};

describe("liveAgentSetup", () => {
	it("declares exactly the chosen agent's tools, as gemini-agent does", () => {
		const setup = liveAgentSetup("community", context);
		expect(setup.tools).toEqual([
			{ functionDeclarations: toolDeclarationsFor("community") },
		]);
	});

	it("uses the agent's own instruction plus the voice confirmation rules", () => {
		const setup = liveAgentSetup("agenda", context);
		expect(setup.systemInstruction).toContain(
			systemInstructionFor("agenda", context),
		);
		expect(setup.systemInstruction).toContain(LIVE_VOICE_RULES);
		expect(LIVE_VOICE_RULES).toMatch(/confirm/i);
	});
});

describe("parseLiveTokenRequest", () => {
	it("returns null without a body, so the beta Guide keeps working", () => {
		expect(parseLiveTokenRequest(undefined)).toBeNull();
		expect(parseLiveTokenRequest({})).toBeNull();
	});

	it("accepts an empty conversation with a valid context", () => {
		expect(parseLiveTokenRequest({ messages: [], context })).toEqual({
			messages: [],
			context,
			lastAgent: null,
		});
	});

	it("rejects an invalid context", () => {
		expect(() =>
			parseLiveTokenRequest({ messages: [], context: { now: "x" } }),
		).toThrow(AssistantRequestError);
	});

	it("separates the trailing assistant turn and keeps its agent", () => {
		const messages: AssistantMessage[] = [
			{ role: "user", text: "Quiero ver conversaciones del foro" },
			{ role: "assistant", agent: "community", text: "Claro", toolCalls: [] },
		];
		const parsed = parseLiveTokenRequest({ messages, context });
		expect(parsed?.messages).toEqual([messages[0]]);
		expect(parsed?.lastAgent).toBe("community");
	});

	it("rejects an unknown agent in the trailing assistant turn", () => {
		expect(() =>
			parseLiveTokenRequest({
				messages: [
					{ role: "assistant", agent: "admin", text: "", toolCalls: [] },
				],
				context,
			}),
		).toThrow(AssistantRequestError);
	});
});

describe("pickLiveAgent", () => {
	it("uses the default agent before the person says anything", async () => {
		const agent = await pickLiveAgent(
			{ messages: [], context, lastAgent: null },
			{ openJev: null },
		);
		expect(agent).toBe(DEFAULT_AGENT);
	});

	it("keeps the agent that answered last when the person has not spoken since", async () => {
		const agent = await pickLiveAgent(
			{
				messages: [{ role: "user", text: "hola" }],
				context,
				lastAgent: "places",
			},
			{ openJev: null },
		);
		expect(agent).toBe("places");
	});

	it("routes with the same orchestrator as the text chat", async () => {
		const messages: AssistantMessage[] = [
			{
				role: "user",
				text: "Hay un arroyo crecido en mi calle, quiero reportarlo",
			},
		];
		const expected = await routeMessage(messages, context, { openJev: null });
		const agent = await pickLiveAgent(
			{ messages, context, lastAgent: null },
			{ openJev: null },
		);
		expect(agent).toBe(expected.agent);
	});
});
