import { describe, expect, it } from "vitest";
import { createRateLimiter } from "./rate-limit";

function clock(start = 0) {
	let time = start;
	return {
		now: () => time,
		advance: (ms: number) => {
			time += ms;
		},
	};
}

describe("createRateLimiter", () => {
	it("allows up to the limit inside one window and counts down remaining", () => {
		const { now } = clock();
		const limiter = createRateLimiter({ limit: 3, windowMs: 1000, now });
		expect(limiter.check("a")).toEqual({
			allowed: true,
			remaining: 2,
			retryAfterSeconds: 0,
		});
		expect(limiter.check("a").remaining).toBe(1);
		expect(limiter.check("a").remaining).toBe(0);
		expect(limiter.check("a").allowed).toBe(false);
	});

	it("reports retryAfter until the oldest hit leaves the window", () => {
		const time = clock();
		const limiter = createRateLimiter({
			limit: 2,
			windowMs: 10_000,
			now: time.now,
		});
		limiter.check("a");
		time.advance(4_000);
		limiter.check("a");
		time.advance(1_500);
		const denied = limiter.check("a");
		expect(denied.allowed).toBe(false);
		expect(denied.remaining).toBe(0);
		// Oldest hit at 0 expires at 10_000; now is 5_500 → 4.5 s → 5.
		expect(denied.retryAfterSeconds).toBe(5);
	});

	it("slides: frees one slot when the oldest hit expires", () => {
		const time = clock();
		const limiter = createRateLimiter({
			limit: 2,
			windowMs: 1000,
			now: time.now,
		});
		limiter.check("a");
		time.advance(500);
		limiter.check("a");
		expect(limiter.check("a").allowed).toBe(false);
		time.advance(501);
		expect(limiter.check("a").allowed).toBe(true);
		expect(limiter.check("a").allowed).toBe(false);
	});

	it("does not count denied requests", () => {
		const time = clock();
		const limiter = createRateLimiter({
			limit: 1,
			windowMs: 1000,
			now: time.now,
		});
		limiter.check("a");
		for (let i = 0; i < 5; i++) limiter.check("a");
		time.advance(1001);
		expect(limiter.check("a").allowed).toBe(true);
	});

	it("keeps keys independent", () => {
		const { now } = clock();
		const limiter = createRateLimiter({ limit: 1, windowMs: 1000, now });
		expect(limiter.check("a").allowed).toBe(true);
		expect(limiter.check("a").allowed).toBe(false);
		expect(limiter.check("b").allowed).toBe(true);
	});

	it("evicts expired keys on the next sweep", () => {
		const time = clock();
		const limiter = createRateLimiter({
			limit: 5,
			windowMs: 1000,
			now: time.now,
		});
		limiter.check("a");
		limiter.check("b");
		expect(limiter.size()).toBe(2);
		time.advance(1500);
		limiter.check("c");
		expect(limiter.size()).toBe(1);
	});

	it("caps tracked keys, dropping the least recently seen", () => {
		const { now } = clock();
		const limiter = createRateLimiter({
			limit: 1,
			windowMs: 60_000,
			maxKeys: 2,
			now,
		});
		limiter.check("a");
		limiter.check("b");
		limiter.check("c");
		expect(limiter.size()).toBe(2);
		// "a" was dropped, so it starts fresh; "c" is still limited.
		expect(limiter.check("c").allowed).toBe(false);
		expect(limiter.check("a").allowed).toBe(true);
	});

	it("rejects invalid options", () => {
		expect(() => createRateLimiter({ limit: 0, windowMs: 1000 })).toThrow();
	});
});
