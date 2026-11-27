// Shared rate-limit store (#126). The in-memory limiter keeps working as the first
// line; this store makes the counters common to every replica through Supabase.

import type { RateLimitPolicy, RateLimitResult } from "./rate-limit-types";

export interface SharedRateLimitStore {
	/** Counts one hit for `key` under `policy`. Throws when the store is unreachable. */
	hit(key: string, policy: RateLimitPolicy): Promise<RateLimitResult>;
}

/** The slice of the Supabase client the store needs (easy to fake in tests). */
export interface RpcClient {
	rpc(
		fn: string,
		args: Record<string, unknown>,
	): PromiseLike<{ data: unknown; error: { message: string } | null }>;
}

interface HitRow {
	allowed: boolean;
	remaining: number;
	retry_after_seconds: number;
}

function isHitRow(value: unknown): value is HitRow {
	if (typeof value !== "object" || value === null) return false;
	const row = value as Record<string, unknown>;
	return (
		typeof row.allowed === "boolean" &&
		typeof row.remaining === "number" &&
		typeof row.retry_after_seconds === "number"
	);
}

export function createSupabaseRateLimitStore(
	client: RpcClient,
): SharedRateLimitStore {
	return {
		async hit(key, policy) {
			const { data, error } = await client.rpc("rate_limit_hit", {
				p_key: key,
				p_limit: policy.limit,
				p_window_seconds: Math.max(1, Math.ceil(policy.windowMs / 1000)),
			});
			if (error) throw new Error(error.message);
			const row = Array.isArray(data) ? data[0] : data;
			if (!isHitRow(row)) throw new Error("Unexpected rate limit response.");
			return {
				allowed: row.allowed,
				remaining: row.remaining,
				retryAfterSeconds: row.retry_after_seconds,
			};
		},
	};
}

/**
 * Asks the shared store, but never lets it become a single point of failure:
 * on error or after `timeoutMs` it returns null and the caller keeps the
 * in-memory decision.
 */
export async function checkShared(
	store: SharedRateLimitStore,
	key: string,
	policy: RateLimitPolicy,
	timeoutMs = 800,
): Promise<RateLimitResult | null> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	try {
		return await Promise.race([
			store.hit(key, policy),
			new Promise<null>((resolve) => {
				timer = setTimeout(() => resolve(null), timeoutMs);
			}),
		]);
	} catch {
		return null;
	} finally {
		if (timer) clearTimeout(timer);
	}
}
