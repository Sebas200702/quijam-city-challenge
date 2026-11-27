// The local Guide on the phone, for when the network is gone (#47): the
// three routes from the Gran Malecón (stadium, Barrio Abajo, downtown) come
// from the corridor seed, with the same reply and trip card as /api/guide/ask.

import { CORRIDOR_SEED } from "../corridor/corridor-seed";
import type { CorridorData } from "../corridor/corridor-types";
import { answerLocally, type GuideAnswer } from "./guide-answer";
import { detectDestination } from "./guide-local";

const GUIDE_ASK_PATH = "/api/guide/ask";

/** A route answer without network, or null when the question names no known destination. */
export function offlineGuideAnswer(
	question: string,
	data: CorridorData = CORRIDOR_SEED,
): GuideAnswer | null {
	if (!detectDestination(question)) return null;
	return answerLocally(data, question);
}

/**
 * `fetch` for code that asks the Guide (Quillart AI's plan_route): when the
 * network fails, /api/guide/ask is answered on the phone instead.
 */
export function withOfflineGuide(fetchImpl: typeof fetch): typeof fetch {
	return async (input, init) => {
		try {
			return await fetchImpl(input, init);
		} catch (error) {
			const url = input instanceof Request ? input.url : String(input);
			if (!url.endsWith(GUIDE_ASK_PATH) || typeof init?.body !== "string") {
				throw error;
			}
			const { question } = JSON.parse(init.body) as { question?: unknown };
			const answer =
				typeof question === "string" ? offlineGuideAnswer(question) : null;
			if (!answer) throw error;
			return new Response(JSON.stringify(answer), {
				headers: { "Content-Type": "application/json" },
			});
		}
	};
}
