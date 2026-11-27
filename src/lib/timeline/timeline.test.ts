import { describe, expect, it } from "vitest";
import {
	clampHour,
	formatHour,
	hourToPercent,
	MATCH_DAY_END,
	MATCH_DAY_START,
	playbackStartHour,
	playbackTick,
	reconcileEcho,
	rememberSent,
	stepHour,
} from "./timeline";

describe("clampHour", () => {
	it("keeps the hour inside 8 to 23 and rounds it", () => {
		expect(clampHour(3)).toBe(MATCH_DAY_START);
		expect(clampHour(30)).toBe(MATCH_DAY_END);
		expect(clampHour(15.4)).toBe(15);
		expect(clampHour(15.6)).toBe(16);
	});

	it("sends anything that is not a number to the start of the day", () => {
		expect(clampHour(Number.NaN)).toBe(MATCH_DAY_START);
		expect(clampHour(Number.POSITIVE_INFINITY)).toBe(MATCH_DAY_START);
	});
});

describe("stepHour", () => {
	it("moves by whole hours without leaving the day", () => {
		expect(stepHour(15, 1)).toBe(16);
		expect(stepHour(15, -2)).toBe(13);
		expect(stepHour(23, 1)).toBe(23);
		expect(stepHour(8, -1)).toBe(8);
	});
});

describe("playback", () => {
	it("resumes from the current hour and starts over once the day ended", () => {
		expect(playbackStartHour(12)).toBe(12);
		expect(playbackStartHour(23)).toBe(8);
	});

	it("advances one hour per tick and stops on the last hour", () => {
		expect(playbackTick(15)).toEqual({ hour: 16, playing: true });
		expect(playbackTick(22)).toEqual({ hour: 23, playing: false });
		expect(playbackTick(23)).toEqual({ hour: 23, playing: false });
	});

	it("plays the whole day in 15 ticks", () => {
		let state = { hour: playbackStartHour(23), playing: true };
		let ticks = 0;
		while (state.playing) {
			state = playbackTick(state.hour);
			ticks += 1;
		}
		expect(ticks).toBe(15);
		expect(state.hour).toBe(23);
	});
});

describe("formatHour and hourToPercent", () => {
	it("writes the hour in 24 h", () => {
		expect(formatHour(8)).toBe("8:00");
		expect(formatHour(18)).toBe("18:00");
	});

	it("places hours along the track", () => {
		expect(hourToPercent(8)).toBe(0);
		expect(hourToPercent(23)).toBe(100);
		expect(hourToPercent(15.5)).toBe(50);
		expect(hourToPercent(6)).toBe(0);
	});
});

describe("reconcileEcho", () => {
	it("ignores the echoes of hours this slider sent while newer ones are in flight", () => {
		let pending = rememberSent([], 16);
		pending = rememberSent(pending, 17);
		const first = reconcileEcho(pending, 16);
		expect(first).toEqual({ pending: [17], apply: false });
		expect(reconcileEcho(first.pending, 17)).toEqual({
			pending: [],
			apply: true,
		});
	});

	it("applies an hour another screen sent and forgets the pending echoes", () => {
		expect(reconcileEcho([16, 17], 20)).toEqual({ pending: [], apply: true });
	});

	it("keeps a bounded list of pending hours", () => {
		let pending: number[] = [];
		for (let i = 0; i < 40; i += 1)
			pending = rememberSent(pending, 8 + (i % 16));
		expect(pending.length).toBeLessThanOrEqual(16);
	});
});
