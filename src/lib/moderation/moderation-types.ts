// Types for the community moderation triage: hard rules first, OpenJev second.

export type ContentKind = "event" | "thread" | "post";

/** publish: visible to everyone. review: held for a city moderator. reject: not stored. */
export type ModerationVerdict = "publish" | "review" | "reject";

export type ModerationLabel =
	| "ok"
	| "personal_data"
	| "harassment"
	| "hate"
	| "threat"
	| "sexual"
	| "spam"
	| "scam"
	| "misinformation"
	| "impersonation"
	| "off_topic";

/** Does the message also carry something the city must act on? */
export type TriagePriority = "none" | "city_attention" | "emergency";

export type ModerationSource = "rules" | "openjev";

export interface ModerationInput {
	kind: ContentKind;
	title?: string;
	body: string;
}

export interface RuleFindings {
	verdict: ModerationVerdict;
	labels: ModerationLabel[];
	priority: TriagePriority;
	/** Short English notes sent to OpenJev as signals; never personal data. */
	signals: string[];
	/** User-facing explanation when the rules block or hold the message. */
	reason: string | null;
}

export interface ModerationDecision {
	verdict: ModerationVerdict;
	labels: ModerationLabel[];
	priority: TriagePriority;
	/** Spanish, shown to the author. */
	reason: string;
	source: ModerationSource;
	/** OpenJev confidence for the verdict, null when only rules decided. */
	confidence: number | null;
}

/** Stored moderation state of a published or held record. */
export type ModerationStatus = "published" | "held" | "removed";
