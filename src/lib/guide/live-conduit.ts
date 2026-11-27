// Gemini Live as a pure voice conduit for Quillart AI. Live never runs an
// agent's tools itself: it only has `ask_quillart`, which hands the person's
// request to the same text pipeline as the dock (orchestrator, specialized
// agent, uiActions, confirmation cards). This file is shared by the server
// (token setup) and the browser (tool call mapping), so it has no secrets.

import type {
	FunctionCall,
	FunctionDeclaration,
	FunctionResponse,
} from "@google/genai";
import type {
	AssistantAgentId,
	AssistantMessage,
} from "../assistant/assistant-types";

export const ASK_QUILLART_TOOL = "ask_quillart";

/** Longest request handed to the orchestrator (the text chat allows more). */
export const MAX_CONDUIT_REQUEST = 2_000;

export const ASK_QUILLART_DECLARATION: FunctionDeclaration = {
	name: ASK_QUILLART_TOOL,
	description:
		"Hands the person's request to Quillart AI, which routes it to the right specialist (mobility, routes and Transmetro, bus and taxi fares; events and agenda; places; community forum; city reports; the person's account; news and notices; open data, historical and synthetic reference data; city indicators and the crowd simulation) and shows the result on screen. Call it for every price, fare, cost or amount, even if asked before: never answer those from memory. Returns the reply text and whether a confirmation card is waiting on screen.",
	parametersJsonSchema: {
		type: "object",
		properties: {
			request: {
				type: "string",
				description:
					"The person's request as a complete, self-contained instruction in their language, including details they said earlier in the conversation.",
			},
		},
		required: ["request"],
		additionalProperties: false,
	},
};

/** One `ask_quillart` call ready for the text pipeline. */
export interface ConduitRequest {
	id: string;
	request: string;
}

export interface ConduitCalls {
	/** Requests to send to Quillart AI, in order. */
	requests: ConduitRequest[];
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

/**
 * Splits Live tool calls into `ask_quillart` requests and rejections. Any
 * other tool name is answered with an error pointing back to ask_quillart.
 */
export function toConduitCalls(
	calls: FunctionCall[] | undefined,
): ConduitCalls {
	const requests: ConduitRequest[] = [];
	const rejected: FunctionResponse[] = [];
	(calls ?? []).forEach((call, index) => {
		const id = call.id ?? `live-call-${index}`;
		const name = call.name ?? "";
		if (name !== ASK_QUILLART_TOOL) {
			rejected.push(
				rejection(
					id,
					name,
					`Unknown tool. Use ${ASK_QUILLART_TOOL} with the person's request.`,
				),
			);
			return;
		}
		const raw = call.args?.request;
		const request = typeof raw === "string" ? raw.trim() : "";
		if (!request) {
			rejected.push(
				rejection(id, name, "Missing request: say what the person asked."),
			);
			return;
		}
		requests.push({ id, request: request.slice(0, MAX_CONDUIT_REQUEST) });
	});
	return { requests, rejected };
}

/** What the text pipeline answered to one request. */
export interface ConduitResult {
	/** The assistant's reply text, as shown in the chat. */
	reply: string;
	agent: AssistantAgentId | null;
	/** An action waits on a card on screen; it only happens if the person confirms. */
	confirmationWaiting: boolean;
}

/**
 * What one conduit request produced: the assistant turns added after the
 * person's message, and whether an action now waits on its card. `open` is
 * the text pipeline's open batch, if any (a Live batch never counts).
 */
export function conduitResultOf(
	added: AssistantMessage[],
	open: { remaining: readonly unknown[]; live?: boolean } | null,
): ConduitResult {
	const turns = added.flatMap((message) =>
		message.role === "assistant" ? [message] : [],
	);
	return {
		reply: turns
			.map((turn) => turn.text.trim())
			.filter(Boolean)
			.join("\n"),
		agent: turns.at(-1)?.agent ?? null,
		confirmationWaiting: !!open && !open.live && open.remaining.length > 0,
	};
}

/** Short function response for Live: what to tell the person, in its own words. */
export function conduitResponse(
	id: string,
	result: ConduitResult | null,
): FunctionResponse {
	if (!result) {
		return rejection(
			id,
			ASK_QUILLART_TOOL,
			"Quillart AI could not answer right now (busy or offline). Tell the person briefly and suggest trying again in a moment.",
		);
	}
	return {
		id,
		name: ASK_QUILLART_TOOL,
		response: {
			output: {
				reply: result.reply,
				confirmationWaiting: result.confirmationWaiting,
				...(result.confirmationWaiting
					? {
							note: "An action is waiting on a card on screen. It only happens if the person taps Confirm there.",
						}
					: {}),
			},
		},
	};
}

/**
 * Note for the live session after the person confirmed (or cancelled) an
 * action on its card: Live already answered `ask_quillart`, so the outcome
 * goes in as client content for Live to tell. Null when the call has no
 * result in the conversation yet.
 */
export function confirmedActionNote(
	messages: AssistantMessage[],
	callId: string,
): string | null {
	const index = messages.findLastIndex(
		(message) =>
			message.role === "tool" &&
			message.results.some((result) => result.callId === callId),
	);
	if (index < 0) return null;
	const tool = messages[index];
	const result =
		tool.role === "tool"
			? tool.results.find((item) => item.callId === callId)
			: undefined;
	const reply = conduitResultOf(messages.slice(index + 1), null).reply;
	const outcome = result?.declined
		? "The action on the card did not happen (cancelled or failed)."
		: "The person confirmed the action on the card and it ran.";
	return [
		`[Quillart AI update, not said by the person] ${outcome}`,
		reply ? `Quillart AI answered: ${reply}` : "",
		"Tell the person the outcome briefly in your own words.",
	]
		.filter(Boolean)
		.join("\n");
}
