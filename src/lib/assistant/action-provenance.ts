// Where did an action's target come from? An action on an event or a thread
// should point at something the person saw in a tool result or named in their
// own messages. An id that only exists inside user-generated text (or nowhere)
// suggests the model followed injected instructions: the confirmation card
// then shows a warning.

import type {
	AssistantMessage,
	AssistantToolCall,
	AssistantToolName,
} from "./assistant-types";
import { isUntrusted } from "./untrusted-content";

export type TargetKind = "event" | "thread";

export interface ActionTarget {
	kind: TargetKind;
	id: string;
}

/** Tools whose results list ids of each kind. */
const RESULT_KINDS: Partial<Record<AssistantToolName, TargetKind>> = {
	search_events: "event",
	get_event: "event",
	my_registrations: "event",
	register_for_event: "event",
	unregister_from_event: "event",
	create_event: "event",
	list_threads: "thread",
	create_thread: "thread",
	report_issue: "thread",
	reply_to_thread: "thread",
};

/** Structural id fields in summaries; free text is never read. */
const ID_KEYS = new Set(["id", "event_id", "thread_id"]);

/** The event or thread an action acts on, or null when it creates something new. */
export function actionTarget(call: AssistantToolCall): ActionTarget | null {
	const args = call.args as Record<string, unknown>;
	switch (call.name) {
		case "register_for_event":
		case "unregister_from_event":
			return typeof args.event_id === "string"
				? { kind: "event", id: args.event_id }
				: null;
		case "reply_to_thread":
			return typeof args.thread_id === "string"
				? { kind: "thread", id: args.thread_id }
				: null;
		default:
			return null;
	}
}

function collectIds(value: unknown, into: Set<string>, depth = 0): void {
	if (depth > 6 || typeof value !== "object" || value === null) return;
	// Never trust ids that appear inside text written by other people.
	if (isUntrusted(value)) return;
	if (Array.isArray(value)) {
		for (const item of value) collectIds(item, into, depth + 1);
		return;
	}
	for (const [key, item] of Object.entries(value)) {
		if (ID_KEYS.has(key) && typeof item === "string") into.add(item);
		else collectIds(item, into, depth + 1);
	}
}

/** Ids of one kind that tool results in this conversation returned as ids. */
export function idsFromToolResults(
	messages: readonly AssistantMessage[],
	kind: TargetKind,
): Set<string> {
	const ids = new Set<string>();
	for (const message of messages) {
		if (message.role !== "tool") continue;
		for (const result of message.results) {
			if (RESULT_KINDS[result.name] !== kind) continue;
			if (result.declined) continue;
			collectIds(result.summary, ids);
		}
	}
	return ids;
}

/**
 * True when the action has no target, or its target id came from a tool
 * result's id fields, the person's own messages, or `ownSources` (for example
 * the page the person came from). False means: show the warning.
 */
export function isActionGrounded(
	call: AssistantToolCall,
	messages: readonly AssistantMessage[],
	ownSources: readonly (string | null | undefined)[] = [],
): boolean {
	const target = actionTarget(call);
	if (!target) return true;
	if (target.id.trim() === "") return false;
	if (idsFromToolResults(messages, target.kind).has(target.id)) return true;
	const ownTexts = [
		...messages.flatMap((message) =>
			message.role === "user" ? [message.text] : [],
		),
		...ownSources.filter((text): text is string => typeof text === "string"),
	];
	return ownTexts.some((text) => text.includes(target.id));
}

/** Shown on the confirmation card when the target was not grounded. */
export const UNGROUNDED_WARNING =
	"Revisa bien: esta acción no salió de lo que pediste.";
