import { useEffect } from "react";
import { trackVisitorPresence } from "../lib/presence/visitor-presence-service";
import { detectEntrySource } from "../lib/presence/visitor-presence-utils";

/**
 * Silent client-only presence beacon for the visitor view.
 * Connects anonymously (random session ID, no PII) so the city dashboard
 * counts active jury/visitor devices in real time.
 */
export function VisitorPresenceBeacon() {
	useEffect(() => {
		let active = true;
		let cleanup: (() => void) | undefined;

		const entry = detectEntrySource(window.location.search);
		void trackVisitorPresence(entry).then((unsubscribe) => {
			if (active) {
				cleanup = unsubscribe;
			} else {
				unsubscribe();
			}
		});

		return () => {
			active = false;
			cleanup?.();
		};
	}, []);

	return null;
}
