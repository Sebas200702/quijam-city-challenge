import { describe, expect, it, vi } from "vitest";
import { createOpenJevClient } from "./openjev-client";

const API_KEY = "sk-codiv-test";

function jsonResponse(
	status: number,
	body: unknown,
	headers: Record<string, string> = {},
) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "content-type": "application/json", ...headers },
	});
}

const routeQuestion = {
	type: "choice" as const,
	instructions: "Which route best fits this visitor",
	criteria: {
		bus_transmetro: "Public transport via Troncal Murillo",
		taxi_fair_fare: "Verified taxi with reference fare",
	},
};

describe("createOpenJevClient", () => {
	it("sends a System One request with bearer auth and returns the choice answer", async () => {
		const fetchMock = vi.fn(async () =>
			jsonResponse(200, {
				model: "openjev-0.1",
				answers: {
					route: {
						type: "choice",
						choice: "bus_transmetro",
						probabilities: { bus_transmetro: 0.8, taxi_fair_fare: 0.2 },
						confidence: 0.28,
					},
				},
				usage: { input_tokens: 120, output_tokens: 0 },
			}),
		);
		const client = createOpenJevClient({ apiKey: API_KEY, fetch: fetchMock });

		const result = await client.decide(
			{ origin: "Gran Malecon" },
			{ route: routeQuestion },
		);

		expect(fetchMock).toHaveBeenCalledOnce();
		const [url, init] = fetchMock.mock.calls[0] as unknown as [
			string,
			RequestInit,
		];
		expect(url).toBe("https://api.codiv.ai/v1/systemone");
		expect(init.method).toBe("POST");
		expect((init.headers as Record<string, string>).Authorization).toBe(
			`Bearer ${API_KEY}`,
		);
		expect(JSON.parse(init.body as string)).toEqual({
			model: "openjev-latest",
			state: { origin: "Gran Malecon" },
			questions: { route: routeQuestion },
		});
		expect(result).toEqual({
			ok: true,
			model: "openjev-0.1",
			answers: {
				route: {
					type: "choice",
					choice: "bus_transmetro",
					probabilities: { bus_transmetro: 0.8, taxi_fair_fare: 0.2 },
					confidence: 0.28,
				},
			},
			inputTokens: 120,
		});
	});

	it("uses the configured base URL and model", async () => {
		const fetchMock = vi.fn(async () =>
			jsonResponse(200, {
				model: "jev-1",
				answers: {},
				usage: { input_tokens: 1, output_tokens: 0 },
			}),
		);
		const client = createOpenJevClient({
			apiKey: API_KEY,
			baseUrl: "https://api.typesafe.ai/",
			model: "jev-latest",
			fetch: fetchMock,
		});

		await client.decide("state", { route: routeQuestion });

		const [url, init] = fetchMock.mock.calls[0] as unknown as [
			string,
			RequestInit,
		];
		expect(url).toBe("https://api.typesafe.ai/v1/systemone");
		expect(JSON.parse(init.body as string).model).toBe("jev-latest");
	});

	it("returns quota_exceeded when the free quota is used up", async () => {
		const fetchMock = vi.fn(async () =>
			jsonResponse(429, {
				detail: {
					error_type: "quota_exceeded_error",
					message: "Quota used up",
				},
			}),
		);
		const client = createOpenJevClient({ apiKey: API_KEY, fetch: fetchMock });

		const result = await client.decide("state", { route: routeQuestion });

		expect(result).toEqual({
			ok: false,
			reason: "quota_exceeded",
			status: 429,
		});
	});

	it("returns rate_limited on a 429 rate limit error", async () => {
		const fetchMock = vi.fn(async () =>
			jsonResponse(429, {
				detail: { error_type: "rate_limit_error", message: "Slow down" },
			}),
		);
		const client = createOpenJevClient({ apiKey: API_KEY, fetch: fetchMock });

		const result = await client.decide("state", { route: routeQuestion });

		expect(result).toEqual({ ok: false, reason: "rate_limited", status: 429 });
	});

	it("returns unauthorized on 401 and 403", async () => {
		for (const status of [401, 403]) {
			const fetchMock = vi.fn(async () =>
				jsonResponse(status, {
					detail: { error_type: "authentication_error", message: "Bad key" },
				}),
			);
			const client = createOpenJevClient({ apiKey: API_KEY, fetch: fetchMock });

			const result = await client.decide("state", { route: routeQuestion });

			expect(result).toEqual({ ok: false, reason: "unauthorized", status });
		}
	});

	it("returns unavailable on 529 overload and other server errors", async () => {
		for (const status of [500, 529]) {
			const fetchMock = vi.fn(async () =>
				jsonResponse(status, { detail: { error_type: "overloaded_error" } }),
			);
			const client = createOpenJevClient({ apiKey: API_KEY, fetch: fetchMock });

			const result = await client.decide("state", { route: routeQuestion });

			expect(result).toEqual({ ok: false, reason: "unavailable", status });
		}
	});

	it("returns bad_request on 400 and 422", async () => {
		for (const status of [400, 422]) {
			const fetchMock = vi.fn(async () =>
				jsonResponse(status, { detail: "Too many score levels." }),
			);
			const client = createOpenJevClient({ apiKey: API_KEY, fetch: fetchMock });

			const result = await client.decide("state", { route: routeQuestion });

			expect(result).toEqual({ ok: false, reason: "bad_request", status });
		}
	});

	it("returns network_error when fetch throws", async () => {
		const fetchMock = vi.fn(async () => {
			throw new TypeError("fetch failed");
		});
		const client = createOpenJevClient({ apiKey: API_KEY, fetch: fetchMock });

		const result = await client.decide("state", { route: routeQuestion });

		expect(result).toEqual({ ok: false, reason: "network_error" });
	});

	it("returns timeout when the API does not answer in time", async () => {
		const fetchMock = vi.fn(
			(_url: string | URL | Request, init?: RequestInit) =>
				new Promise<Response>((_resolve, reject) => {
					init?.signal?.addEventListener("abort", () =>
						reject(
							new DOMException("The operation was aborted.", "AbortError"),
						),
					);
				}),
		);
		const client = createOpenJevClient({
			apiKey: API_KEY,
			timeoutMs: 10,
			fetch: fetchMock,
		});

		const result = await client.decide("state", { route: routeQuestion });

		expect(result).toEqual({ ok: false, reason: "timeout" });
	});

	it("returns invalid_response when the body has no answers", async () => {
		const fetchMock = vi.fn(async () =>
			jsonResponse(200, { model: "openjev-0.1" }),
		);
		const client = createOpenJevClient({ apiKey: API_KEY, fetch: fetchMock });

		const result = await client.decide("state", { route: routeQuestion });

		expect(result).toEqual({
			ok: false,
			reason: "invalid_response",
			status: 200,
		});
	});

	it("refuses to run without an API key", () => {
		expect(() => createOpenJevClient({ apiKey: "" })).toThrow(
			"OpenJev API key is missing",
		);
	});
});
