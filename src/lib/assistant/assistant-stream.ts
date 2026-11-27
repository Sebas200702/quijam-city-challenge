// Streams one Quillart AI turn as NDJSON: a start line with the routed agent,
// text lines as the answer is written, and a final line with the complete
// response. Used by POST /api/assistant (server) and useAssistant (browser).

import type {
	AssistantAgentId,
	AssistantResponse,
	AssistantStreamEvent,
} from "./assistant-types";

export const ASSISTANT_STREAM_TYPE = "application/x-ndjson";

/** Pause between pieces of an answer that was not streamed by the model. */
export const CHUNK_DELAY_MS = 25;

const UNEXPECTED_ERROR = "The assistant could not answer.";

export interface AnswerHooks {
	onStart?: (
		agent: AssistantAgentId,
		routedBy: AssistantResponse["routedBy"],
	) => void;
	onText?: (text: string) => void;
}

export function encodeEvent(event: AssistantStreamEvent): string {
	return `${JSON.stringify(event)}\n`;
}

/** Small pieces (a word and its trailing spaces) that join back to the text. */
export function chunkText(text: string): string[] {
	return text.match(/\S+\s*|\s+/g) ?? [];
}

const wait = (ms: number) =>
	ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : null;

/**
 * Runs one answer and streams it. Text the model streamed live is forwarded
 * as it arrives; otherwise the final text is sent in pieces. The final line
 * always carries the complete response, which replaces any partial text.
 */
export function createAnswerStream(
	run: (hooks: AnswerHooks) => Promise<AssistantResponse>,
	options: { chunkDelayMs?: number; onError?: (error: unknown) => void } = {},
): ReadableStream<Uint8Array> {
	const delay = options.chunkDelayMs ?? CHUNK_DELAY_MS;
	const encoder = new TextEncoder();
	return new ReadableStream({
		async start(controller) {
			const send = (event: AssistantStreamEvent) =>
				controller.enqueue(encoder.encode(encodeEvent(event)));
			let streamed = false;
			try {
				const response = await run({
					onStart: (agent, routedBy) =>
						send({ type: "start", agent, routedBy }),
					onText: (text) => {
						if (text === "") return;
						streamed = true;
						send({ type: "text", text });
					},
				});
				if (!streamed) {
					for (const piece of chunkText(response.text)) {
						send({ type: "text", text: piece });
						await wait(delay);
					}
				}
				send({ type: "done", response });
			} catch (error) {
				options.onError?.(error);
				send({ type: "error", error: UNEXPECTED_ERROR });
			} finally {
				controller.close();
			}
		},
	});
}

function isResponse(value: unknown): value is AssistantResponse {
	const body = value as Partial<AssistantResponse> | null;
	return (
		!!body &&
		typeof body.agent === "string" &&
		typeof body.text === "string" &&
		Array.isArray(body.toolCalls)
	);
}

/** Reads a streamed answer; resolves with the final response. */
export async function readAssistantStream(
	body: ReadableStream<Uint8Array>,
	handlers: {
		onStart?: (agent: AssistantAgentId) => void;
		onText?: (text: string) => void;
	},
): Promise<AssistantResponse> {
	const reader = body.getReader();
	const decoder = new TextDecoder();
	let buffer = "";
	let final: AssistantResponse | null = null;

	const handle = (line: string) => {
		if (line.trim() === "") return;
		const event = JSON.parse(line) as AssistantStreamEvent;
		if (event.type === "start") handlers.onStart?.(event.agent);
		else if (event.type === "text") handlers.onText?.(event.text);
		else if (event.type === "error") throw new Error(event.error);
		else if (event.type === "done" && isResponse(event.response)) {
			final = event.response;
		}
	};

	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		buffer += decoder.decode(value, { stream: true });
		let newline = buffer.indexOf("\n");
		while (newline !== -1) {
			handle(buffer.slice(0, newline));
			buffer = buffer.slice(newline + 1);
			newline = buffer.indexOf("\n");
		}
	}
	handle(buffer + decoder.decode());
	if (!final) throw new Error("The answer ended before it was complete.");
	return final;
}
