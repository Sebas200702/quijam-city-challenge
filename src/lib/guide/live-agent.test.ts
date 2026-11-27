import { describe, expect, it } from "vitest";
import { toolDeclarationsFor } from "../assistant/assistant-agents";
import { AssistantRequestError } from "../assistant/assistant-server";
import type {
	AssistantContext,
	AssistantMessage,
} from "../assistant/assistant-types";
import { contextFacts, systemInstructionFor } from "../assistant/gemini-agent";
import { DEFAULT_AGENT, routeMessage } from "../assistant/orchestrator";
import {
	LIVE_CONDUIT_INSTRUCTION,
	LIVE_VOICE_RULES,
	liveAgentSetup,
	liveConduitAgent,
	liveConduitSetup,
	parseLiveTokenRequest,
	pickLiveAgent,
} from "./live-agent";
import { ASK_QUILLART_DECLARATION, ASK_QUILLART_TOOL } from "./live-conduit";

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

describe("liveConduitSetup", () => {
	it("declares only ask_quillart, never an agent's own tools", () => {
		const setup = liveConduitSetup(context);
		expect(setup.tools).toEqual([
			{ functionDeclarations: [ASK_QUILLART_DECLARATION] },
		]);
		const names = setup.tools.flatMap(
			(tool) => tool.functionDeclarations?.map((item) => item.name) ?? [],
		);
		expect(names).toEqual([ASK_QUILLART_TOOL]);
	});

	it("is the conduit instruction plus the person's context", () => {
		const setup = liveConduitSetup({ ...context, language: "en" });
		expect(setup.systemInstruction).toContain(LIVE_CONDUIT_INSTRUCTION);
		expect(setup.systemInstruction).toContain(
			contextFacts({ ...context, language: "en" }),
		);
		expect(setup.systemInstruction).toContain("English");
	});

	it("tells Live to relay every request, never refuse by role, and wait for the card", () => {
		expect(LIVE_CONDUIT_INSTRUCTION).toContain(ASK_QUILLART_TOOL);
		expect(LIVE_CONDUIT_INSTRUCTION).toMatch(/self-contained/);
		expect(LIVE_CONDUIT_INSTRUCTION).toMatch(/never say you cannot/i);
		expect(LIVE_CONDUIT_INSTRUCTION).toMatch(/confirm/i);
		expect(LIVE_CONDUIT_INSTRUCTION).toMatch(/language/i);
	});

	it("lists every capability, not only the map", () => {
		for (const topic of [
			/events/i,
			/agenda/i,
			/mobility/i,
			/fares/i,
			/places/i,
			/forum/i,
			/reports/i,
			/account/i,
			/news/i,
			/novedades/i,
			/open data/i,
			/historical/i,
			/synthetic/i,
			/indicators/i,
			/crowd simulation/i,
		]) {
			expect(LIVE_CONDUIT_INSTRUCTION).toMatch(topic);
		}
	});

	it("never lets Live state prices from memory", () => {
		expect(LIVE_CONDUIT_INSTRUCTION).toMatch(
			/never state prices, fares, costs or amounts from memory/i,
		);
		expect(LIVE_CONDUIT_INSTRUCTION).toMatch(/even if a similar question/i);
		expect(LIVE_CONDUIT_INSTRUCTION).toMatch(
			/numbers from the tool result exactly/i,
		);
		// Live may still say the current date and time from the context.
		expect(LIVE_CONDUIT_INSTRUCTION).not.toMatch(/never say .*(date|time)/i);
	});
});

describe("liveConduitAgent", () => {
	it("keeps the last agent, or the orchestrator's default", () => {
		expect(
			liveConduitAgent({ messages: [], context, lastAgent: "mobility" }),
		).toBe("mobility");
		expect(liveConduitAgent({ messages: [], context, lastAgent: null })).toBe(
			DEFAULT_AGENT,
		);
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
