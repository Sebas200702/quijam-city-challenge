import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	guardRequest,
	RATE_LIMIT_POLICIES,
	resetRateLimiters,
} from "./api-guard";
import { getClientKey, trustedClientIpHeader } from "./client-key";

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

async function exhaust(ip: string, policy: keyof typeof RATE_LIMIT_POLICIES) {
	for (let i = 0; i < RATE_LIMIT_POLICIES[policy].limit; i++) {
		expect(await guardRequest(contextFor(ip), policy)).toBeNull();
	}
}

describe("guardRequest", () => {
	beforeEach(() => resetRateLimiters());

	it("returns a 429 JSON response with Retry-After once over the limit", async () => {
		await exhaust("203.0.113.5", "guide-token");
		const response = await guardRequest(
			contextFor("203.0.113.5"),
			"guide-token",
		);
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

	it("limits each address independently", async () => {
		await exhaust("203.0.113.5", "guide-token");
		expect(
			await guardRequest(contextFor("203.0.113.5"), "guide-token"),
		).not.toBeNull();
		expect(
			await guardRequest(contextFor("203.0.113.6"), "guide-token"),
		).toBeNull();
	});

	it("keys user policies on the user id, not the address", async () => {
		for (let i = 0; i < RATE_LIMIT_POLICIES["publish-user"].limit; i++) {
			expect(
				await guardRequest(
					contextFor(`198.51.100.${i}`),
					"publish-user",
					"user-1",
				),
			).toBeNull();
		}
		expect(
			await guardRequest(contextFor("198.51.100.99"), "publish-user", "user-1"),
		).not.toBeNull();
		expect(
			await guardRequest(contextFor("198.51.100.99"), "publish-user", "user-2"),
		).toBeNull();
	});
});

describe("getClientKey", () => {
	it("hashes the address instead of keeping it raw", async () => {
		const key = getClientKey(contextFor("203.0.113.5"));
		expect(key).toMatch(/^ip:[0-9a-f]{16}$/);
		expect(key).not.toContain("203.0.113.5");
	});

	it("falls back to the first x-forwarded-for value, then unknown", async () => {
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

	const behindProxy = (visitor: string | null) => {
		const headers = new Headers();
		if (visitor) headers.set("CF-Connecting-IP", visitor);
		// Every request reaches the app from the same proxy container.
		return {
			request: new Request("http://localhost/api/test", { headers }),
			clientAddress: "10.0.1.7",
		};
	};

	it("uses the trusted proxy header for the visitor's address when configured", () => {
		const header = "cf-connecting-ip";
		expect(getClientKey(behindProxy("203.0.113.8"), header)).toBe(
			getClientKey(contextFor("203.0.113.8")),
		);
		expect(getClientKey(behindProxy("203.0.113.8"), header)).not.toBe(
			getClientKey(behindProxy("203.0.113.9"), header),
		);
		// Without the header (a request that skipped the proxy) the socket address is used.
		expect(getClientKey(behindProxy(null), header)).toBe(
			getClientKey(contextFor("10.0.1.7")),
		);
	});

	it("ignores that header unless it is configured, so it cannot be spoofed", () => {
		expect(getClientKey(behindProxy("203.0.113.8"), null)).toBe(
			getClientKey(behindProxy("203.0.113.9"), null),
		);
	});
});

describe("guardRequest behind a proxy", () => {
	beforeEach(() => resetRateLimiters());
	const previous = process.env.TRUSTED_CLIENT_IP_HEADER;
	afterEach(() => {
		if (previous === undefined) delete process.env.TRUSTED_CLIENT_IP_HEADER;
		else process.env.TRUSTED_CLIENT_IP_HEADER = previous;
	});

	const viaProxy = (visitor: string) => ({
		request: new Request("http://localhost/api/test", {
			method: "POST",
			headers: { "CF-Connecting-IP": visitor },
		}),
		clientAddress: "10.0.1.7",
	});

	it("ignores an invalid header name instead of failing every request", async () => {
		process.env.TRUSTED_CLIENT_IP_HEADER = "CF-Connecting-IP:";
		expect(trustedClientIpHeader()).toBeNull();
		expect(
			await guardRequest(viaProxy("203.0.113.5"), "guide-token"),
		).toBeNull();
	});

	it("limits each visitor on their own when TRUSTED_CLIENT_IP_HEADER is set", async () => {
		process.env.TRUSTED_CLIENT_IP_HEADER = "CF-Connecting-IP";
		for (let i = 0; i < RATE_LIMIT_POLICIES["guide-token"].limit; i++) {
			expect(
				await guardRequest(viaProxy("203.0.113.5"), "guide-token"),
			).toBeNull();
		}
		expect(
			await guardRequest(viaProxy("203.0.113.5"), "guide-token"),
		).not.toBeNull();
		expect(
			await guardRequest(viaProxy("203.0.113.6"), "guide-token"),
		).toBeNull();
	});
});
