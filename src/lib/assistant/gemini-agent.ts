// Runs one specialized agent turn with Gemini function calling. The model only
// sees its own agent's tools; every call it proposes is checked against the
// allow-list and the tool schema before it reaches the browser.

import type { Content, FunctionCall, Part } from "@google/genai";
import {
	type AgentTurn,
	agentInstruction,
	isToolAllowed,
	sanitizeToolArgs,
	type ToolCallDraft,
	toolDeclarationsFor,
} from "./assistant-agents";
import type {
	AssistantAgentId,
	AssistantContext,
	AssistantMessage,
} from "./assistant-types";

/** Alias that follows Google's current Flash model. Override with GEMINI_TEXT_MODEL. */
export const DEFAULT_TEXT_MODEL = "gemini-flash-latest";
export const GEMINI_TIMEOUT_MS = 10_000;
/** At most this many tool calls per turn reach the browser. */
export const MAX_TOOL_CALLS = 4;

/**
 * Replayed function calls were not produced in this request, so they carry no
 * thought signature; Gemini documents this value to skip that validation.
 */
const SKIP_THOUGHT_SIGNATURE = "skip_thought_signature_validator";

export interface GeminiAgentOptions {
	apiKey: string;
	model: string;
	timeoutMs?: number;
}

const bogotaFormat = new Intl.DateTimeFormat("en-US", {
	timeZone: "America/Bogota",
	weekday: "long",
	year: "numeric",
	month: "long",
	day: "numeric",
	hour: "numeric",
	minute: "2-digit",
});

/** Facts about the moment and the person (only their own data). */
export function contextFacts(context: AssistantContext): string {
	const time = Date.parse(context.now);
	const now = Number.isNaN(time) ? new Date() : new Date(time);
	const who =
		context.isVisitor === null
			? "unknown if visitor or resident"
			: context.isVisitor
				? "a visitor"
				: "a Barranquilla resident";
	return [
		"Context:",
		`- Now in Barranquilla (America/Bogota): ${bogotaFormat.format(now)} (${context.now}).`,
		`- Signed in: ${context.signedIn ? "yes" : "no"}.`,
		context.signedIn && context.displayName
			? `- Name: ${context.displayName}.`
			: null,
		`- The person is ${who}.`,
		context.fromPath ? `- Came from the page ${context.fromPath}.` : null,
	]
		.filter(Boolean)
		.join("\n");
}

export function systemInstructionFor(
	agent: AssistantAgentId,
	context: AssistantContext,
): string {
	return `${agentInstruction(agent)}\n\n${contextFacts(context)}`;
}

/** Provider-neutral history to Gemini contents; consecutive same-role turns merge. */
export function toGeminiContents(messages: AssistantMessage[]): Content[] {
	const contents: Content[] = [];
	const push = (role: "user" | "model", parts: Part[]) => {
		if (parts.length === 0) return;
		const last = contents.at(-1);
		if (last?.role === role) last.parts = [...(last.parts ?? []), ...parts];
		else contents.push({ role, parts });
	};
	for (const message of messages) {
		if (message.role === "user") {
			push("user", [{ text: message.text }]);
		} else if (message.role === "assistant") {
			const parts: Part[] = [];
			if (message.text.trim() !== "") parts.push({ text: message.text });
			for (const call of message.toolCalls) {
				parts.push({
					functionCall: {
						id: call.id,
						name: call.name,
						args: call.args as Record<string, unknown>,
					},
					thoughtSignature: SKIP_THOUGHT_SIGNATURE,
				});
			}
			push("model", parts);
		} else {
			push(
				"user",
				message.results.map((result) => ({
					functionResponse: {
						id: result.callId,
						name: result.name,
						// Declined or failed: the summary says why (declined or error).
						response: result.declined
							? { error: result.summary }
							: { output: result.summary },
					},
				})),
			);
		}
	}
	return contents;
}

/** Keeps only calls to the agent's own tools with valid arguments. */
export function sanitizeFunctionCalls(
	agent: AssistantAgentId,
	calls: FunctionCall[] | undefined,
): ToolCallDraft[] {
	const drafts: ToolCallDraft[] = [];
	for (const call of calls ?? []) {
		if (!call.name || !isToolAllowed(agent, call.name)) continue;
		const args = sanitizeToolArgs(call.name, call.args ?? {});
		if (!args) continue;
		drafts.push({ name: call.name, args } as ToolCallDraft);
		if (drafts.length >= MAX_TOOL_CALLS) break;
	}
	return drafts;
}

/** One agent turn with Gemini. Throws on failure so the caller falls back locally. */
export async function runGeminiAgent(
	agent: AssistantAgentId,
	messages: AssistantMessage[],
	context: AssistantContext,
	options: GeminiAgentOptions,
): Promise<AgentTurn> {
	// Loaded here so the local agents and their tests never pull in the SDK.
	const { GoogleGenAI } = await import("@google/genai");
	const timeoutMs = options.timeoutMs ?? GEMINI_TIMEOUT_MS;
	const ai = new GoogleGenAI({
		apiKey: options.apiKey,
		httpOptions: { timeout: timeoutMs },
	});
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	try {
		const response = await ai.models.generateContent({
			model: options.model,
			contents: toGeminiContents(messages),
			config: {
				systemInstruction: systemInstructionFor(agent, context),
				temperature: 0.3,
				tools: [{ functionDeclarations: toolDeclarationsFor(agent) }],
				abortSignal: controller.signal,
			},
		});
		const toolCalls = sanitizeFunctionCalls(agent, response.functionCalls);
		// Read text parts directly: response.text warns when calls are present.
		const text = (response.candidates?.[0]?.content?.parts ?? [])
			.filter((part) => typeof part.text === "string" && !part.thought)
			.map((part) => part.text)
			.join("")
			.trim();
		if (text === "" && toolCalls.length === 0) {
			throw new Error("Gemini returned neither text nor valid tool calls.");
		}
		return { text, toolCalls };
	} finally {
		clearTimeout(timer);
	}
}
