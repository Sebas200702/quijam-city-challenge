import type {
	Answer,
	DecisionFailureReason,
	DecisionResult,
	DecisionState,
	OpenJevClient,
	OpenJevClientOptions,
	Questions,
} from "./openjev-types";

const DEFAULT_BASE_URL = "https://api.codiv.ai";
const DEFAULT_MODEL = "openjev-latest";
const DEFAULT_TIMEOUT_MS = 4000;

/**
 * Client for the Jev-compatible System One API. Server-side only: the API key
 * must never reach the browser. It never throws on API failures; it returns
 * `{ ok: false, reason }` so the Decisor can fall back to the weighted score.
 */
export function createOpenJevClient(
	options: OpenJevClientOptions,
): OpenJevClient {
	if (!options.apiKey) {
		throw new Error("OpenJev API key is missing");
	}
	const endpoint = `${(options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "")}/v1/systemone`;
	const model = options.model ?? DEFAULT_MODEL;
	const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
	const doFetch = options.fetch ?? fetch;

	return {
		async decide(
			state: DecisionState,
			questions: Questions,
		): Promise<DecisionResult> {
			const controller = new AbortController();
			const timer = setTimeout(() => controller.abort(), timeoutMs);
			let response: Response;
			try {
				response = await doFetch(endpoint, {
					method: "POST",
					headers: {
						Authorization: `Bearer ${options.apiKey}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ model, state, questions }),
					signal: controller.signal,
				});
			} catch (error) {
				return {
					ok: false,
					reason: isAbortError(error) ? "timeout" : "network_error",
				};
			} finally {
				clearTimeout(timer);
			}

			const body = await readJson(response);
			if (!response.ok) {
				return {
					ok: false,
					reason: failureReason(response.status, body),
					status: response.status,
				};
			}
			if (!isSuccessBody(body)) {
				return {
					ok: false,
					reason: "invalid_response",
					status: response.status,
				};
			}
			return {
				ok: true,
				model: body.model,
				answers: body.answers,
				inputTokens: body.usage?.input_tokens ?? 0,
			};
		},
	};
}

function isAbortError(error: unknown): boolean {
	return error instanceof Error && error.name === "AbortError";
}

async function readJson(response: Response): Promise<unknown> {
	try {
		return await response.json();
	} catch {
		return undefined;
	}
}

function failureReason(status: number, body: unknown): DecisionFailureReason {
	if (status === 401 || status === 403) return "unauthorized";
	if (status === 429) {
		return errorType(body) === "quota_exceeded_error"
			? "quota_exceeded"
			: "rate_limited";
	}
	if (status >= 500) return "unavailable";
	return "bad_request";
}

function errorType(body: unknown): string | undefined {
	if (typeof body !== "object" || body === null) return undefined;
	const detail = (body as { detail?: unknown }).detail;
	if (typeof detail !== "object" || detail === null || Array.isArray(detail))
		return undefined;
	const type = (detail as { error_type?: unknown }).error_type;
	return typeof type === "string" ? type : undefined;
}

interface SuccessBody {
	model: string;
	answers: Record<string, Answer>;
	usage?: { input_tokens?: number };
}

function isSuccessBody(body: unknown): body is SuccessBody {
	if (typeof body !== "object" || body === null) return false;
	const candidate = body as Partial<SuccessBody>;
	return (
		typeof candidate.model === "string" &&
		typeof candidate.answers === "object" &&
		candidate.answers !== null
	);
}
