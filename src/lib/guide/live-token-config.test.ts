import { Modality } from "@google/genai";
import { describe, expect, it } from "vitest";
import {
	buildLiveTokenConfig,
	DEFAULT_LIVE_MODEL,
	GUIDE_SYSTEM_INSTRUCTION,
} from "./live-token-config";

const now = new Date("2026-11-26T12:00:00Z");

describe("buildLiveTokenConfig", () => {
	it("creates a single-use token with short lifetimes", () => {
		const config = buildLiveTokenConfig("some-model", now);
		expect(config.uses).toBe(1);
		expect(config.newSessionExpireTime).toBe("2026-11-26T12:01:00.000Z");
		expect(config.expireTime).toBe("2026-11-26T12:30:00.000Z");
		expect(config.httpOptions?.apiVersion).toBe("v1alpha");
	});

	it("locks the model and asks for audio plus its transcript", () => {
		// Current Live models reject TEXT-only responses, so text mode reads the transcript.
		const config = buildLiveTokenConfig("some-model", now);
		expect(config.liveConnectConstraints?.model).toBe("some-model");
		expect(config.liveConnectConstraints?.config?.responseModalities).toEqual([
			Modality.AUDIO,
		]);
		expect(
			config.liveConnectConstraints?.config?.outputAudioTranscription,
		).toEqual({});
		expect(config.lockAdditionalFields).toEqual([]);
	});

	it("keeps the Guide instruction and no tools when no agent is given", () => {
		const config = buildLiveTokenConfig("some-model", now);
		expect(config.liveConnectConstraints?.config?.systemInstruction).toBe(
			GUIDE_SYSTEM_INSTRUCTION,
		);
		expect(config.liveConnectConstraints?.config?.tools).toBeUndefined();
	});

	it("locks the agent's instruction, tools and input transcript into the token", () => {
		const tools = [
			{ functionDeclarations: [{ name: "search_events", description: "x" }] },
		];
		const config = buildLiveTokenConfig("some-model", now, {
			systemInstruction: "agent rules",
			tools,
		});
		const live = config.liveConnectConstraints?.config;
		expect(live?.systemInstruction).toBe("agent rules");
		expect(live?.tools).toEqual(tools);
		expect(live?.inputAudioTranscription).toEqual({});
		expect(live?.responseModalities).toEqual([Modality.AUDIO]);
	});

	it("compresses the context so long voice sessions are not cut", () => {
		const config = buildLiveTokenConfig("some-model", now);
		expect(
			config.liveConnectConstraints?.config?.contextWindowCompression,
		).toEqual({ slidingWindow: {} });
	});

	it("defaults to a Live model the API serves", () => {
		expect(DEFAULT_LIVE_MODEL).toBe("gemini-3.8-live");
	});
});
