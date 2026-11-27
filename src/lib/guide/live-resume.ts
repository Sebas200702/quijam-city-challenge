// A result that opens another page reloads it (no client router), which ends
// the Gemini Live session. Before the page goes, the dock marks that Live was
// on; the dock on the next page takes the mark once and reopens Live.

type ResumeStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const RESUME_KEY = "quillart.live.resume";

/** Longest gap between leaving a page and resuming on the next one. */
export const LIVE_RESUME_WINDOW_MS = 30_000;

/** Marks that Live was on when the page went away. */
export function markLiveResume(
	storage: ResumeStorage | null,
	now: number,
): void {
	try {
		storage?.setItem(RESUME_KEY, String(now));
	} catch {
		// Storage blocked: Live simply does not resume.
	}
}

/** True once, when the previous page left with Live on moments ago. */
export function takeLiveResume(
	storage: ResumeStorage | null,
	now: number,
): boolean {
	try {
		const raw = storage?.getItem(RESUME_KEY);
		storage?.removeItem(RESUME_KEY);
		const at = Number(raw);
		return (
			!!raw &&
			Number.isFinite(at) &&
			now - at >= 0 &&
			now - at <= LIVE_RESUME_WINDOW_MS
		);
	} catch {
		return false;
	}
}
