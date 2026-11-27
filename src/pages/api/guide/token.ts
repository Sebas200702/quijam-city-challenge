import { getSecret } from "astro:env/server";
import { GoogleGenAI } from "@google/genai";
import type { APIRoute } from "astro";
import { AssistantRequestError } from "../../../lib/assistant/assistant-server";
import type {
	GuideMode,
	LiveTokenResponse,
} from "../../../lib/guide/guide-types";
import {
	type LiveTokenRequest,
	liveConduitAgent,
	liveConduitSetup,
	parseLiveTokenRequest,
} from "../../../lib/guide/live-agent";
import {
	buildLiveTokenConfig,
	DEFAULT_LIVE_MODEL,
} from "../../../lib/guide/live-token-config";
import { guardRequest } from "../../../lib/security/api-guard";

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

/** Empty body: the beta Guide. A body with the conversation: the Quillart AI voice. */
async function readRequest(request: Request): Promise<LiveTokenRequest | null> {
	const raw = await request.text();
	if (raw.trim() === "") return null;
	if (raw.length > MAX_BODY_BYTES) {
		throw new AssistantRequestError("The conversation is too long.");
	}
	let body: unknown;
	try {
		body = JSON.parse(raw);
	} catch {
		throw new AssistantRequestError("Send JSON with messages and context.");
	}
	return parseLiveTokenRequest(body);
}

/**
 * Issues an ephemeral Gemini Live token. The real API key never leaves the
 * server. With a conversation in the body, Live is only the voice conduit: its
 * instruction and its single tool (ask_quillart) are locked in the token, and
 * every request goes through the same orchestrator as the text chat.
 */
export const POST: APIRoute = async (context) => {
	const limited = await guardRequest(context, "guide-token");
	if (limited) return limited;
	const { url, request } = context;
	const apiKey = getSecret("GEMINI_API_KEY");
	if (!apiKey) {
		return json({ error: "GEMINI_API_KEY is not set on the server." }, 500);
	}

	let liveRequest: LiveTokenRequest | null;
	try {
		liveRequest = await readRequest(request);
	} catch (error) {
		if (error instanceof AssistantRequestError) {
			return json({ error: error.message }, error.status);
		}
		throw error;
	}

	const mode: GuideMode =
		url.searchParams.get("mode") === "text" ? "text" : "audio";
	const model = getSecret("GEMINI_LIVE_MODEL") || DEFAULT_LIVE_MODEL;
	const agent = liveRequest ? liveConduitAgent(liveRequest) : null;
	const config = buildLiveTokenConfig(
		model,
		new Date(),
		liveRequest ? liveConduitSetup(liveRequest.context) : undefined,
	);

	try {
		const ai = new GoogleGenAI({ apiKey });
		const token = await ai.authTokens.create({ config });
		if (!token.name || !config.newSessionExpireTime) {
			return json({ error: "Gemini returned no token." }, 502);
		}
		const body: LiveTokenResponse = {
			token: token.name,
			model,
			mode,
			newSessionExpiresAt: config.newSessionExpireTime,
			...(agent ? { agent } : {}),
		};
		return json(body, 200);
	} catch (error) {
		console.error("Failed to create Gemini Live token", error);
		return json({ error: "Could not create a Gemini Live token." }, 502);
	}
};
