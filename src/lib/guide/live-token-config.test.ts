import { Modality } from "@google/genai";
import { describe, expect, it } from "vitest";
import { buildLiveTokenConfig } from "./live-token-config";

const now = new Date("2026-11-26T12:00:00Z");

describe("buildLiveTokenConfig", () => {
	it("creates a single-use token with short lifetimes", () => {
		const config = buildLiveTokenConfig("audio", "some-model", now);
		expect(config.uses).toBe(1);
		expect(config.newSessionExpireTime).toBe("2026-11-26T12:01:00.000Z");
		expect(config.expireTime).toBe("2026-11-26T12:30:00.000Z");
		expect(config.httpOptions?.apiVersion).toBe("v1alpha");
	});

	it("locks the model and the modality for each mode", () => {
		const audio = buildLiveTokenConfig("audio", "some-model", now);
		const text = buildLiveTokenConfig("text", "some-model", now);
		expect(audio.liveConnectConstraints?.model).toBe("some-model");
		expect(audio.liveConnectConstraints?.config?.responseModalities).toEqual([
			Modality.AUDIO,
		]);
		expect(text.liveConnectConstraints?.config?.responseModalities).toEqual([
			Modality.TEXT,
		]);
		expect(audio.lockAdditionalFields).toEqual([]);
	});

	it("asks for transcriptions only in audio mode", () => {
		const audio = buildLiveTokenConfig("audio", "some-model", now);
		const text = buildLiveTokenConfig("text", "some-model", now);
		expect(
			audio.liveConnectConstraints?.config?.outputAudioTranscription,
		).toEqual({});
		expect(
			audio.liveConnectConstraints?.config?.inputAudioTranscription,
		).toEqual({});
		expect(
			text.liveConnectConstraints?.config?.outputAudioTranscription,
		).toBeUndefined();
	});
});
