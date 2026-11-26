// Answers a visitor's question. Gemini detects language and destination and
// words the reply using only our route data; the trip card always comes from
// planTrip(), never from the model. Without Gemini, the local Guide answers.

import type { CorridorData } from "../corridor/corridor-types";
import {
	DESTINATIONS,
	type DestinationKey,
	planTrip,
	type TripPlan,
	VISITOR_ORIGIN,
} from "../trip/trip-planner";
import {
	detectDestination,
	detectLanguage,
	GUIDE_LANGUAGES,
	type GuideLanguage,
	localReply,
} from "./guide-local";

export interface GuideAnswer {
	reply: string;
	language: GuideLanguage;
	destination: DestinationKey | null;
	plan: TripPlan | null;
	/** Who wrote the reply: the model or the local templates. */
	source: "gemini" | "local";
}

const DESTINATION_KEYS = Object.keys(DESTINATIONS) as DestinationKey[];

export function answerLocally(
	data: CorridorData,
	question: string,
): GuideAnswer {
	const language = detectLanguage(question);
	const destination = detectDestination(question);
	const plan = destination ? planTrip(data, destination) : null;
	return {
		reply: localReply(language, plan),
		language,
		destination,
		plan,
		source: "local",
	};
}

/** Facts the model may use, written in Spanish from the same plans the card shows. */
export function guideFacts(data: CorridorData): string {
	return DESTINATION_KEYS.map((key) => {
		const reply = localReply("es", planTrip(data, key));
		return `- ${key} (${DESTINATIONS[key].name}): ${reply}`;
	}).join("\n");
}

export function guideInstruction(data: CorridorData): string {
	return [
		"You are the Guide for residents and visitors in Barranquilla.",
		`The visitor is at the ${VISITOR_ORIGIN.name}.`,
		"Reply in the visitor's language, warm and brief: at most three sentences.",
		"Use only these facts (reference data, not live measurements). Never invent routes, times or prices.",
		"Prefer the green route. Mention the fair taxi range and that overcharges can be reported here.",
		"If the question is not about these destinations, offer them.",
		"Facts:",
		guideFacts(data),
		`Return JSON: language (one of ${GUIDE_LANGUAGES.join(", ")}), destination (one of ${DESTINATION_KEYS.join(", ")} or "none"), reply.`,
	].join("\n");
}

/** Validates the model's JSON; null when it does not have the expected shape. */
export function parseModelAnswer(text: string): {
	language: GuideLanguage;
	destination: DestinationKey | null;
	reply: string;
} | null {
	let value: unknown;
	try {
		value = JSON.parse(text);
	} catch {
		return null;
	}
	if (typeof value !== "object" || value === null) return null;
	const { language, destination, reply } = value as Record<string, unknown>;
	if (typeof reply !== "string" || reply.trim() === "") return null;
	if (!GUIDE_LANGUAGES.includes(language as GuideLanguage)) return null;
	const key = DESTINATION_KEYS.includes(destination as DestinationKey)
		? (destination as DestinationKey)
		: null;
	return {
		language: language as GuideLanguage,
		destination: key,
		reply: reply.trim(),
	};
}

export async function answerWithGemini(
	data: CorridorData,
	question: string,
	apiKey: string,
	model: string,
): Promise<GuideAnswer> {
	// Loaded here so the local Guide and its tests never pull in the SDK.
	const { GoogleGenAI, Type } = await import("@google/genai");
	const ai = new GoogleGenAI({ apiKey, httpOptions: { timeout: 8000 } });
	const response = await ai.models.generateContent({
		model,
		contents: question,
		config: {
			systemInstruction: guideInstruction(data),
			temperature: 0.3,
			responseMimeType: "application/json",
			responseSchema: {
				type: Type.OBJECT,
				properties: {
					language: { type: Type.STRING, enum: [...GUIDE_LANGUAGES] },
					destination: {
						type: Type.STRING,
						enum: [...DESTINATION_KEYS, "none"],
					},
					reply: { type: Type.STRING },
				},
				required: ["language", "destination", "reply"],
			},
		},
	});
	const parsed = parseModelAnswer(response.text ?? "");
	if (!parsed) throw new Error("Gemini returned an unexpected answer.");
	return {
		...parsed,
		plan: parsed.destination ? planTrip(data, parsed.destination) : null,
		source: "gemini",
	};
}
