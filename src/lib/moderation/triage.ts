// Moderation triage for community content. Same pattern as the Decisor:
// hard rules first (always win), then OpenJev on what remains, then a
// rules-only fallback when OpenJev is not configured or fails.

import type { Answer, OpenJevClient } from "../openjev/openjev-types";
import {
	applyModerationRules,
	higherPriority,
	stricterVerdict,
} from "./moderation-rules";
import type {
	ModerationDecision,
	ModerationInput,
	ModerationLabel,
	ModerationVerdict,
	TriagePriority,
} from "./moderation-types";

/** Below this confidence an OpenJev "reject" becomes "review": a person decides. */
export const MIN_REJECT_CONFIDENCE = 0.6;

const KIND_LABEL: Record<ModerationInput["kind"], string> = {
	event: "a public event announcement",
	thread: "a new forum conversation",
	post: "a reply in a forum conversation",
};

export const TRIAGE_QUESTIONS = {
	verdict: {
		type: "choice" as const,
		instructions:
			"Moderate this message for a public community platform where Barranquilla residents and visitors share events, places and conversations. Colombian Caribbean slang is normal and friendly.",
		criteria: {
			publish:
				"Respectful and on topic: can be shown to everyone, even if it complains or criticizes",
			review:
				"Borderline: possible insult, advertising, misinformation or off topic; a human moderator should check it",
			reject:
				"Clear harassment, hate, threats, sexual content or a scam; must not be published",
		},
	},
	label: {
		type: "choice" as const,
		instructions: "Main issue with the message, if any",
		criteria: {
			ok: "No issue",
			harassment: "Insults or harassment towards a person or group",
			hate: "Hate or discrimination (origin, nationality, race, gender, orientation)",
			threat: "Threats or incitement to violence",
			sexual: "Sexual content",
			spam: "Advertising or repeated promotional content",
			scam: "Fraud, fake offers or requests for money",
			off_topic: "Unrelated to the city, its events, places or community",
		},
	},
	priority: {
		type: "choice" as const,
		instructions:
			"Does the message report something the city government should know about?",
		criteria: {
			none: "No",
			city_attention:
				"Yes: a problem in public space (flooded street or arroyo, damaged infrastructure, overcharging, overcrowding, insecurity)",
			emergency: "Yes, urgent: someone may be in danger right now",
		},
	},
};

const PUBLISHED_REASON = "Publicado.";
const REVIEW_REASON =
	"Tu mensaje quedó en revisión. Un moderador de la comunidad lo revisará pronto.";
const REJECT_REASON =
	"Este mensaje no cumple las normas de la comunidad y no se publicó.";
const EMERGENCY_NOTE =
	" Si alguien está en peligro, llama ya a la Línea de Emergencias 123.";

function choiceOf(answer: Answer | undefined): {
	choice: string;
	confidence: number;
} | null {
	return answer?.type === "choice"
		? { choice: answer.choice, confidence: answer.confidence }
		: null;
}

function isOneOf<T extends string>(
	value: string,
	options: readonly T[],
): value is T {
	return (options as readonly string[]).includes(value);
}

const VERDICTS = ["publish", "review", "reject"] as const;
const PRIORITIES = ["none", "city_attention", "emergency"] as const;
const LABELS = [
	"ok",
	"harassment",
	"hate",
	"threat",
	"sexual",
	"spam",
	"scam",
	"off_topic",
] as const;

function reasonFor(
	verdict: ModerationVerdict,
	priority: TriagePriority,
	ruleReason: string | null,
): string {
	const base =
		ruleReason ??
		(verdict === "publish"
			? PUBLISHED_REASON
			: verdict === "review"
				? REVIEW_REASON
				: REJECT_REASON);
	const withCity =
		priority === "city_attention" && verdict === "publish"
			? `${base} También lo compartimos con el equipo de la ciudad.`
			: base;
	return priority === "emergency" ? `${withCity}${EMERGENCY_NOTE}` : withCity;
}

export async function triageContent(
	input: ModerationInput,
	client: OpenJevClient | null,
): Promise<ModerationDecision> {
	const rules = applyModerationRules(input);
	const rulesOnly = (): ModerationDecision => ({
		verdict: rules.verdict,
		labels: rules.labels,
		priority: rules.priority,
		reason: reasonFor(rules.verdict, rules.priority, rules.reason),
		source: "rules",
		confidence: null,
	});

	// Hard blocks never leave the server: personal data is not sent to OpenJev.
	if (rules.verdict === "reject" || !client) return rulesOnly();

	let result: Awaited<ReturnType<OpenJevClient["decide"]>>;
	try {
		result = await client.decide(
			{
				platform: "Barranquilla community platform (events, places, forum)",
				content_type: KIND_LABEL[input.kind],
				title: input.title ?? null,
				text: input.body.slice(0, 2000),
				rule_signals: rules.signals,
			},
			TRIAGE_QUESTIONS,
		);
	} catch {
		return rulesOnly();
	}
	if (!result.ok) return rulesOnly();

	const verdictAnswer = choiceOf(result.answers.verdict);
	if (!verdictAnswer || !isOneOf(verdictAnswer.choice, VERDICTS)) {
		return rulesOnly();
	}

	let jevVerdict: ModerationVerdict = verdictAnswer.choice;
	if (
		jevVerdict === "reject" &&
		verdictAnswer.confidence < MIN_REJECT_CONFIDENCE
	) {
		jevVerdict = "review";
	}
	const verdict = stricterVerdict(rules.verdict, jevVerdict);

	const labelAnswer = choiceOf(result.answers.label);
	const labels = new Set<ModerationLabel>(
		rules.labels.filter((label) => label !== "ok"),
	);
	if (
		labelAnswer &&
		isOneOf(labelAnswer.choice, LABELS) &&
		labelAnswer.choice !== "ok"
	) {
		labels.add(labelAnswer.choice);
	}
	if (labels.size === 0) labels.add("ok");

	const priorityAnswer = choiceOf(result.answers.priority);
	const jevPriority: TriagePriority =
		priorityAnswer && isOneOf(priorityAnswer.choice, PRIORITIES)
			? priorityAnswer.choice
			: "none";
	const priority = higherPriority(rules.priority, jevPriority);

	return {
		verdict,
		labels: [...labels],
		priority,
		reason: reasonFor(
			verdict,
			priority,
			verdict === rules.verdict ? rules.reason : null,
		),
		source: "openjev",
		confidence: verdictAnswer.confidence,
	};
}
