// Pure rules of the match-day timeline (#44): the hour range, stepping, playback
// and how the slider reconciles its own `tiempo` events coming back from the channel.

/** First and last hour of the 2034 match day, as in the `tiempo` contract (epic #57). */
export const MATCH_DAY_START = 8;
export const MATCH_DAY_END = 23;
/** Real time between two hours while the day plays. */
export const PLAYBACK_TICK_MS = 1600;
/** Own hours still waiting for their echo; older ones are dropped. */
const MAX_PENDING_ECHOES = 16;

/** Rounds to a whole hour inside the match day. Anything not finite goes to the start. */
export function clampHour(value: number): number {
	if (!Number.isFinite(value)) return MATCH_DAY_START;
	return Math.min(MATCH_DAY_END, Math.max(MATCH_DAY_START, Math.round(value)));
}

/** Moves `delta` hours, staying inside the match day. */
export function stepHour(hour: number, delta: number): number {
	return clampHour(hour + delta);
}

/** Hour to resume from when play is pressed: the day starts over once it has ended. */
export function playbackStartHour(hour: number): number {
	const current = clampHour(hour);
	return current >= MATCH_DAY_END ? MATCH_DAY_START : current;
}

/** One playback tick: the next hour, and whether the day keeps playing after it. */
export function playbackTick(hour: number): { hour: number; playing: boolean } {
	const next = stepHour(hour, 1);
	return { hour: next, playing: next < MATCH_DAY_END };
}

/** "8:00", "15:00": the hour as people read it in Barranquilla (24 h). */
export function formatHour(hour: number): string {
	return `${clampHour(hour)}:00`;
}

/** Where an hour (fractions allowed) sits on the slider track, 0 to 100. */
export function hourToPercent(hour: number): number {
	const span = MATCH_DAY_END - MATCH_DAY_START;
	const clamped = Math.min(MATCH_DAY_END, Math.max(MATCH_DAY_START, hour));
	return ((clamped - MATCH_DAY_START) / span) * 100;
}

/** Remembers a published hour until its echo comes back from the channel. */
export function rememberSent(
	pending: readonly number[],
	hour: number,
): number[] {
	return [...pending, hour].slice(-MAX_PENDING_ECHOES);
}

/**
 * Decides what to do with a `tiempo` event: the echo of an hour this slider sent
 * (ignored, so dragging never jumps back) or another screen's hour (applied).
 */
export function reconcileEcho(
	pending: readonly number[],
	incoming: number,
): { pending: number[]; apply: boolean } {
	const index = pending.indexOf(incoming);
	if (index === -1) return { pending: [], apply: true };
	const rest = pending.slice(index + 1);
	// Our last hour came back: nothing is in flight, so showing it is safe.
	return { pending: rest, apply: rest.length === 0 };
}
