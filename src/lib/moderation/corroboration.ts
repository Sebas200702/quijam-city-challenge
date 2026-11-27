// Corroboration (#126): when several different people report a risk at the same
// place close in time, the city should see it as more urgent than one report.
// Applies to citizen risk reports (forum threads the triage marked for the city).

import type { TriagePriority } from "./moderation-types";

/** Distinct people needed before a risk report goes up to emergency. */
export const CORROBORATION_MIN_PEOPLE = 3;

/** Reports further apart than this are not about the same moment. */
export const CORROBORATION_WINDOW_HOURS = 6;

export interface RiskReport {
	id: string;
	authorId: string | null;
	/** The place the report points at; reports without one never corroborate. */
	placeId: string | null;
	priority: TriagePriority;
	createdAt: string;
	/** The city already attended it. */
	resolved: boolean;
}

/**
 * Ids of the reports to raise from `city_attention` to `emergency`, given a
 * freshly published report and the other risk reports. Empty when the group at
 * that place is too small, too spread in time or has too few different people.
 */
export function reportsToEscalate(
	seed: RiskReport,
	others: readonly RiskReport[],
): string[] {
	if (!seed.placeId || seed.priority === "none" || seed.resolved) return [];
	const seedTime = Date.parse(seed.createdAt);
	const windowMs = CORROBORATION_WINDOW_HOURS * 60 * 60 * 1000;
	const group = [seed, ...others.filter((r) => r.id !== seed.id)].filter(
		(r) =>
			r.placeId === seed.placeId &&
			r.priority !== "none" &&
			!r.resolved &&
			r.authorId !== null &&
			Math.abs(Date.parse(r.createdAt) - seedTime) <= windowMs,
	);
	const people = new Set(group.map((r) => r.authorId));
	if (people.size < CORROBORATION_MIN_PEOPLE) return [];
	return group.filter((r) => r.priority === "city_attention").map((r) => r.id);
}
