// Rate-limit guard for the public API routes.

import { type ClientKeySource, getClientKey, hashKey } from "./client-key";
import { createRateLimiter } from "./rate-limit";
import type { RateLimiter, RateLimitPolicy } from "./rate-limit-types";

const MINUTE = 60_000;

export const RATE_LIMIT_POLICIES = {
	assistant: { limit: 20, windowMs: MINUTE, scope: "ip" },
	triage: { limit: 30, windowMs: MINUTE, scope: "ip" },
	"publish-ip": { limit: 30, windowMs: 10 * MINUTE, scope: "ip" },
	"publish-user": { limit: 10, windowMs: 10 * MINUTE, scope: "user" },
	moderation: { limit: 120, windowMs: MINUTE, scope: "ip" },
	"guide-ask": { limit: 20, windowMs: MINUTE, scope: "ip" },
	"guide-token": { limit: 5, windowMs: MINUTE, scope: "ip" },
	reports: { limit: 5, windowMs: 10 * MINUTE, scope: "ip" },
	decidir: { limit: 30, windowMs: MINUTE, scope: "ip" },
	"impact-report": { limit: 5, windowMs: MINUTE, scope: "ip" },
	account: { limit: 5, windowMs: 10 * MINUTE, scope: "ip" },
	"open-data": { limit: 60, windowMs: MINUTE, scope: "ip" },
	"presenter-session": { limit: 10, windowMs: 10 * MINUTE, scope: "ip" },
	"presenter-events": { limit: 60, windowMs: MINUTE, scope: "ip" },
} as const satisfies Record<string, RateLimitPolicy>;

export type RateLimitPolicyName = keyof typeof RATE_LIMIT_POLICIES;

// Module singletons: one limiter per policy for the life of the process.
const limiters = new Map<RateLimitPolicyName, RateLimiter>();

function limiterFor(name: RateLimitPolicyName): RateLimiter {
	let limiter = limiters.get(name);
	if (!limiter) {
		const { limit, windowMs } = RATE_LIMIT_POLICIES[name];
		limiter = createRateLimiter({ limit, windowMs });
		limiters.set(name, limiter);
	}
	return limiter;
}

/** Test hook: forget every counter. */
export function resetRateLimiters(): void {
	limiters.clear();
}

export function tooManyRequests(retryAfterSeconds: number): Response {
	return new Response(
		JSON.stringify({
			error: `Vas muy rápido. Intenta de nuevo en ${retryAfterSeconds} segundos.`,
		}),
		{
			status: 429,
			headers: {
				"Content-Type": "application/json",
				"Cache-Control": "no-store",
				"Retry-After": String(retryAfterSeconds),
			},
		},
	);
}

/**
 * Returns a 429 Response when the caller is over the policy's limit, or null
 * to let the route continue. "user" policies key on `extraKey` (the user id);
 * "ip" policies key on the caller's address, optionally narrowed by `extraKey`.
 */
export function guardRequest(
	context: ClientKeySource,
	policyName: RateLimitPolicyName,
	extraKey?: string,
): Response | null {
	const policy = RATE_LIMIT_POLICIES[policyName];
	let key: string;
	if (policy.scope === "user") {
		key = extraKey ? `user:${hashKey(extraKey)}` : getClientKey(context);
	} else {
		key = extraKey
			? `${getClientKey(context)}:${hashKey(extraKey)}`
			: getClientKey(context);
	}
	const result = limiterFor(policyName).check(key);
	return result.allowed ? null : tooManyRequests(result.retryAfterSeconds);
}
