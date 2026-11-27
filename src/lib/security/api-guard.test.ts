import { beforeEach, describe, expect, it } from "vitest";
import {
	guardRequest,
	RATE_LIMIT_POLICIES,
	resetRateLimiters,
} from "./api-guard";
import { getClientKey } from "./client-key";

function contextFor(ip: string, forwardedFor?: string) {
	const headers = new Headers();
	if (forwardedFor) headers.set("x-forwarded-for", forwardedFor);
	return {
		request: new Request("http://localhost/api/test", {
			method: "POST",
			headers,
		}),
		clientAddress: ip,
	};
}

function exhaust(ip: string, policy: keyof typeof RATE_LIMIT_POLICIES) {
	for (let i = 0; i < RATE_LIMIT_POLICIES[policy].limit; i++) {
		expect(guardRequest(contextFor(ip), policy)).toBeNull();
	}
}

describe("guardRequest", () => {
	beforeEach(() => resetRateLimiters());

	it("returns a 429 JSON response with Retry-After once over the limit", async () => {
		exhaust("203.0.113.5", "guide-token");
		const response = guardRequest(contextFor("203.0.113.5"), "guide-token");
		expect(response).not.toBeNull();
		if (!response) return;
		expect(response.status).toBe(429);
		expect(response.headers.get("Content-Type")).toBe("application/json");
		expect(response.headers.get("Cache-Control")).toBe("no-store");
		const retryAfter = Number(response.headers.get("Retry-After"));
		expect(retryAfter).toBeGreaterThan(0);
		expect(retryAfter).toBeLessThanOrEqual(60);
		expect(await response.json()).toEqual({
			error: `Vas muy rápido. Intenta de nuevo en ${retryAfter} segundos.`,
		});
	});

	it("limits each address independently", () => {
		exhaust("203.0.113.5", "guide-token");
		expect(
			guardRequest(contextFor("203.0.113.5"), "guide-token"),
		).not.toBeNull();
		expect(guardRequest(contextFor("203.0.113.6"), "guide-token")).toBeNull();
	});

	it("keys user policies on the user id, not the address", () => {
		for (let i = 0; i < RATE_LIMIT_POLICIES["publish-user"].limit; i++) {
			expect(
				guardRequest(contextFor(`198.51.100.${i}`), "publish-user", "user-1"),
			).toBeNull();
		}
		expect(
			guardRequest(contextFor("198.51.100.99"), "publish-user", "user-1"),
		).not.toBeNull();
		expect(
			guardRequest(contextFor("198.51.100.99"), "publish-user", "user-2"),
		).toBeNull();
	});
});

describe("getClientKey", () => {
	it("hashes the address instead of keeping it raw", () => {
		const key = getClientKey(contextFor("203.0.113.5"));
		expect(key).toMatch(/^ip:[0-9a-f]{16}$/);
		expect(key).not.toContain("203.0.113.5");
	});

	it("falls back to the first x-forwarded-for value, then unknown", () => {
		const throwing = {
			request: new Request("http://localhost", {
				headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1" },
			}),
			get clientAddress(): string {
				throw new Error("unavailable");
			},
		};
		expect(getClientKey(throwing)).toBe(
			getClientKey(contextFor("203.0.113.7")),
		);
		expect(getClientKey({ request: new Request("http://localhost") })).toBe(
			"ip:unknown",
		);
	});
});
