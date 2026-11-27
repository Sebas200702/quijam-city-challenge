// Shared types of the match-day timeline (#44).

/** A community event placed on the timeline, in Barranquilla local time. */
export interface AgendaMark {
	id: string;
	title: string;
	/** Minutes from local midnight. */
	startMinute: number;
	/** Minutes from local midnight; capped at the end of the day. */
	endMinute: number;
	/** "16:00" (local start time). */
	startLabel: string;
}

/** The real agenda the timeline shows: one day of published community events. */
export interface AgendaDay {
	/** Local date, YYYY-MM-DD. */
	date: string;
	isToday: boolean;
	/** Sorted by start time. */
	marks: AgendaMark[];
}
