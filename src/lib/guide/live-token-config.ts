import { type CreateAuthTokenConfig, Modality } from "@google/genai";
import type { GuideMode } from "./guide-types";

/** Fallback model. Confirm the current Live model name in Google AI Studio before the demo. */
export const DEFAULT_LIVE_MODEL = "gemini-live-2.5-flash-preview";

/** Session messages are rejected after this. Must be under 20 hours. */
const SESSION_MINUTES = 30;
/** The browser must open its session within this window. */
const NEW_SESSION_SECONDS = 60;

export const GUIDE_SYSTEM_INSTRUCTION =
	"You are the Guide for visitors in Barranquilla. Answer in the visitor's language, briefly. " +
	"Data about routes, fares and businesses in this prototype is simulated.";

/**
 * Builds a single-use ephemeral token config. Model, modality and system
 * instruction are locked inside the token, so the browser cannot change them.
 */
export function buildLiveTokenConfig(
	mode: GuideMode,
	model: string,
	now: Date = new Date(),
): CreateAuthTokenConfig {
	return {
		uses: 1,
		expireTime: new Date(
			now.getTime() + SESSION_MINUTES * 60_000,
		).toISOString(),
		newSessionExpireTime: new Date(
			now.getTime() + NEW_SESSION_SECONDS * 1000,
		).toISOString(),
		liveConnectConstraints: {
			model,
			config: {
				responseModalities: [mode === "audio" ? Modality.AUDIO : Modality.TEXT],
				systemInstruction: GUIDE_SYSTEM_INSTRUCTION,
				// Text of what the visitor said and what the Guide answered by voice.
				...(mode === "audio"
					? { inputAudioTranscription: {}, outputAudioTranscription: {} }
					: {}),
			},
		},
		lockAdditionalFields: [],
		// Ephemeral tokens only exist in v1alpha.
		httpOptions: { apiVersion: "v1alpha" },
	};
}
