import {
	type FunctionCall,
	GoogleGenAI,
	type LiveServerMessage,
	type Session,
} from "@google/genai";
import type {
	AssistantAgentId,
	AssistantRequest,
} from "../assistant/assistant-types";
import type { GuideMode, LiveTokenResponse } from "./guide-types";

export interface LiveSessionHandlers {
	/** Transcript chunk of what the model says. */
	onText: (text: string) => void;
	/** The model finished its answer. */
	onTurnComplete: () => void;
	/** Base64 PCM16 audio chunk from the model (24 kHz). */
	onAudio: (base64Pcm: string) => void;
	onInterrupted: () => void;
	onClose: (reason: string) => void;
	/** Transcript chunk of what the person says (agent sessions only). */
	onInputText?: (text: string) => void;
	/** The model asks the browser to run these tools (agent sessions only). */
	onToolCall?: (calls: FunctionCall[]) => void;
	/** The model withdrew these tool calls before they were answered. */
	onToolCancel?: (ids: string[]) => void;
}

async function fetchToken(
	mode: GuideMode,
	body?: AssistantRequest,
): Promise<LiveTokenResponse> {
	const response = await fetch(`/api/guide/token?mode=${mode}`, {
		method: "POST",
		...(body
			? {
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(body),
				}
			: {}),
	});
	if (!response.ok) {
		throw new Error(`Token endpoint failed with status ${response.status}`);
	}
	return (await response.json()) as LiveTokenResponse;
}

function handleMessage(
	message: LiveServerMessage,
	handlers: LiveSessionHandlers,
): void {
	if (message.toolCall?.functionCalls?.length) {
		handlers.onToolCall?.(message.toolCall.functionCalls);
	}
	if (message.toolCallCancellation?.ids?.length) {
		handlers.onToolCancel?.(message.toolCallCancellation.ids);
	}
	const content = message.serverContent;
	if (!content) {
		return;
	}
	if (content.interrupted) {
		handlers.onInterrupted();
	}
	if (content.inputTranscription?.text) {
		handlers.onInputText?.(content.inputTranscription.text);
	}
	for (const part of content.modelTurn?.parts ?? []) {
		if (part.inlineData?.data) {
			handlers.onAudio(part.inlineData.data);
		}
	}
	if (content.outputTranscription?.text) {
		handlers.onText(content.outputTranscription.text);
	}
	if (content.turnComplete) {
		handlers.onTurnComplete();
	}
}

async function connect(
	token: LiveTokenResponse,
	handlers: LiveSessionHandlers,
): Promise<Session> {
	const ai = new GoogleGenAI({
		apiKey: token.token,
		httpOptions: { apiVersion: "v1alpha" },
	});
	return ai.live.connect({
		model: token.model,
		callbacks: {
			onmessage: (message) => handleMessage(message, handlers),
			onerror: (event) => handlers.onClose(event.message || "error"),
			onclose: (event) => handlers.onClose(event.reason || "closed"),
		},
	});
}

/**
 * Opens a Live session from the browser with an ephemeral token from our
 * server. The Gemini API key is never sent to the browser.
 */
export async function openLiveSession(
	mode: GuideMode,
	handlers: LiveSessionHandlers,
): Promise<Session> {
	return connect(await fetchToken(mode), handlers);
}

/**
 * Opens a Live session for the Quillart AI agent the server's orchestrator
 * picks from the conversation. The token locks that agent's instruction and
 * tools; tool calls come back through `onToolCall`.
 */
export async function openAgentLiveSession(
	request: AssistantRequest,
	handlers: LiveSessionHandlers,
): Promise<{ session: Session; agent: AssistantAgentId }> {
	const token = await fetchToken("audio", request);
	if (!token.agent) throw new Error("The server chose no agent.");
	return { session: await connect(token, handlers), agent: token.agent };
}
