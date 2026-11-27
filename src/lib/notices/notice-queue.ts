import {
	MAX_WAITING,
	MIN_VISIBLE_MS,
	NOTICE_PRIORITY,
	type Notice,
	type NoticeQueueState,
} from "./notice-types";

/**
 * The single notice slot (docs/26, 3.3): one visible, up to three waiting,
 * priority arroyo > anfitrión > desvío > reporte, dedupe by key, expiry and a
 * 20 s minimum before anything closes by itself. Every function is pure and
 * returns the same object when nothing changed.
 */

export function emptyNoticeQueue(): NoticeQueueState {
	return { visible: null, shownAt: null, waiting: [], seenModals: [] };
}

const priority = (notice: Notice) => NOTICE_PRIORITY[notice.kind];

/** Same content: an update that would change nothing on screen. */
const sameNotice = (a: Notice, b: Notice) =>
	JSON.stringify(a) === JSON.stringify(b);

const isExpired = (notice: Notice, nowMs: number) =>
	notice.expiresAt !== undefined && notice.expiresAt <= nowMs;

/** Adds to the waiting list, highest priority first (stable), max `MAX_WAITING`. */
function enqueue(waiting: readonly Notice[], notice: Notice): Notice[] {
	const next = waiting.filter((item) => item.key !== notice.key);
	const at = next.findIndex((item) => priority(item) > priority(notice));
	next.splice(at === -1 ? next.length : at, 0, notice);
	return next.slice(0, MAX_WAITING);
}

/** Shows the next waiting notice that has not expired. */
function advance(state: NoticeQueueState, nowMs: number): NoticeQueueState {
	const waiting = state.waiting.filter((item) => !isExpired(item, nowMs));
	const [visible = null, ...rest] = waiting;
	return {
		...state,
		visible,
		shownAt: visible ? nowMs : null,
		waiting: rest,
	};
}

/** A new notice or an update of one already shown or waiting (same key). */
export function pushNotice(
	state: NoticeQueueState,
	notice: Notice,
	nowMs: number,
): NoticeQueueState {
	const { visible } = state;
	if (visible?.key === notice.key) {
		return sameNotice(visible, notice) ? state : { ...state, visible: notice };
	}
	if (isExpired(notice, nowMs)) return state;
	if (notice.form === "modal" && state.seenModals.includes(notice.key)) {
		return state;
	}
	const waitingTwin = state.waiting.find((item) => item.key === notice.key);
	if (waitingTwin) {
		return sameNotice(waitingTwin, notice)
			? state
			: { ...state, waiting: enqueue(state.waiting, notice) };
	}
	if (!visible) {
		return { ...state, visible: notice, shownAt: nowMs };
	}
	if (priority(notice) < priority(visible)) {
		const waiting = isExpired(visible, nowMs)
			? state.waiting
			: enqueue(state.waiting, visible);
		return { ...state, visible: notice, shownAt: nowMs, waiting };
	}
	return { ...state, waiting: enqueue(state.waiting, notice) };
}

/** The visitor closed or answered a notice. A modal never comes back. */
export function dismissNotice(
	state: NoticeQueueState,
	key: string,
	nowMs: number,
): NoticeQueueState {
	if (state.visible?.key === key) {
		const seenModals =
			state.visible.form === "modal" && !state.seenModals.includes(key)
				? [...state.seenModals, key]
				: state.seenModals;
		return advance({ ...state, seenModals }, nowMs);
	}
	if (!state.waiting.some((item) => item.key === key)) return state;
	return {
		...state,
		waiting: state.waiting.filter((item) => item.key !== key),
	};
}

/** The subject is no longer true (assignment ended, saturation dropped). */
export function resolveNotice(
	state: NoticeQueueState,
	key: string,
	nowMs: number,
): NoticeQueueState {
	const expire = (notice: Notice): Notice =>
		notice.key === key && !isExpired(notice, nowMs)
			? { ...notice, expiresAt: nowMs }
			: notice;
	const visible = state.visible ? expire(state.visible) : null;
	const changed =
		visible !== state.visible ||
		state.waiting.some((item) => expire(item) !== item);
	if (!changed) return state;
	return tickNotices(
		{ ...state, visible, waiting: state.waiting.map(expire) },
		nowMs,
	);
}

/** Can the visible notice close by itself now? Never before 20 s. */
export function canCloseByItself(
	state: NoticeQueueState,
	nowMs: number,
): boolean {
	return state.shownAt !== null && nowMs - state.shownAt >= MIN_VISIBLE_MS;
}

/** Drops expired notices. The visible one only goes after its 20 s minimum. */
export function tickNotices(
	state: NoticeQueueState,
	nowMs: number,
): NoticeQueueState {
	const waiting = state.waiting.filter((item) => !isExpired(item, nowMs));
	const dropped = waiting.length !== state.waiting.length;
	const next = dropped ? { ...state, waiting } : state;
	if (
		next.visible &&
		isExpired(next.visible, nowMs) &&
		canCloseByItself(next, nowMs)
	) {
		return advance(next, nowMs);
	}
	if (!next.visible && next.waiting.length > 0) return advance(next, nowMs);
	return next;
}

/** `reiniciar`: empties the slot, the queue and the answered modals. */
export function resetNotices(): NoticeQueueState {
	return emptyNoticeQueue();
}

/** True while something could still change with time alone. */
export function needsTicking(state: NoticeQueueState): boolean {
	return (
		state.waiting.some((item) => item.expiresAt !== undefined) ||
		state.visible?.expiresAt !== undefined
	);
}
