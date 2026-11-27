// Trust policy on top of the triage: some content waits for a person even when
// the text looks fine, because of who publishes it and what it asks for.

import { stricterVerdict } from "./moderation-rules";
import type { ContentKind, ModerationDecision } from "./moderation-types";

/** Accounts younger than this publish their first event after a review. */
export const NEW_ACCOUNT_HOURS = 24;

/** Distinct people reporting a piece of content before it is held for review. */
export const COMMUNITY_REPORT_HOLD_THRESHOLD = 3;

export interface AuthorTrust {
	kind: ContentKind;
	accountAgeHours: number;
	/** Events by this person that are already published. */
	publishedEvents: number;
	isVerifiedOrganizer: boolean;
	/** Only for events: it charges an entrance fee. */
	isPaidEvent: boolean;
}

const PAID_EVENT_REASON =
	"Tu evento con costo quedó en revisión: así evitamos estafas. Los organizadores verificados por la ciudad publican de inmediato.";
const FIRST_EVENT_REASON =
	"Tu primer evento quedó en revisión: así cuidamos la agenda de la ciudad. Un moderador lo revisará pronto.";

export function applyTrustPolicy(
	decision: ModerationDecision,
	trust: AuthorTrust,
): ModerationDecision {
	if (
		trust.kind !== "event" ||
		trust.isVerifiedOrganizer ||
		decision.verdict !== "publish"
	) {
		return decision;
	}
	const reason = trust.isPaidEvent
		? PAID_EVENT_REASON
		: trust.accountAgeHours < NEW_ACCOUNT_HOURS && trust.publishedEvents === 0
			? FIRST_EVENT_REASON
			: null;
	if (!reason) return decision;
	return {
		...decision,
		verdict: stricterVerdict(decision.verdict, "review"),
		reason,
	};
}
