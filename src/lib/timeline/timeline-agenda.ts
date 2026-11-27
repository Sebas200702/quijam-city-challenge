// Links the timeline with what the community publishes: picks the day of the real
// agenda (today, or the next day that has events) and places its events on the hours.

import { isoToBogotaLocal } from "../community/community-rules";
import type { CommunityEvent } from "../community/community-types";
import { MATCH_DAY_END, MATCH_DAY_START } from "./timeline";
import type { AgendaDay, AgendaMark } from "./timeline-types";

const DAY_MINUTES = 24 * 60;
/** Events without an end time take one hour on the timeline. */
const DEFAULT_DURATION_MIN = 60;
/** The slider's last hour covers 23:00 to midnight. */
const WINDOW = {
	start: MATCH_DAY_START * 60,
	end: (MATCH_DAY_END + 1) * 60,
};

/** Only content anyone can see: published, not cancelled, not held for review. */
function isPublic(event: CommunityEvent): boolean {
	return event.status === "published" && event.moderationStatus === "published";
}

function minuteOf(local: string): number {
	return Number(local.slice(11, 13)) * 60 + Number(local.slice(14, 16));
}

function toMark(event: CommunityEvent): { date: string; mark: AgendaMark } {
	const start = isoToBogotaLocal(event.startsAt);
	const date = start.slice(0, 10);
	const startMinute = minuteOf(start);
	let endMinute = startMinute + DEFAULT_DURATION_MIN;
	if (event.endsAt) {
		const end = isoToBogotaLocal(event.endsAt);
		endMinute = end.slice(0, 10) === date ? minuteOf(end) : DAY_MINUTES;
	}
	return {
		date,
		mark: {
			id: event.id,
			title: event.title,
			startMinute,
			endMinute: Math.min(DAY_MINUTES, Math.max(endMinute, startMinute + 1)),
			startLabel: start.slice(11, 16).replace(/^0/, ""),
		},
	};
}

function overlaps(mark: AgendaMark, from: number, to: number): boolean {
	return mark.startMinute < to && mark.endMinute > from;
}

/**
 * The agenda day of the timeline: today in Barranquilla when it has public events
 * between 8:00 and midnight, otherwise the next day that has. Null without any.
 */
export function buildAgendaDay(
	events: readonly CommunityEvent[],
	now: Date = new Date(),
): AgendaDay | null {
	const today = isoToBogotaLocal(now.toISOString()).slice(0, 10);
	const byDate = new Map<string, AgendaMark[]>();
	for (const event of events) {
		if (!isPublic(event)) continue;
		const { date, mark } = toMark(event);
		if (date < today || !overlaps(mark, WINDOW.start, WINDOW.end)) continue;
		byDate.set(date, [...(byDate.get(date) ?? []), mark]);
	}
	const [date] = [...byDate.keys()].sort();
	if (!date) return null;
	const marks = (byDate.get(date) ?? []).sort(
		(a, b) => a.startMinute - b.startMinute || a.title.localeCompare(b.title),
	);
	return { date, isToday: date === today, marks };
}

/** Events going on during the hour that starts at `hour` (e.g. 16 → 16:00 to 17:00). */
export function marksAtHour(day: AgendaDay | null, hour: number): AgendaMark[] {
	if (!day) return [];
	return day.marks.filter((mark) => overlaps(mark, hour * 60, (hour + 1) * 60));
}

/** Where each event starts on the slider, in hours (fractions allowed), inside the day. */
export function markHours(day: AgendaDay | null): number[] {
	if (!day) return [];
	const hours = day.marks.map((mark) =>
		Math.max(MATCH_DAY_START, mark.startMinute / 60),
	);
	return [...new Set(hours)];
}
