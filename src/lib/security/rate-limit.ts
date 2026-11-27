// Dependency-free sliding-window rate limiter.
//
// State lives in this server process only. That is fine for the single
// Dokploy container we run today, but limits are not shared across replicas
// and reset on restart. The upgrade path is a shared store (Supabase table or
// Redis) behind the same `check(key)` contract.

import type {
	RateLimiter,
	RateLimiterOptions,
	RateLimitResult,
} from "./rate-limit-types";

const DEFAULT_MAX_KEYS = 10_000;

export function createRateLimiter(options: RateLimiterOptions): RateLimiter {
	const { limit, windowMs } = options;
	const maxKeys = options.maxKeys ?? DEFAULT_MAX_KEYS;
	const now = options.now ?? Date.now;
	if (!(limit > 0) || !(windowMs > 0) || !(maxKeys > 0)) {
		throw new Error("Rate limiter needs a positive limit, window and maxKeys.");
	}

	// Map keeps insertion order: re-inserting on every hit makes the first
	// entry the least recently seen key, which is the one dropped at the cap.
	const hits = new Map<string, number[]>();
	let lastSweep = now();

	function sweep(current: number): void {
		const cutoff = current - windowMs;
		for (const [key, stamps] of hits) {
			if (stamps[stamps.length - 1] <= cutoff) hits.delete(key);
		}
		lastSweep = current;
	}

	return {
		check(key: string): RateLimitResult {
			const current = now();
			if (current - lastSweep >= windowMs) sweep(current);

			const cutoff = current - windowMs;
			const stamps = (hits.get(key) ?? []).filter((stamp) => stamp > cutoff);
			hits.delete(key);

			if (stamps.length >= limit) {
				hits.set(key, stamps);
				const retryAfterMs = stamps[0] + windowMs - current;
				return {
					allowed: false,
					remaining: 0,
					retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
				};
			}

			stamps.push(current);
			hits.set(key, stamps);
			while (hits.size > maxKeys) {
				const oldest = hits.keys().next().value;
				if (oldest === undefined) break;
				hits.delete(oldest);
			}
			return {
				allowed: true,
				remaining: limit - stamps.length,
				retryAfterSeconds: 0,
			};
		},
		size: () => hits.size,
	};
}
