import { describe, expect, it } from "vitest";
import { INITIAL_LIVE_STATE, liveReducer, voiceInput } from "./live-status";

describe("liveReducer", () => {
	it("goes from off to connecting to live", () => {
		const connecting = liveReducer(INITIAL_LIVE_STATE, { type: "start" });
		expect(connecting).toEqual({ status: "connecting", reason: null });
		expect(liveReducer(connecting, { type: "connected" })).toEqual({
			status: "live",
			reason: null,
		});
	});

	it("falls back when Live cannot connect", () => {
		const connecting = liveReducer(INITIAL_LIVE_STATE, { type: "start" });
		expect(
			liveReducer(connecting, { type: "failed", reason: "status 500" }),
		).toEqual({ status: "fallback", reason: "status 500" });
	});

	it("falls back when a live session closes on its own", () => {
		const live = { status: "live" as const, reason: null };
		expect(liveReducer(live, { type: "failed", reason: "closed" })).toEqual({
			status: "fallback",
			reason: "closed",
		});
	});

	it("turns off without a fallback when the person stops it", () => {
		const live = { status: "live" as const, reason: null };
		const off = liveReducer(live, { type: "stop" });
		expect(off).toEqual(INITIAL_LIVE_STATE);
		// The close that follows a stop is not a failure.
		expect(liveReducer(off, { type: "failed", reason: "closed" })).toEqual(
			INITIAL_LIVE_STATE,
		);
	});

	it("can try again after a fallback", () => {
		const fallback = { status: "fallback" as const, reason: "x" };
		expect(liveReducer(fallback, { type: "start" }).status).toBe("connecting");
	});
});

describe("voiceInput", () => {
	it("uses Live while it is connected", () => {
		expect(voiceInput("live", true)).toBe("live");
	});

	it("keeps the browser speech recognition when Live is off or failed", () => {
		expect(voiceInput("off", true)).toBe("speech");
		expect(voiceInput("fallback", true)).toBe("speech");
	});

	it("keeps text when there is no speech recognition either", () => {
		expect(voiceInput("fallback", false)).toBe("text");
	});
});
