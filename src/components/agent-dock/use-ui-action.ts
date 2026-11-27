// A screen says "I can apply this UI action" while it is mounted.
// See src/lib/assistant/ui-action-bus.ts.

import { useEffect, useRef } from "react";
import { type UiHandler, uiBus } from "../../lib/assistant/ui-action-bus";
import type { UiActionType } from "../../lib/assistant/ui-action-types";
// Screens that take UI actions show the agent's highlight (`ui.focus`).
import "./agent-marks.css";

export function useUiAction<T extends UiActionType>(
	type: T,
	handler: UiHandler<T>,
	enabled = true,
): void {
	const latest = useRef(handler);
	latest.current = handler;
	useEffect(() => {
		if (!enabled) return;
		return uiBus().register(type, (action) => latest.current(action));
	}, [type, enabled]);
}
