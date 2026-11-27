import { getSecret } from "astro:env/server";
import type { APIRoute } from "astro";
import { loadCorridorData } from "../../../lib/corridor/corridor-data";
import {
	answerLocally,
	answerWithGemini,
	type GuideAnswer,
} from "../../../lib/guide/guide-answer";
import { guardRequest } from "../../../lib/security/api-guard";

export const prerender = false;

const MAX_QUESTION_LENGTH = 500;
/** Alias that follows Google's current Flash model. Override with GEMINI_TEXT_MODEL. */
const DEFAULT_TEXT_MODEL = "gemini-flash-latest";

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
 * The Guide's text answer for case 1. Uses Gemini when GEMINI_API_KEY is set
 * and falls back to the local Guide on any failure, so the demo always answers.
 */
export const POST: APIRoute = async (context) => {
	const limited = guardRequest(context, "guide-ask");
	if (limited) return limited;
	const { request } = context;
	let question: unknown;
	try {
		({ question } = (await request.json()) as { question?: unknown });
	} catch {
		return json({ error: "Send JSON with a question." }, 400);
	}
	if (
		typeof question !== "string" ||
		question.trim() === "" ||
		question.length > MAX_QUESTION_LENGTH
	) {
		return json(
			{
				error: `The question must have 1 to ${MAX_QUESTION_LENGTH} characters.`,
			},
			400,
		);
	}

	const { data } = await loadCorridorData();
	const apiKey = getSecret("GEMINI_API_KEY");
	let answer: GuideAnswer;
	if (apiKey) {
		try {
			answer = await answerWithGemini(
				data,
				question,
				apiKey,
				getSecret("GEMINI_TEXT_MODEL") || DEFAULT_TEXT_MODEL,
			);
		} catch (error) {
			console.warn("[guide] Gemini failed, using the local Guide", error);
			answer = answerLocally(data, question);
		}
	} else {
		answer = answerLocally(data, question);
	}
	return json(answer, 200);
};
