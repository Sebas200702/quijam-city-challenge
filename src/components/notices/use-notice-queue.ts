import { useCallback, useEffect, useMemo, useState } from "react";
import {
	dismissNotice,
	emptyNoticeQueue,
	needsTicking,
	pushNotice,
	resetNotices,
	resolveNotice,
	tickNotices,
} from "../../lib/notices/notice-queue";
import type { Notice, NoticeQueueState } from "../../lib/notices/notice-types";

const TICK_MS = 5_000;

/** Queues kept by name so a slot that unmounts (Guide open) does not reopen answered modals. */
const stores = new Map<string, NoticeQueueState>();

export type NoticeQueue = ReturnType<typeof useNoticeQueue>;

/**
 * React state around the pure notice queue (src/lib/notices/notice-queue.ts).
 * `storeKey` keeps the queue alive across unmounts within the page.
 */
export function useNoticeQueue(storeKey?: string) {
	const [state, setState] = useState<NoticeQueueState>(
		() => (storeKey && stores.get(storeKey)) || emptyNoticeQueue(),
	);

	useEffect(() => {
		if (storeKey) stores.set(storeKey, state);
	}, [storeKey, state]);

	const ticking = needsTicking(state);
	useEffect(() => {
		if (!ticking) return;
		const timer = setInterval(
			() => setState((current) => tickNotices(current, Date.now())),
			TICK_MS,
		);
		return () => clearInterval(timer);
	}, [ticking]);

	const push = useCallback(
		(notice: Notice) =>
			setState((current) => pushNotice(current, notice, Date.now())),
		[],
	);
	const dismiss = useCallback(
		(key: string) =>
			setState((current) => dismissNotice(current, key, Date.now())),
		[],
	);
	const resolve = useCallback(
		(key: string) =>
			setState((current) => resolveNotice(current, key, Date.now())),
		[],
	);
	const reset = useCallback(
		() =>
			setState((current) =>
				current.visible || current.waiting.length || current.seenModals.length
					? resetNotices()
					: current,
			),
		[],
	);

	return useMemo(
		() => ({ state, visible: state.visible, push, dismiss, resolve, reset }),
		[state, push, dismiss, resolve, reset],
	);
}
