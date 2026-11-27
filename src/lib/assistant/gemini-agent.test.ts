import { beforeEach, describe, expect, it, vi } from "vitest";
import { AGENTS } from "./assistant-agents";
import type { AssistantContext } from "./assistant-types";
import {
	contextFacts,
	MAX_TOOL_CALLS,
	runGeminiAgent,
	systemInstructionFor,
} from "./gemini-agent";

// A fake SDK: records each request and answers with the queued reply.
const sdk = vi.hoisted(() => ({
	requests: [] as Record<string, unknown>[],
	reply: {} as Record<string, unknown>,
}));
vi.mock("@google/genai", () => ({
	GoogleGenAI: class {
		models = {
			generateContent: async (request: Record<string, unknown>) => {
				sdk.requests.push(request);
				return sdk.reply;
			},
		};
	},
}));

const context: AssistantContext = {
	now: "2026-11-26T15:00:00.000Z",
	signedIn: true,
	displayName: "Ana",
	isVisitor: true,
	fromPath: null,
};

describe("Gemini reply language", () => {
	it.each([
		["es", "Spanish"],
		["en", "English"],
		["pt", "Portuguese"],
		["fr", "French"],
	] as const)("tells the model to answer in %s", (language, name) => {
		expect(systemInstructionFor("agenda", { ...context, language })).toMatch(
			new RegExp(`chose ${name} as their app language: reply in it`),
		);
	});

	it("still answers in the person's language without a chosen one", () => {
		const instruction = systemInstructionFor("agenda", context);
		expect(contextFacts(context)).not.toMatch(/app language/);
		expect(instruction).toMatch(/Spanish, English, Portuguese or French/);
	});
});

describe("runGeminiAgent as the orchestrator", () => {
	const options = { apiKey: "test", model: "test-model" };
	const run = (agent: "agenda" | "mobility") =>
		runGeminiAgent(agent, [{ role: "user", text: "hola" }], context, options);

	beforeEach(() => {
		sdk.requests.length = 0;
	});

	it("declares every tool, whatever agent the request was routed to", async () => {
		sdk.reply = { candidates: [{ content: { parts: [{ text: "Hola" }] } }] };
		await run("agenda");
		const config = sdk.requests[0]?.config as {
			systemInstruction: string;
			tools: { functionDeclarations: { name: string }[] }[];
		};
		const names = config.tools[0].functionDeclarations.map(
			(declaration) => declaration.name,
		);
		expect(names).toEqual([...AGENTS.quillart.tools]);
		expect(names).toEqual(
			expect.arrayContaining(["set_theme", "show_route", "report_issue"]),
		);
		expect(config.systemInstruction).toMatch(
			/routed to the .* \(agenda\) specialist/,
		);
	});

	it("keeps another specialist's tools and UI tools the model calls", async () => {
		sdk.reply = {
			candidates: [{ content: { parts: [] } }],
			functionCalls: [
				{ name: "set_theme", args: { theme: "dark" } },
				{ name: "report_issue", args: { description: "Hueco en la 72" } },
				{ name: "get_news", args: {} },
				{ name: "delete_everything", args: {} },
				{ name: "show_on_map", args: {} },
			],
		};
		const turn = await run("mobility");
		expect(turn.toolCalls).toEqual([
			{ name: "set_theme", args: { theme: "dark" } },
			{ name: "report_issue", args: { description: "Hueco en la 72" } },
			{ name: "get_news", args: {} },
		]);
		expect(turn.text).toBe("");
	});

	it("caps a turn at MAX_TOOL_CALLS", async () => {
		sdk.reply = {
			candidates: [{ content: { parts: [{ text: "Listo" }] } }],
			functionCalls: Array.from({ length: MAX_TOOL_CALLS + 2 }, () => ({
				name: "get_fares",
				args: {},
			})),
		};
		const turn = await run("agenda");
		expect(turn.toolCalls).toHaveLength(MAX_TOOL_CALLS);
	});
});
