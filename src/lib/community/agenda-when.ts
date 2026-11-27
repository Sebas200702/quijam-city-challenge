// Date filter of the agenda ("hoy", "manana", "finde" or a YYYY-MM-DD day),
// always counted in Barranquilla time.

import { isoToBogotaLocal } from "./community-rules";

const DAY_MS = 24 * 60 * 60 * 1000;

function addDays(day: string, days: number): string {
	return new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY_MS)
		.toISOString()
		.slice(0, 10);
}

/** Barranquilla calendar day (YYYY-MM-DD) of an instant. */
export function bogotaDay(iso: string): string {
	return isoToBogotaLocal(iso).slice(0, 10);
}

/** Inclusive range of days the filter covers; null when there is no filter. */
export function whenRange(
	when: string,
	now: Date = new Date(),
): { from: string; to: string } | null {
	const today = bogotaDay(now.toISOString());
	switch (when) {
		case "":
			return null;
		case "hoy":
			return { from: today, to: today };
		case "manana": {
			const tomorrow = addDays(today, 1);
			return { from: tomorrow, to: tomorrow };
		}
		case "finde": {
			// Saturday and Sunday of this week; on Sunday, only what is left.
			const weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
			if (weekday === 0) return { from: today, to: today };
			const saturday = addDays(today, 6 - weekday);
			return { from: saturday, to: addDays(saturday, 1) };
		}
		default:
			return { from: when, to: when };
	}
}

export function matchesWhen(
	startsAt: string,
	when: string,
	now: Date = new Date(),
): boolean {
	const range = whenRange(when, now);
	if (!range) return true;
	const day = bogotaDay(startsAt);
	return day >= range.from && day <= range.to;
}
