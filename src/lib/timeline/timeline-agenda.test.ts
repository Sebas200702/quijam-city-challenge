import { describe, expect, it } from "vitest";
import type { CommunityEvent } from "../community/community-types";
import { buildAgendaDay, markHours, marksAtHour } from "./timeline-agenda";

/** 10:00 in Barranquilla (UTC-5) on 28 Nov 2026. */
const NOW = new Date("2026-11-28T15:00:00Z");

function event(
	id: string,
	startsAt: string,
	endsAt: string | null,
	overrides: Partial<CommunityEvent> = {},
): CommunityEvent {
	return {
		id,
		title: `Evento ${id}`,
		description: "Descripción del evento.",
		category: "culture",
		startsAt,
		endsAt,
		placeId: null,
		locationText: "Gran Malecón",
		capacity: null,
		registeredCount: 0,
		isFree: true,
		priceCop: null,
		organizerId: null,
		organizerName: "Vecinos",
		organizerVerified: false,
		status: "published",
		createdAt: "2026-11-20T12:00:00Z",
		moderationStatus: "published",
		triagePriority: "none",
		...overrides,
	};
}

describe("buildAgendaDay", () => {
	it("returns null without public events", () => {
		expect(buildAgendaDay([], NOW)).toBeNull();
		expect(
			buildAgendaDay(
				[
					event("held", "2026-11-28T21:00:00Z", null, {
						moderationStatus: "held",
					}),
					event("off", "2026-11-28T21:00:00Z", null, { status: "cancelled" }),
				],
				NOW,
			),
		).toBeNull();
	});

	it("uses today's events in local time, sorted by start", () => {
		const day = buildAgendaDay(
			[
				// 16:00 to 18:00 local
				event("b", "2026-11-28T21:00:00Z", "2026-11-28T23:00:00Z"),
				// 11:30 local, no end: one hour
				event("a", "2026-11-28T16:30:00Z", null),
				// Tomorrow: not today's agenda
				event("c", "2026-11-29T21:00:00Z", null),
			],
			NOW,
		);
		expect(day?.date).toBe("2026-11-28");
		expect(day?.isToday).toBe(true);
		expect(day?.marks.map((mark) => mark.id)).toEqual(["a", "b"]);
		expect(day?.marks[0]).toMatchObject({
			startMinute: 11 * 60 + 30,
			endMinute: 12 * 60 + 30,
			startLabel: "11:30",
		});
	});

	it("falls back to the next day that has events", () => {
		const day = buildAgendaDay(
			[
				event("late", "2026-12-02T01:00:00Z", null),
				event("next", "2026-11-30T14:00:00Z", null),
			],
			NOW,
		);
		expect(day?.date).toBe("2026-11-30");
		expect(day?.isToday).toBe(false);
		expect(day?.marks.map((mark) => mark.startLabel)).toEqual(["9:00"]);
	});

	it("skips events outside 8:00 to midnight and days already gone", () => {
		const day = buildAgendaDay(
			[
				// 6:00 to 7:30 local: before the match day opens
				event("dawn", "2026-11-28T11:00:00Z", "2026-11-28T12:30:00Z"),
				// Yesterday
				event("old", "2026-11-27T20:00:00Z", null),
				// 6:00 to 9:00 local: still on at 8:00
				event("run", "2026-11-29T11:00:00Z", "2026-11-29T14:00:00Z"),
			],
			NOW,
		);
		expect(day?.date).toBe("2026-11-29");
		expect(day?.marks.map((mark) => mark.id)).toEqual(["run"]);
	});

	it("caps events that end after midnight at the end of the day", () => {
		const day = buildAgendaDay(
			[event("party", "2026-11-29T03:00:00Z", "2026-11-29T07:00:00Z")],
			NOW,
		);
		expect(day?.marks[0]).toMatchObject({
			startMinute: 22 * 60,
			endMinute: 24 * 60,
		});
	});
});

describe("marksAtHour and markHours", () => {
	const day = buildAgendaDay(
		[
			event("b", "2026-11-28T21:00:00Z", "2026-11-28T23:00:00Z"),
			event("a", "2026-11-28T16:30:00Z", null),
		],
		NOW,
	);

	it("lists the events going on during an hour", () => {
		expect(marksAtHour(day, 11).map((mark) => mark.id)).toEqual(["a"]);
		expect(marksAtHour(day, 12).map((mark) => mark.id)).toEqual(["a"]);
		expect(marksAtHour(day, 17).map((mark) => mark.id)).toEqual(["b"]);
		expect(marksAtHour(day, 18)).toEqual([]);
		expect(marksAtHour(null, 18)).toEqual([]);
	});

	it("places each start on the slider", () => {
		expect(markHours(day)).toEqual([11.5, 16]);
		expect(markHours(null)).toEqual([]);
	});
});
