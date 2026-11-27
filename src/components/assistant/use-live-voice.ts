// Gemini Live as the voice conduit of Quillart AI. Live only converses: every
// real request comes back as an `ask_quillart` tool call, which goes through
// the same text pipeline as typing in the dock (orchestrator, specialized
// agent, uiActions, confirmation cards). Live then tells the result in its own
// words. If Live cannot connect or drops, the chat keeps the browser's speech
// recognition and text.

import type { FunctionResponse, Session } from "@google/genai";
import { useCallback, useEffect, useReducer, useRef } from "react";
import type { AssistantAgentId } from "../../lib/assistant/assistant-types";
import { type UiNavigation, uiBus } from "../../lib/assistant/ui-action-bus";
import {
	LivePlayback,
	type Microphone,
	startMicrophone,
} from "../../lib/guide/live-audio";
import { conduitResponse, toConduitCalls } from "../../lib/guide/live-conduit";
import { openAgentLiveSession } from "../../lib/guide/live-session";
import { INITIAL_LIVE_STATE, liveReducer } from "../../lib/guide/live-status";
import { liveHistoryTurns } from "../../lib/guide/live-tool-calls";
import { forWire, type useAssistant } from "./use-assistant";

/** The server accepts up to 30 messages; keep the token request small. */
const MAX_TOKEN_MESSAGES = 20;

/**
 * Longest wait for Live to speak an answer that opens another screen: counted
 * from the answer, and again from each audio chunk. Required, not a nicety:
 * playback time does not move while the browser keeps audio suspended.
 */
const NAVIGATION_FALLBACK_MS = 8_000;

/** Sent after a reload or reconnect when she was cut off mid-answer. */
const RESUME_NUDGE =
	"(The page changed and the voice connection was restored. You were in the middle of answering: pick it up briefly from where you left off, in the same language, without repeating everything.)";

function wait(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

type Assistant = Pick<
	ReturnType<typeof useAssistant>,
	"messages" | "currentContext" | "appendLive" | "ask" | "abandonLive"
>;

/**
 * Where a relayed request is. While it is not idle, Live's own transcript is
 * not written to the chat: the request and the orchestrator's answer already
 * are, exactly as if the person had typed it.
 */
type Relay = "idle" | "asking" | "answered";

export function useLiveVoice(assistant: Assistant) {
	const [state, dispatch] = useReducer(liveReducer, INITIAL_LIVE_STATE);
	const assistantRef = useRef(assistant);
	assistantRef.current = assistant;
	const session = useRef<Session | null>(null);
	/** Agent shown on Live's own turns: the last one that answered. */
	const agent = useRef<AssistantAgentId | null>(null);
	const mic = useRef<Microphone | null>(null);
	const playback = useRef<LivePlayback | null>(null);
	const userText = useRef("");
	const modelText = useRef("");
	const relay = useRef<Relay>("idle");
	/** ask_quillart calls Live withdrew: their answer is not sent back. */
	const withdrawn = useRef(new Set<string>());
	/** Bumps on every start and stop, so callbacks of an old session do nothing. */
	const generation = useRef(0);
	/** A screen a relayed answer opens, once Live has spoken that answer. */
	const pendingNavigation = useRef<UiNavigation | null>(null);
	const navigationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	/** The socket closed while the tab was hidden: one reconnect is spent. */
	const retried = useRef(false);
	/** Removes the "reconnect when visible" listener. */
	const waitVisible = useRef<(() => void) | null>(null);
	/** She was cut off mid-answer by a hidden-tab close; resume picks it up. */
	const cutOff = useRef(false);
	const resumeRef = useRef<(unspoken: boolean) => Promise<void>>(
		async () => {},
	);

	/** Opens the screen the last relayed answer asked for, if any. */
	const followNavigation = useCallback(() => {
		if (navigationTimer.current) clearTimeout(navigationTimer.current);
		navigationTimer.current = null;
		const next = pendingNavigation.current;
		pendingNavigation.current = null;
		if (next) uiBus().follow(next);
	}, []);

	/** (Re)starts the safety timer that opens the screen if Live stays silent. */
	const armNavigationFallback = useCallback(() => {
		if (!pendingNavigation.current) return;
		if (navigationTimer.current) clearTimeout(navigationTimer.current);
		navigationTimer.current = setTimeout(
			followNavigation,
			NAVIGATION_FALLBACK_MS,
		);
	}, [followNavigation]);

	const clearWaitVisible = useCallback(() => {
		waitVisible.current?.();
		waitVisible.current = null;
	}, []);

	const flushUser = useCallback(() => {
		const text = userText.current.trim();
		userText.current = "";
		if (text) assistantRef.current.appendLive({ role: "user", text });
	}, []);

	const takeModelText = useCallback(() => {
		const text = modelText.current.trim();
		modelText.current = "";
		return text;
	}, []);

	/** Writes Live's own words to the chat (small talk, not relayed answers). */
	const appendModel = useCallback((text: string) => {
		if (!text || !agent.current) return;
		assistantRef.current.appendLive({
			role: "assistant",
			agent: agent.current,
			text,
			toolCalls: [],
		});
	}, []);

	/** Frees the mic, speakers and session; waiting Live actions are dropped. */
	const release = useCallback(() => {
		mic.current?.stop();
		mic.current = null;
		playback.current?.close();
		playback.current = null;
		const current = session.current;
		session.current = null;
		if (relay.current === "idle") {
			flushUser();
			appendModel(takeModelText());
		} else {
			userText.current = "";
			modelText.current = "";
		}
		relay.current = "idle";
		withdrawn.current.clear();
		assistantRef.current.abandonLive();
		return current;
	}, [appendModel, flushUser, takeModelText]);

	const stop = useCallback(() => {
		generation.current += 1;
		clearWaitVisible();
		retried.current = false;
		cutOff.current = false;
		dispatch({ type: "stop" });
		release()?.close();
		// Live is off: the screen an answer asked for opens now.
		followNavigation();
	}, [clearWaitVisible, followNavigation, release]);

	/**
	 * True while she is mid-answer: a request is relayed, an answer is not
	 * spoken yet, or audio is still queued. A reload then asks her to go on.
	 */
	const unspoken = useCallback(
		() =>
			relay.current !== "idle" ||
			cutOff.current ||
			(playback.current?.busy() ?? false),
		[],
	);

	const start = useCallback(async () => {
		if (session.current) return;
		clearWaitVisible();
		const run = ++generation.current;
		const isCurrent = () => run === generation.current;
		const fail = (reason: string) => {
			if (!isCurrent()) return;
			generation.current += 1;
			dispatch({ type: "failed", reason });
			release()?.close();
			followNavigation();
		};
		/**
		 * A hidden tab (mobile) may lose its socket: wait until the person is
		 * back and reconnect once, instead of ending in "failed".
		 */
		const reconnectWhenVisible = () => {
			retried.current = true;
			cutOff.current = unspoken();
			generation.current += 1;
			dispatch({ type: "start" });
			release()?.close();
			const onVisible = () => {
				if (document.hidden) return;
				clearWaitVisible();
				void resumeRef.current(cutOff.current);
			};
			document.addEventListener("visibilitychange", onVisible);
			waitVisible.current = () =>
				document.removeEventListener("visibilitychange", onVisible);
			// Reloads now if an answer asked for another screen; the mark resumes.
			followNavigation();
		};
		dispatch({ type: "start" });
		const { messages, currentContext } = assistantRef.current;
		const respondTo =
			(live: Session) => (functionResponses: FunctionResponse[]) => {
				try {
					live.sendToolResponse({ functionResponses });
				} catch {
					// The session closed meanwhile; onClose already falls back.
				}
			};
		try {
			playback.current = new LivePlayback();
			const opened = await openAgentLiveSession(
				{
					messages: forWire(messages).slice(-MAX_TOKEN_MESSAGES),
					context: currentContext(),
				},
				{
					onInputText: (text) => {
						// While a request is relayed, its words are already in the chat.
						if (isCurrent() && relay.current === "idle") {
							userText.current += text;
						}
					},
					onText: (text) => {
						if (isCurrent()) modelText.current += text;
					},
					onAudio: (data) => {
						if (!isCurrent()) return;
						playback.current?.play(data);
						// Still speaking: the screen waits for her.
						armNavigationFallback();
					},
					onInterrupted: () => {
						playback.current?.interrupt();
						// What Live said before the interruption goes before the new words.
						if (isCurrent() && relay.current === "idle") {
							appendModel(takeModelText());
						}
					},
					onTurnComplete: () => {
						if (!isCurrent()) return;
						if (relay.current !== "idle") {
							// Live's summary of a relayed answer: the chat has the answer.
							takeModelText();
							if (relay.current === "answered") {
								relay.current = "idle";
								userText.current = "";
								if (pendingNavigation.current) {
									// Open the screen once she has said the answer.
									const spoken =
										playback.current?.drained() ?? Promise.resolve();
									void Promise.race([
										spoken,
										wait(NAVIGATION_FALLBACK_MS),
									]).then(() => {
										if (isCurrent()) followNavigation();
									});
								}
							}
							return;
						}
						flushUser();
						appendModel(takeModelText());
					},
					onToolCall: (calls) => {
						const live = session.current;
						if (!isCurrent() || !live) return;
						// The request below is the person's message; their transcript is not.
						userText.current = "";
						modelText.current = "";
						const { requests, rejected } = toConduitCalls(calls);
						const respond = respondTo(live);
						if (requests.length === 0) {
							respond(rejected);
							return;
						}
						relay.current = "asking";
						void (async () => {
							const responses = [...rejected];
							for (const { id, request } of requests) {
								if (withdrawn.current.delete(id)) continue;
								// Same pipeline as typing in the dock.
								const answer = await assistantRef.current.ask(request);
								if (answer?.navigation) {
									pendingNavigation.current = answer.navigation;
								}
								if (!isCurrent()) {
									// Live ended meanwhile: nothing will be spoken.
									followNavigation();
									return;
								}
								const result = answer?.result ?? null;
								if (result?.agent) agent.current = result.agent;
								if (withdrawn.current.delete(id)) continue;
								responses.push(conduitResponse(id, result));
							}
							if (responses.length === 0) {
								relay.current = "idle";
								followNavigation();
								return;
							}
							relay.current = "answered";
							respond(responses);
							armNavigationFallback();
						})();
					},
					onToolCancel: (ids) => {
						if (!isCurrent()) return;
						for (const id of ids) withdrawn.current.add(id);
						assistantRef.current.abandonLive(ids);
					},
					onClose: (reason) => {
						if (
							isCurrent() &&
							!retried.current &&
							typeof document !== "undefined" &&
							document.hidden
						) {
							reconnectWhenVisible();
							return;
						}
						fail(reason);
					},
				},
			);
			if (!isCurrent()) {
				opened.session.close();
				return;
			}
			session.current = opened.session;
			agent.current = opened.agent;
			const turns = liveHistoryTurns(messages);
			if (turns.length > 0) {
				opened.session.sendClientContent({ turns, turnComplete: false });
			}
			const microphone = await startMicrophone((audio) =>
				session.current?.sendRealtimeInput({ audio }),
			);
			if (!isCurrent()) {
				microphone.stop();
				return;
			}
			mic.current = microphone;
			retried.current = false;
			dispatch({ type: "connected" });
		} catch (error) {
			fail(error instanceof Error ? error.message : String(error));
		}
	}, [
		appendModel,
		armNavigationFallback,
		clearWaitVisible,
		flushUser,
		followNavigation,
		release,
		takeModelText,
		unspoken,
	]);

	/**
	 * Typed text goes to the same Live session while it is on. It shows in the
	 * chat when Live answers it itself; a relayed request shows instead.
	 */
	const sendText = useCallback(
		(text: string): boolean => {
			const live = session.current;
			const clean = text.trim();
			if (!live || !clean || relay.current !== "idle") return false;
			flushUser();
			userText.current = clean;
			live.sendRealtimeInput({ text: clean });
			return true;
		},
		[flushUser],
	);

	/**
	 * Tells the live session something that happened outside it, such as the
	 * outcome of an action the person confirmed later on its card (S4).
	 */
	const notify = useCallback((text: string): boolean => {
		const live = session.current;
		if (!live || !text) return false;
		try {
			live.sendClientContent({
				turns: [{ role: "user", parts: [{ text }] }],
				turnComplete: true,
			});
			return true;
		} catch {
			return false;
		}
	}, []);

	/**
	 * Reopens Live (next page, or back from a hidden tab). Only when she was
	 * cut off mid-answer is she asked to go on; otherwise she waits quietly.
	 */
	const resume = useCallback(
		async (wasUnspoken: boolean) => {
			await start();
			cutOff.current = false;
			if (wasUnspoken) notify(RESUME_NUDGE);
		},
		[start, notify],
	);
	resumeRef.current = resume;

	// Leaving the page ends the session and frees the microphone.
	useEffect(() => () => stop(), [stop]);

	return {
		status: state.status,
		reason: state.reason,
		active: state.status === "live" || state.status === "connecting",
		start,
		stop,
		sendText,
		notify,
		resume,
		unspoken,
	};
}
