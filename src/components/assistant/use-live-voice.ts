// Gemini Live as a voice conduit for Quillart AI: the server's orchestrator
// picks the agent and locks its instruction and tools in an ephemeral token;
// tool calls run here with the person's session through useAssistant, and
// actions wait for the same confirmation card as text. If Live cannot connect
// or drops, the chat keeps the browser's speech recognition and text.

import type { FunctionResponse, Session } from "@google/genai";
import { useCallback, useEffect, useReducer, useRef } from "react";
import type { AssistantAgentId } from "../../lib/assistant/assistant-types";
import {
	LivePlayback,
	type Microphone,
	startMicrophone,
} from "../../lib/guide/live-audio";
import { openAgentLiveSession } from "../../lib/guide/live-session";
import { INITIAL_LIVE_STATE, liveReducer } from "../../lib/guide/live-status";
import {
	liveHistoryTurns,
	toFunctionResponses,
	toLiveToolCalls,
} from "../../lib/guide/live-tool-calls";
import { getLanguage } from "../../lib/i18n/use-language";
import { LIVE_VOICE_TEXT } from "./live-voice-text";
import { forWire, type useAssistant } from "./use-assistant";
import { speak } from "./voice-conduit";

/** The server accepts up to 30 messages; keep the token request small. */
const MAX_TOKEN_MESSAGES = 20;

type Assistant = Pick<
	ReturnType<typeof useAssistant>,
	"messages" | "currentContext" | "appendLive" | "runLiveTurn" | "abandonLive"
>;

export function useLiveVoice(assistant: Assistant) {
	const [state, dispatch] = useReducer(liveReducer, INITIAL_LIVE_STATE);
	const assistantRef = useRef(assistant);
	assistantRef.current = assistant;
	const session = useRef<Session | null>(null);
	const agent = useRef<AssistantAgentId | null>(null);
	const mic = useRef<Microphone | null>(null);
	const playback = useRef<LivePlayback | null>(null);
	const userText = useRef("");
	const modelText = useRef("");
	/** Bumps on every start and stop, so callbacks of an old session do nothing. */
	const generation = useRef(0);

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

	/** Frees the mic, speakers and session; waiting Live actions are dropped. */
	const release = useCallback(() => {
		mic.current?.stop();
		mic.current = null;
		playback.current?.close();
		playback.current = null;
		const current = session.current;
		session.current = null;
		flushUser();
		const text = takeModelText();
		if (text && agent.current) {
			assistantRef.current.appendLive({
				role: "assistant",
				agent: agent.current,
				text,
				toolCalls: [],
			});
		}
		assistantRef.current.abandonLive();
		return current;
	}, [flushUser, takeModelText]);

	const stop = useCallback(() => {
		generation.current += 1;
		dispatch({ type: "stop" });
		release()?.close();
	}, [release]);

	const start = useCallback(async () => {
		if (session.current) return;
		const run = ++generation.current;
		const isCurrent = () => run === generation.current;
		const fail = (reason: string) => {
			if (!isCurrent()) return;
			generation.current += 1;
			dispatch({ type: "failed", reason });
			release()?.close();
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
						if (isCurrent()) userText.current += text;
					},
					onText: (text) => {
						if (!isCurrent()) return;
						flushUser();
						modelText.current += text;
					},
					onAudio: (data) => {
						if (isCurrent()) playback.current?.play(data);
					},
					onInterrupted: () => playback.current?.interrupt(),
					onTurnComplete: () => {
						if (!isCurrent() || !agent.current) return;
						flushUser();
						const text = takeModelText();
						if (text) {
							assistantRef.current.appendLive({
								role: "assistant",
								agent: agent.current,
								text,
								toolCalls: [],
							});
						}
					},
					onToolCall: (calls) => {
						const live = session.current;
						const chosen = agent.current;
						if (!isCurrent() || !live || !chosen) return;
						flushUser();
						const text = takeModelText();
						const { accepted, rejected } = toLiveToolCalls(chosen, calls);
						const respond = respondTo(live);
						if (accepted.length === 0) {
							if (text) {
								assistantRef.current.appendLive({
									role: "assistant",
									agent: chosen,
									text,
									toolCalls: [],
								});
							}
							respond(rejected);
							return;
						}
						void assistantRef.current
							.runLiveTurn(chosen, text, accepted, (results) =>
								respond([...rejected, ...toFunctionResponses(results)]),
							)
							.then((waiting) => {
								// Ask by voice too: the action only runs from the card.
								if (waiting && isCurrent()) {
									speak(LIVE_VOICE_TEXT[getLanguage()].confirmPrompt);
								}
							});
					},
					onToolCancel: (ids) => {
						if (isCurrent()) assistantRef.current.abandonLive(ids);
					},
					onClose: (reason) => fail(reason),
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
			dispatch({ type: "connected" });
		} catch (error) {
			fail(error instanceof Error ? error.message : String(error));
		}
	}, [flushUser, release, takeModelText]);

	/** Typed text goes to the same Live session while it is on. */
	const sendText = useCallback(
		(text: string): boolean => {
			const live = session.current;
			const clean = text.trim();
			if (!live || !clean) return false;
			flushUser();
			assistantRef.current.appendLive({ role: "user", text: clean });
			live.sendRealtimeInput({ text: clean });
			return true;
		},
		[flushUser],
	);

	// Leaving the page ends the session and frees the microphone.
	useEffect(() => () => stop(), [stop]);

	return {
		status: state.status,
		reason: state.reason,
		active: state.status === "live" || state.status === "connecting",
		start,
		stop,
		sendText,
	};
}
