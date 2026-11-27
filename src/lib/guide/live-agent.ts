// Server side of Gemini Live in the main chat: the same orchestrator picks the
// agent, and the Live session gets that agent's instruction and tools (the
// same declarations the text agent sends to Gemini), locked in the token.

import { AGENT_IDS, toolDeclarationsFor } from "../assistant/assistant-agents";
import {
	AssistantRequestError,
	parseAssistantRequest,
} from "../assistant/assistant-server";
import type {
	AssistantAgentId,
	AssistantContext,
	AssistantMessage,
} from "../assistant/assistant-types";
import { systemInstructionFor } from "../assistant/gemini-agent";
import { DEFAULT_AGENT, routeMessage } from "../assistant/orchestrator";
import type { OpenJevClient } from "../openjev/openjev-types";
import type { LiveAgentSetup } from "./live-token-config";

/** Voice-specific rules on top of the agent's own instruction. */
export const LIVE_VOICE_RULES = [
	"You are speaking out loud in a live voice conversation: keep answers short and natural.",
	"Before calling any action tool (register, cancel, publish, reply, report), say out loud exactly what you will do and ask the person to confirm on the card shown on screen.",
	"An action only happens if the person confirms on that card; if the result says declined, accept it and do not insist.",
].join("\n");

export interface LiveTokenRequest {
	/** Conversation up to the person's last message or tool result. */
	messages: AssistantMessage[];
	context: AssistantContext;
	/** Agent of a trailing assistant turn: the person has not spoken since. */
	lastAgent: AssistantAgentId | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Only used to validate the context of an empty conversation. */
const PLACEHOLDER: AssistantMessage = { role: "user", text: "hola" };

/**
 * Validates the optional token request body. Null means no agent (the beta
 * Guide in /prueba-guia). Throws AssistantRequestError when invalid.
 */
export function parseLiveTokenRequest(body: unknown): LiveTokenRequest | null {
	if (!isRecord(body) || body.context === undefined) return null;
	const raw = body.messages ?? [];
	if (!Array.isArray(raw)) {
		throw new AssistantRequestError("messages must be an array.");
	}
	let end = raw.length;
	let lastAgent: AssistantAgentId | null = null;
	while (
		end > 0 &&
		isRecord(raw[end - 1]) &&
		raw[end - 1].role === "assistant"
	) {
		end -= 1;
		if (lastAgent === null) {
			const agent = raw[end].agent;
			if (!(AGENT_IDS as readonly unknown[]).includes(agent)) {
				throw new AssistantRequestError("The last agent is unknown.");
			}
			lastAgent = agent as AssistantAgentId;
		}
	}
	const messages = raw.slice(0, end);
	const parsed = parseAssistantRequest({
		messages: messages.length > 0 ? messages : [PLACEHOLDER],
		context: body.context,
	});
	return {
		messages: messages.length > 0 ? parsed.messages : [],
		context: parsed.context,
		lastAgent,
	};
}

/** The agent for this Live session, chosen by the same orchestrator as text. */
export async function pickLiveAgent(
	request: LiveTokenRequest,
	deps: { openJev: OpenJevClient | null },
): Promise<AssistantAgentId> {
	if (request.lastAgent) return request.lastAgent;
	if (request.messages.length === 0) return DEFAULT_AGENT;
	const { agent } = await routeMessage(request.messages, request.context, deps);
	return agent;
}

export function liveAgentSetup(
	agent: AssistantAgentId,
	context: AssistantContext,
): LiveAgentSetup {
	return {
		systemInstruction: `${systemInstructionFor(agent, context)}\n\n${LIVE_VOICE_RULES}`,
		tools: [{ functionDeclarations: toolDeclarationsFor(agent) }],
	};
}
