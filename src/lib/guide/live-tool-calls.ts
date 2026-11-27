// Turns Gemini Live tool calls into the same AssistantToolCall the text chat
// uses, with the same allow-list, schema check and one-action-per-turn rule,
// and turns the results back into Live function responses.

import type { Content, FunctionCall, FunctionResponse } from "@google/genai";
import {
	isToolAllowed,
	limitActionCalls,
	sanitizeToolArgs,
} from "../assistant/assistant-agents";
import type {
	AssistantAgentId,
	AssistantMessage,
	AssistantToolCall,
	AssistantToolResult,
} from "../assistant/assistant-types";

/** Text turns replayed when a Live session opens on an ongoing conversation. */
export const LIVE_HISTORY_TURNS = 12;

export interface LiveToolCalls {
	/** Calls to run (reads) or to confirm (one action at most). */
	accepted: AssistantToolCall[];
	/** Answered right away with an error; they never run. */
	rejected: FunctionResponse[];
}

function rejection(
	id: string,
	name: string,
	message: string,
): FunctionResponse {
	return { id, name, response: { error: { message } } };
}

export function toLiveToolCalls(
	agent: AssistantAgentId,
	calls: FunctionCall[] | undefined,
): LiveToolCalls {
	const valid: AssistantToolCall[] = [];
	const rejected: FunctionResponse[] = [];
	(calls ?? []).forEach((call, index) => {
		const id = call.id ?? `live-call-${index}`;
		const name = call.name ?? "";
		if (!isToolAllowed(agent, name)) {
			rejected.push(rejection(id, name, "This tool is not available here."));
			return;
		}
		const args = sanitizeToolArgs(name, call.args ?? {});
		if (!args) {
			rejected.push(rejection(id, name, "Invalid or missing arguments."));
			return;
		}
		valid.push({ id, name, args } as AssistantToolCall);
	});
	const accepted = limitActionCalls(valid);
	for (const call of valid) {
		if (!accepted.includes(call)) {
			rejected.push(
				rejection(
					call.id,
					call.name,
					"Only one action per turn; this one was not done.",
				),
			);
		}
	}
	return { accepted, rejected };
}

/** Same shape the text agent replays: summary as output, or as error when declined. */
export function toFunctionResponses(
	results: AssistantToolResult[],
): FunctionResponse[] {
	return results.map((result) => ({
		id: result.callId,
		name: result.name,
		response: result.declined
			? { error: result.summary }
			: { output: result.summary },
	}));
}

/** Only the text of the last turns: tool calls and results stay out. */
export function liveHistoryTurns(
	messages: AssistantMessage[],
	max: number = LIVE_HISTORY_TURNS,
): Content[] {
	const turns: Content[] = [];
	for (const message of messages) {
		if (message.role === "tool" || message.text.trim() === "") continue;
		turns.push({
			role: message.role === "user" ? "user" : "model",
			parts: [{ text: message.text }],
		});
	}
	return turns.slice(-max);
}
