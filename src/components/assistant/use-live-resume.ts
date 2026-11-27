// A result that opens another page reloads it (no client router) and ends
// Live: mark it on the way out and reopen it on the next page. Shared by the
// dock and the /inicio chat, so moving between them keeps her talking.

import { useEffect, useRef, useState } from "react";
import {
	type LiveResume,
	markLiveResume,
	takeLiveResume,
} from "../../lib/guide/live-resume";

interface ResumableLive {
	active: boolean;
	/** True while she is mid-answer, so the next page asks her to go on. */
	unspoken: () => boolean;
	resume: (unspoken: boolean) => Promise<void>;
}

function sessionStore(): Storage | null {
	try {
		return window.sessionStorage;
	} catch {
		return null;
	}
}

/**
 * Marks Live on pagehide and resumes it once on mount. `onResume` runs right
 * before Live reopens (the dock opens itself). True once Live was resumed.
 */
export function useLiveResume(
	live: ResumableLive,
	onResume?: () => void,
): boolean {
	const [resumed, setResumed] = useState<LiveResume | null>(null);
	const liveRef = useRef(live);
	liveRef.current = live;
	const onResumeRef = useRef(onResume);
	onResumeRef.current = onResume;

	useEffect(() => {
		if (!live.active) return;
		const leave = () =>
			markLiveResume(sessionStore(), Date.now(), liveRef.current.unspoken());
		window.addEventListener("pagehide", leave);
		return () => window.removeEventListener("pagehide", leave);
	}, [live.active]);

	useEffect(() => {
		setResumed(takeLiveResume(sessionStore(), Date.now()));
	}, []);

	// Runs one render after the mark is taken, so the restored conversation
	// goes to Live as its history.
	useEffect(() => {
		if (!resumed) return;
		onResumeRef.current?.();
		void liveRef.current.resume(resumed.unspoken);
	}, [resumed]);

	return resumed !== null;
}
