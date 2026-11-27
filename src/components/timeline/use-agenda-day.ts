import { useEffect, useState } from "react";
import type { CommunityStore } from "../../lib/community/community-types";
import { buildAgendaDay } from "../../lib/timeline/timeline-agenda";
import type { AgendaDay } from "../../lib/timeline/timeline-types";

export type AgendaStatus = "loading" | "ready" | "error" | "offline";

interface AgendaState {
	status: AgendaStatus;
	day: AgendaDay | null;
}

/**
 * The real agenda day the timeline shows (community `events`), kept fresh while
 * people publish. A failed reload keeps the last agenda it had: never a blank state.
 */
export function useAgendaDay(): AgendaState {
	const [state, setState] = useState<AgendaState>({
		status: "loading",
		day: null,
	});

	useEffect(() => {
		let active = true;
		let unsubscribe: (() => void) | undefined;

		const load = async (): Promise<CommunityStore | null> => {
			try {
				// Loaded on demand: the map and the dashboard do not need it to paint.
				const { getCommunityStore } = await import(
					"../../lib/community/community-store"
				);
				const store = getCommunityStore();
				const events = await store.listEvents();
				if (active) setState({ status: "ready", day: buildAgendaDay(events) });
				return store;
			} catch {
				if (active) {
					setState((current) =>
						current.status === "ready"
							? current
							: { status: navigator.onLine ? "error" : "offline", day: null },
					);
				}
				return null;
			}
		};

		// Listens for new events once a load worked (at start, or when the network returns).
		const reload = () =>
			void load().then((store) => {
				if (store && active && !unsubscribe)
					unsubscribe = store.subscribe("events", () => void load());
			});
		reload();
		window.addEventListener("online", reload);
		return () => {
			active = false;
			unsubscribe?.();
			window.removeEventListener("online", reload);
		};
	}, []);

	return state;
}
