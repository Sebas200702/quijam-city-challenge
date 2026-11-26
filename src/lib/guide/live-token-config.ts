import { type CreateAuthTokenConfig, Modality } from "@google/genai";

/** Fallback model. Checked on 2026-11-26 against the models list for bidiGenerateContent. */
export const DEFAULT_LIVE_MODEL = "gemini-3.8-live";

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
 * Live models only answer with audio, so the token always asks for audio plus
 * its transcript; text mode shows the transcript instead of playing the audio.
 */
export function buildLiveTokenConfig(
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
				responseModalities: [Modality.AUDIO],
				outputAudioTranscription: {},
				systemInstruction: GUIDE_SYSTEM_INSTRUCTION,
			},
		},
		lockAdditionalFields: [],
		// Ephemeral tokens only exist in v1alpha.
		httpOptions: { apiVersion: "v1alpha" },
	};
}
