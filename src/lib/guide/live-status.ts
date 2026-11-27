// State of the Gemini Live voice in the main chat. Live is optional: when it
// cannot connect or drops, the chat falls back to the browser's speech
// recognition and to text, which never stop working.

export type LiveStatus = "off" | "connecting" | "live" | "fallback";

export interface LiveState {
	status: LiveStatus;
	/** Why Live is not available, after a failure. */
	reason: string | null;
}

export type LiveEvent =
	| { type: "start" }
	| { type: "connected" }
	| { type: "failed"; reason: string }
	| { type: "stop" };

export const INITIAL_LIVE_STATE: LiveState = { status: "off", reason: null };

export function liveReducer(state: LiveState, event: LiveEvent): LiveState {
	switch (event.type) {
		case "start":
			return { status: "connecting", reason: null };
		case "connected":
			return state.status === "connecting"
				? { status: "live", reason: null }
				: state;
		case "failed":
			// A close after the person stopped Live is expected, not a failure.
			return state.status === "connecting" || state.status === "live"
				? { status: "fallback", reason: event.reason }
				: state;
		case "stop":
			return INITIAL_LIVE_STATE;
	}
}

/** Which voice input the chat offers right now. */
export function voiceInput(
	status: LiveStatus,
	canListen: boolean,
): "live" | "speech" | "text" {
	if (status === "live") return "live";
	return canListen ? "speech" : "text";
}
