import { getSecret } from "astro:env/server";
import type { APIRoute } from "astro";
import {
	AssistantRequestError,
	answer,
	parseAssistantRequest,
} from "../../lib/assistant/assistant-server";
import {
	ASSISTANT_STREAM_TYPE,
	createAnswerStream,
} from "../../lib/assistant/assistant-stream";
import { DEFAULT_TEXT_MODEL } from "../../lib/assistant/gemini-agent";
import { getOpenJevClient } from "../../lib/openjev/openjev-server";
import { guardRequest } from "../../lib/security/api-guard";

export const prerender = false;

/** Raw body limit, before parsing; the parser bounds the conversation again. */
const MAX_BODY_BYTES = 100_000;

function json(body: unknown, status: number): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			"Content-Type": "application/json",
			"Cache-Control": "no-store",
		},
	});
}

/**
 * One Quillart AI turn: the orchestrator routes the conversation to one
 * specialized agent, which answers with Gemini when GEMINI_API_KEY is set and
 * with the local agents otherwise or on failure. Tool calls run in the browser.
 * With "Accept: application/x-ndjson" the answer is streamed (see
 * assistant-stream.ts); otherwise it is one JSON response.
 */
export const POST: APIRoute = async (context) => {
	const limited = await guardRequest(context, "assistant");
	if (limited) return limited;
	const { request } = context;
	const raw = await request.text();
	if (raw.length > MAX_BODY_BYTES) {
		return json({ error: "The conversation is too long." }, 413);
	}
	let body: unknown;
	try {
		body = JSON.parse(raw);
	} catch {
		return json({ error: "Send JSON with messages and context." }, 400);
	}

	try {
		const parsed = parseAssistantRequest(body);
		const apiKey = getSecret("GEMINI_API_KEY");
		const deps = {
			openJev: getOpenJevClient(),
			gemini: apiKey
				? {
						apiKey,
						model: getSecret("GEMINI_TEXT_MODEL") || DEFAULT_TEXT_MODEL,
					}
				: null,
			onGeminiError: (error: unknown) =>
				console.warn(
					"[assistant] Gemini failed, using the local agents",
					error,
				),
		};
		if (request.headers.get("Accept")?.includes(ASSISTANT_STREAM_TYPE)) {
			const stream = createAnswerStream(
				(hooks) => answer(parsed, deps, hooks),
				{
					onError: (error) =>
						console.error("[assistant] Unexpected error", error),
				},
			);
			return new Response(stream, {
				status: 200,
				headers: {
					"Content-Type": `${ASSISTANT_STREAM_TYPE}; charset=utf-8`,
					"Cache-Control": "no-store",
					"X-Accel-Buffering": "no",
				},
			});
		}
		return json(await answer(parsed, deps), 200);
	} catch (error) {
		if (error instanceof AssistantRequestError) {
			return json({ error: error.message }, error.status);
		}
		console.error("[assistant] Unexpected error", error);
		return json({ error: "The assistant could not answer." }, 500);
	}
};
