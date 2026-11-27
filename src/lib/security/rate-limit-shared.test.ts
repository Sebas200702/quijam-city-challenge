import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	guardRequest,
	resetRateLimiters,
	setSharedRateLimitStore,
} from "./api-guard";
import {
	checkShared,
	createSupabaseRateLimitStore,
	type SharedRateLimitStore,
} from "./rate-limit-shared";

const policy = { limit: 5, windowMs: 60_000, scope: "ip" } as const;

function contextFor(ip: string) {
	return {
		request: new Request("http://localhost/api/test", { method: "POST" }),
		clientAddress: ip,
	};
}

describe("createSupabaseRateLimitStore", () => {
	it("maps the rpc row and sends the window in seconds", async () => {
		const rpc = vi.fn(async () => ({
			data: [{ allowed: false, remaining: 0, retry_after_seconds: 42 }],
			error: null,
		}));
		const store = createSupabaseRateLimitStore({ rpc });
		expect(await store.hit("k", policy)).toEqual({
			allowed: false,
			remaining: 0,
			retryAfterSeconds: 42,
		});
		expect(rpc).toHaveBeenCalledWith("rate_limit_hit", {
			p_key: "k",
			p_limit: 5,
			p_window_seconds: 60,
		});
	});

	it("throws on errors and malformed answers", async () => {
		const failing = createSupabaseRateLimitStore({
			rpc: async () => ({ data: null, error: { message: "boom" } }),
		});
		await expect(failing.hit("k", policy)).rejects.toThrow("boom");
		const odd = createSupabaseRateLimitStore({
			rpc: async () => ({ data: [{ nope: true }], error: null }),
		});
		await expect(odd.hit("k", policy)).rejects.toThrow(/Unexpected/);
	});
});

describe("checkShared", () => {
	it("returns null when the store fails or is too slow", async () => {
		const failing: SharedRateLimitStore = {
			hit: async () => {
				throw new Error("down");
			},
		};
		expect(await checkShared(failing, "k", policy)).toBeNull();
		const slow: SharedRateLimitStore = {
			hit: () => new Promise(() => {}),
		};
		expect(await checkShared(slow, "k", policy, 20)).toBeNull();
	});
});

describe("guardRequest with a shared store", () => {
	beforeEach(() => resetRateLimiters());

	it("blocks when another replica already used the allowance", async () => {
		setSharedRateLimitStore({
			hit: async () => ({
				allowed: false,
				remaining: 0,
				retryAfterSeconds: 17,
			}),
		});
		const response = await guardRequest(contextFor("203.0.113.9"), "triage");
		expect(response?.status).toBe(429);
		expect(response?.headers.get("Retry-After")).toBe("17");
	});

	it("keeps the in-memory decision when the shared store is down", async () => {
		setSharedRateLimitStore({
			hit: async () => {
				throw new Error("down");
			},
		});
		expect(await guardRequest(contextFor("203.0.113.9"), "triage")).toBeNull();
	});

	it("uses a key per policy so counters do not mix", async () => {
		const keys: string[] = [];
		setSharedRateLimitStore({
			hit: async (key) => {
				keys.push(key);
				return { allowed: true, remaining: 1, retryAfterSeconds: 0 };
			},
		});
		await guardRequest(contextFor("203.0.113.9"), "triage");
		await guardRequest(contextFor("203.0.113.9"), "assistant");
		expect(keys[0].startsWith("triage:")).toBe(true);
		expect(keys[1].startsWith("assistant:")).toBe(true);
	});
});
