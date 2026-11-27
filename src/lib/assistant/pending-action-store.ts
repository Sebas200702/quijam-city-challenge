// An action Quillart AI prepared while the person had no session (U02) must
// survive signing in, even when the sign-in link opens in another tab (where
// sessionStorage starts empty). So, only while an action is waiting, the
// conversation is also kept on this device for a short while, and dropped as
// soon as the action is confirmed, cancelled or too old. It never runs by
// itself: after signing in the card shows "Confirmar" again.

export const PENDING_ACTION_KEY = "quillart-pending-action";
/** Long enough to create an account and confirm the e-mail. */
export const PENDING_ACTION_TTL_MS = 30 * 60 * 1000;

type Storage = Pick<globalThis.Storage, "getItem" | "setItem" | "removeItem">;

interface Stored<T> {
	at: number;
	value: T;
}

export function savePendingAction<T>(
	storage: Storage | null,
	value: T,
	now: number = Date.now(),
): void {
	try {
		storage?.setItem(
			PENDING_ACTION_KEY,
			JSON.stringify({ at: now, value } satisfies Stored<T>),
		);
	} catch {
		// Storage full or blocked: the tab's own copy still works.
	}
}

export function clearPendingAction(storage: Storage | null): void {
	try {
		storage?.removeItem(PENDING_ACTION_KEY);
	} catch {
		// Nothing to clear.
	}
}

/** The saved conversation with its waiting action, or null when none or stale. */
export function loadPendingAction<T>(
	storage: Storage | null,
	now: number = Date.now(),
	ttl: number = PENDING_ACTION_TTL_MS,
): T | null {
	try {
		const raw = storage?.getItem(PENDING_ACTION_KEY);
		if (!raw) return null;
		const stored = JSON.parse(raw) as Partial<Stored<T>>;
		if (
			typeof stored.at !== "number" ||
			now - stored.at > ttl ||
			stored.at > now ||
			stored.value === undefined
		) {
			clearPendingAction(storage);
			return null;
		}
		return stored.value;
	} catch {
		clearPendingAction(storage);
		return null;
	}
}

export function localStore(): Storage | null {
	try {
		return typeof window === "undefined" ? null : window.localStorage;
	} catch {
		return null;
	}
}
