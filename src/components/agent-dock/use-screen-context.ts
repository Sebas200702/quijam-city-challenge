// React side of the screen context: a screen publishes what it shows, the
// agent dock reads it. See src/lib/assistant/screen-context-store.ts.

import { useEffect, useSyncExternalStore } from "react";
import { screenContext } from "../../lib/assistant/screen-context-store";
import type { ScreenContext } from "../../lib/assistant/screen-context-types";

/**
 * Publishes this screen's context while it is mounted. Pass null while the
 * data is still loading. Re-publishes only when the content changes.
 */
export function usePublishScreen(screen: Partial<ScreenContext> | null): void {
	const key = screen ? JSON.stringify(screen) : "";
	// biome-ignore lint/correctness/useExhaustiveDependencies: `key` is the content of `screen`.
	useEffect(() => {
		if (!screen) return;
		screenContext.publish(screen);
	}, [key]);
	useEffect(() => () => screenContext.reset(), []);
}

/** The current screen context, for the dock. */
export function useScreenContext(): ScreenContext {
	return useSyncExternalStore(
		screenContext.subscribe,
		screenContext.get,
		screenContext.get,
	);
}
