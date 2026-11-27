// A result that opens another page reloads it (no client router), which ends
// the Gemini Live session. Before the page goes, the page marks that Live was
// on; the next page takes the mark once and reopens Live.

type ResumeStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const RESUME_KEY = "quillart.live.resume";

/** Longest gap between leaving a page and resuming on the next one. */
export const LIVE_RESUME_WINDOW_MS = 30_000;

/** What the next page needs to know about the Live session that went away. */
export interface LiveResume {
	/** She was mid-answer (asked, not yet spoken, or audio still queued). */
	unspoken: boolean;
}

/** Marks that Live was on when the page went away. */
export function markLiveResume(
	storage: ResumeStorage | null,
	now: number,
	unspoken = false,
): void {
	try {
		storage?.setItem(RESUME_KEY, JSON.stringify({ at: now, unspoken }));
	} catch {
		// Storage blocked: Live simply does not resume.
	}
}

function parseMark(raw: string): { at: number; unspoken: boolean } | null {
	try {
		const value: unknown = JSON.parse(raw);
		// Older marks were just the timestamp.
		if (typeof value === "number") return { at: value, unspoken: false };
		if (value && typeof value === "object" && "at" in value) {
			const mark = value as { at: unknown; unspoken?: unknown };
			if (typeof mark.at !== "number") return null;
			return { at: mark.at, unspoken: mark.unspoken === true };
		}
		return null;
	} catch {
		return null;
	}
}

/** The mark, once, when the previous page left with Live on moments ago. */
export function takeLiveResume(
	storage: ResumeStorage | null,
	now: number,
): LiveResume | null {
	try {
		const raw = storage?.getItem(RESUME_KEY);
		storage?.removeItem(RESUME_KEY);
		if (!raw) return null;
		const mark = parseMark(raw);
		if (!mark || !Number.isFinite(mark.at)) return null;
		const gap = now - mark.at;
		if (gap < 0 || gap > LIVE_RESUME_WINDOW_MS) return null;
		return { unspoken: mark.unspoken };
	} catch {
		return null;
	}
}
