import { getSecret } from "astro:env/server";
import { GoogleGenAI } from "@google/genai";
import type { APIRoute } from "astro";
import type {
	GuideMode,
	LiveTokenResponse,
} from "../../../lib/guide/guide-types";
import {
	buildLiveTokenConfig,
	DEFAULT_LIVE_MODEL,
} from "../../../lib/guide/live-token-config";
import { guardRequest } from "../../../lib/security/api-guard";

export const prerender = false;

function json(body: unknown, status: number): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			"Content-Type": "application/json",
			"Cache-Control": "no-store",
		},
	});
}

/** Issues an ephemeral Gemini Live token. The real API key never leaves the server. */
export const POST: APIRoute = async (context) => {
	const limited = await guardRequest(context, "guide-token");
	if (limited) return limited;
	const { url } = context;
	const apiKey = getSecret("GEMINI_API_KEY");
	if (!apiKey) {
		return json({ error: "GEMINI_API_KEY is not set on the server." }, 500);
	}

	const mode: GuideMode =
		url.searchParams.get("mode") === "text" ? "text" : "audio";
	const model = getSecret("GEMINI_LIVE_MODEL") || DEFAULT_LIVE_MODEL;
	const config = buildLiveTokenConfig(model);

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
		};
		return json(body, 200);
	} catch (error) {
		console.error("Failed to create Gemini Live token", error);
		return json({ error: "Could not create a Gemini Live token." }, 502);
	}
};
