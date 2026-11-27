// Shared types for the in-memory API rate limiter.

export interface RateLimiterOptions {
	/** Requests allowed per key inside one window. */
	limit: number;
	/** Window length in milliseconds. */
	windowMs: number;
	/** Hard cap on tracked keys; the least recently seen keys are dropped first. */
	maxKeys?: number;
	/** Clock in milliseconds; injectable for tests. */
	now?: () => number;
}

export interface RateLimitResult {
	allowed: boolean;
	/** Requests left in the current window after this one. */
	remaining: number;
	/** Seconds until the next request may pass; 0 when allowed. */
	retryAfterSeconds: number;
}

export interface RateLimiter {
	check(key: string): RateLimitResult;
	/** Number of keys currently tracked (for tests and diagnostics). */
	size(): number;
}

/** How a policy builds its key: the caller's network address or a user id. */
export type RateLimitScope = "ip" | "user";

export interface RateLimitPolicy {
	limit: number;
	windowMs: number;
	scope: RateLimitScope;
}
