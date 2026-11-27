// Conversation state for Quillart AI: sends turns to /api/assistant, runs read
// tools right away and keeps action tools waiting for the person's OK. Action
// tools never run on their own: only the confirmation card runs them, one per
// turn, with the text the person saw (and may have edited).

import { useCallback, useEffect, useRef, useState } from "react";
import { isActionGrounded } from "../../lib/assistant/action-provenance";
import { sanitizeToolArgs } from "../../lib/assistant/assistant-agents";
import type {
	AssistantAgentId,
	AssistantMessage,
	AssistantRequest,
	AssistantResponse,
	AssistantToolCall,
	AssistantToolName,
	AssistantToolResult,
} from "../../lib/assistant/assistant-types";
import { isActionTool } from "../../lib/assistant/assistant-types";
import { answerOffline } from "../../lib/assistant/offline-answer";
import { declinedResult, runTool } from "../../lib/assistant/tool-executor";
import { withOfflineGuide } from "../../lib/guide/guide-offline";
import { messages as dictionaries } from "../../lib/i18n/messages";
import { getLanguage } from "../../lib/i18n/use-language";
import { useSession, useStore } from "../community/use-community";

/** Follow-up calls with tool results after one message from the person. */
const MAX_ROUNDS = 3;

/** Read tools: plan_route still answers the three routes without network (#47). */
const READ_TOOL_DEPS = {
	fetch: withOfflineGuide((input, init) => fetch(input, init)),
};

/** Text fields the person may edit on the card before confirming. */
export const EDITABLE_TEXT_FIELDS: Partial<
	Record<AssistantToolName, readonly ("title" | "body" | "description")[]>
> = {
	create_event: ["title", "description"],
	create_thread: ["title", "body"],
	reply_to_thread: ["body"],
	report_issue: ["description"],
};

export type EditableText = Partial<
	Record<"title" | "body" | "description", string>
>;

export interface PendingAction {
	call: AssistantToolCall;
	agent: AssistantAgentId;
	running: boolean;
	/**
	 * False when the target (event or thread) did not come from a tool result
	 * or the person's own words: the card shows a warning.
	 */
	grounded: boolean;
	/** Replaces editable text fields; false when the new text is not valid. */
	edit: (text: EditableText) => boolean;
}

export interface AssistantError {
	message: string;
	retry: () => void;
}

/** Tool results waiting for the person to confirm or cancel the actions. */
interface OpenBatch {
	messages: AssistantMessage[];
	rounds: number;
	results: AssistantToolResult[];
	remaining: AssistantToolCall[];
	agent: AssistantAgentId;
}

/** Kept for this tab only, so the conversation survives signing in. */
const SAVED_KEY = "quillart-assistant-conversation";

interface Saved {
	messages: AssistantMessage[];
	batch: OpenBatch | null;
}

function loadSaved(): Saved | null {
	try {
		const raw = sessionStorage.getItem(SAVED_KEY);
		if (!raw) return null;
		const saved = JSON.parse(raw) as Saved;
		return Array.isArray(saved.messages) ? saved : null;
	} catch {
		return null;
	}
}

function save(value: Saved): void {
	try {
		sessionStorage.setItem(SAVED_KEY, JSON.stringify(value));
	} catch {
		// Storage full or blocked: the conversation still works in memory.
	}
}

function referrerPath(): string | null {
	if (typeof document === "undefined" || !document.referrer) return null;
	try {
		const url = new URL(document.referrer);
		if (url.origin !== window.location.origin) return null;
		return `${url.pathname}${url.search}`;
	} catch {
		return null;
	}
}

/** The model only needs the compact summaries, not the rich card data. */
function forWire(messages: AssistantMessage[]): AssistantMessage[] {
	return messages.map((message) =>
		message.role === "tool"
			? {
					role: "tool",
					results: message.results.map(
						({ display: _display, ...rest }) => rest,
					),
				}
			: message,
	);
}

/** Result for an extra action in the same turn: only one runs per turn. */
function droppedResult(call: AssistantToolCall): AssistantToolResult {
	return {
		callId: call.id,
		name: call.name,
		summary: {
			declined: true,
			message: "Solo se propone una acción por turno; esta no se hizo.",
		},
		declined: true,
	};
}

function isResponse(value: unknown): value is AssistantResponse {
	const body = value as Partial<AssistantResponse> | null;
	return (
		!!body &&
		typeof body.agent === "string" &&
		typeof body.text === "string" &&
		Array.isArray(body.toolCalls)
	);
}

export function useAssistant() {
	const store = useStore();
	const { profile, loading: sessionLoading } = useSession();
	const [messages, setMessages] = useState<AssistantMessage[]>([]);
	const [pending, setPending] = useState<PendingAction[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<AssistantError | null>(null);
	const [suggestions, setSuggestions] = useState<string[]>([]);
	const batch = useRef<OpenBatch | null>(null);
	const busy = useRef(false);
	const profileRef = useRef(profile);
	profileRef.current = profile;
	const restored = useRef(false);

	/** Applies an edit to a waiting action (its args and the replayed turn). */
	const editAction = useCallback(
		(callId: string, text: EditableText): boolean => {
			const open = batch.current;
			const call = open?.remaining.find((item) => item.id === callId);
			const fields = call ? EDITABLE_TEXT_FIELDS[call.name] : undefined;
			if (!open || !call || !fields) return false;
			const changes = Object.fromEntries(
				fields
					.filter((field) => typeof text[field] === "string")
					.map((field) => [field, text[field]]),
			);
			const args = sanitizeToolArgs(call.name, { ...call.args, ...changes });
			if (!args) return false;
			const updated = { ...call, args } as AssistantToolCall;
			const swap = (item: AssistantToolCall) =>
				item.id === callId ? updated : item;
			open.remaining = open.remaining.map(swap);
			// The model sees what was really executed, not what it proposed.
			open.messages = open.messages.map((message) =>
				message.role === "assistant"
					? { ...message, toolCalls: message.toolCalls.map(swap) }
					: message,
			);
			setPending((items) =>
				items.map((item) =>
					item.call.id === callId ? { ...item, call: updated } : item,
				),
			);
			return true;
		},
		[],
	);

	const toPending = useCallback(
		(
			call: AssistantToolCall,
			agent: AssistantAgentId,
			history: AssistantMessage[],
		): PendingAction => ({
			call,
			agent,
			running: false,
			grounded: isActionGrounded(call, history, [referrerPath()]),
			edit: (text) => editAction(call.id, text),
		}),
		[editAction],
	);

	useEffect(() => {
		const saved = loadSaved();
		restored.current = true;
		if (!saved) return;
		setMessages(saved.messages);
		batch.current = saved.batch;
		if (saved.batch) {
			const { agent, remaining, messages: history, results } = saved.batch;
			const known: AssistantMessage[] =
				results.length > 0 ? [...history, { role: "tool", results }] : history;
			setPending(remaining.map((call) => toPending(call, agent, known)));
		}
	}, [toPending]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: pending changes when the batch ref does.
	useEffect(() => {
		if (restored.current) save({ messages, batch: batch.current });
	}, [messages, pending]);

	const request = useCallback(
		async (history: AssistantMessage[]): Promise<AssistantResponse> => {
			const current = profileRef.current;
			const body: AssistantRequest = {
				messages: forWire(history),
				context: {
					now: new Date().toISOString(),
					signedIn: current !== null,
					displayName: current?.displayName ?? null,
					isVisitor: current?.isVisitor ?? null,
					fromPath: referrerPath(),
					language: getLanguage(),
				},
			};
			let response: Response;
			try {
				response = await fetch("/api/assistant", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(body),
				});
			} catch {
				// No network: the local agents answer on the phone (#47).
				const { assistantOffline, assistantNoActions } =
					dictionaries[getLanguage()].offline;
				return answerOffline(body, {
					offline: assistantOffline,
					noActions: assistantNoActions,
				});
			}
			if (!response.ok) throw new Error(`status ${response.status}`);
			const data: unknown = await response.json();
			if (!isResponse(data)) throw new Error("invalid response");
			return data;
		},
		[],
	);

	const converse = useCallback(
		async (history: AssistantMessage[], rounds: number): Promise<void> => {
			busy.current = true;
			setLoading(true);
			setError(null);
			let response: AssistantResponse;
			try {
				response = await request(history);
			} catch {
				busy.current = false;
				setLoading(false);
				setError({
					message:
						"Uy, no pude conectarme ahora mismo. Revisa tu conexión e inténtalo otra vez.",
					retry: () => void converse(history, rounds),
				});
				return;
			}
			const turn: AssistantMessage = {
				role: "assistant",
				agent: response.agent,
				text: response.text,
				toolCalls: response.toolCalls,
			};
			let next = [...history, turn];
			setMessages(next);
			setSuggestions(response.suggestions ?? []);

			const reads = response.toolCalls.filter(
				(call) => !isActionTool(call.name),
			);
			// The server already keeps one action per turn; never trust that alone.
			const [action, ...extraActions] = response.toolCalls.filter((call) =>
				isActionTool(call.name),
			);
			const actions = action ? [action] : [];
			const results = [
				...(await Promise.all(
					reads.map((call) => runTool(call, store, READ_TOOL_DEPS)),
				)),
				...extraActions.map(droppedResult),
			];

			if (actions.length > 0) {
				batch.current = {
					messages: next,
					rounds,
					results,
					remaining: actions,
					agent: response.agent,
				};
				if (results.length > 0) {
					// Show the read results now; they are sent with the actions' outcome.
					setMessages([...next, { role: "tool", results }]);
				}
				const known: AssistantMessage[] =
					results.length > 0 ? [...next, { role: "tool", results }] : next;
				setPending(
					actions.map((call) => toPending(call, response.agent, known)),
				);
				busy.current = false;
				setLoading(false);
				return;
			}

			if (results.length > 0) {
				next = [...next, { role: "tool", results }];
				setMessages(next);
				const onlyLinks = reads.every((call) => call.name === "open_page");
				if (!onlyLinks && rounds < MAX_ROUNDS) {
					await converse(next, rounds + 1);
					return;
				}
			}
			busy.current = false;
			setLoading(false);
		},
		[request, store, toPending],
	);

	/** Answers one pending action; when none is left, the loop continues. */
	const settle = useCallback(
		async (callId: string, result: AssistantToolResult) => {
			const open = batch.current;
			if (!open) return;
			open.results = [
				...open.results.filter((item) => item.callId !== callId),
				result,
			];
			open.remaining = open.remaining.filter((call) => call.id !== callId);
			setPending((items) => items.filter((item) => item.call.id !== callId));
			const next: AssistantMessage[] = [
				...open.messages,
				{ role: "tool", results: open.results },
			];
			setMessages(next);
			if (open.remaining.length > 0) return;
			batch.current = null;
			if (open.rounds < MAX_ROUNDS) await converse(next, open.rounds + 1);
		},
		[converse],
	);

	const confirm = useCallback(
		async (callId: string) => {
			const call = batch.current?.remaining.find((item) => item.id === callId);
			if (!call) return;
			setPending((items) =>
				items.map((item) =>
					item.call.id === callId ? { ...item, running: true } : item,
				),
			);
			const result = await runTool(call, store);
			await settle(callId, result);
		},
		[settle, store],
	);

	const cancel = useCallback(
		async (callId: string) => {
			const call = batch.current?.remaining.find((item) => item.id === callId);
			if (!call) return;
			await settle(callId, declinedResult(call));
		},
		[settle],
	);

	const send = useCallback(
		async (text: string) => {
			const clean = text.trim();
			if (!clean || busy.current) return;
			let history = messages;
			const open = batch.current;
			if (open) {
				// A new message means "not now" for the actions still waiting.
				const results = [
					...open.results,
					...open.remaining.map((call) => declinedResult(call)),
				];
				history = [...open.messages, { role: "tool", results }];
				batch.current = null;
				setPending([]);
			}
			const next: AssistantMessage[] = [
				...history,
				{ role: "user", text: clean },
			];
			setMessages(next);
			setSuggestions([]);
			await converse(next, 0);
		},
		[converse, messages],
	);

	/** Starts over with an empty conversation. */
	const reset = useCallback(() => {
		if (busy.current) return;
		batch.current = null;
		setPending([]);
		setMessages([]);
		setSuggestions([]);
		setError(null);
	}, []);

	return {
		messages,
		pending,
		loading,
		error,
		suggestions,
		signedIn: profile !== null,
		sessionLoading,
		send,
		confirm,
		cancel,
		reset,
	};
}
