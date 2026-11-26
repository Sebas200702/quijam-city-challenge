import {
	GoogleGenAI,
	type LiveServerMessage,
	type Session,
} from "@google/genai";
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
}

async function fetchToken(mode: GuideMode): Promise<LiveTokenResponse> {
	const response = await fetch(`/api/guide/token?mode=${mode}`, {
		method: "POST",
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
	const content = message.serverContent;
	if (!content) {
		return;
	}
	if (content.interrupted) {
		handlers.onInterrupted();
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

/**
 * Opens a Live session from the browser with an ephemeral token from our
 * server. The Gemini API key is never sent to the browser.
 */
export async function openLiveSession(
	mode: GuideMode,
	handlers: LiveSessionHandlers,
): Promise<Session> {
	const { token, model } = await fetchToken(mode);
	const ai = new GoogleGenAI({
		apiKey: token,
		httpOptions: { apiVersion: "v1alpha" },
	});
	return ai.live.connect({
		model,
		callbacks: {
			onmessage: (message) => handleMessage(message, handlers),
			onerror: (event) => handlers.onClose(event.message || "error"),
			onclose: (event) => handlers.onClose(event.reason || "closed"),
		},
	});
}
