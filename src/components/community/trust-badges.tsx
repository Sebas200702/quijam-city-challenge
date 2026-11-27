// Badges that tell people how much to trust what they read.

import { BadgeCheck, CircleAlert } from "lucide-react";
import type { ForumThread } from "../../lib/community/community-types";

/**
 * A citizen report (the triage flagged a risk in public space) stays
 * "sin confirmar" until the city confirms it. Official alerts come from the
 * city channel, never from the forum.
 */
export function CitizenReportBadge({ thread }: { thread: ForumThread }) {
	if (
		thread.moderationStatus !== "published" ||
		thread.triagePriority === "none"
	)
		return null;
	return thread.cityVerified ? (
		<span className="q-badge q-badge--optimal">
			<BadgeCheck size={14} aria-hidden="true" />
			Confirmado por la ciudad
		</span>
	) : (
		<span className="q-badge q-badge--high">
			<CircleAlert size={14} aria-hidden="true" />
			Reporte ciudadano · sin confirmar
		</span>
	);
}

export function VerifiedOrganizerBadge({ verified }: { verified: boolean }) {
	if (!verified) return null;
	return (
		<span className="q-badge q-badge--optimal">
			<BadgeCheck size={14} aria-hidden="true" />
			Organizador verificado
		</span>
	);
}
