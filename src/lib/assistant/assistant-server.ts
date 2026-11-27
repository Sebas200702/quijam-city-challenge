// Server side of Quillart AI: validates the request, routes it to one
// specialized agent, runs Gemini as the orchestrator focused on that agent
// (every tool, including the UI tools that drive the screen) or the local
// fallback as that agent alone, and returns tool calls with ids for the
// browser to run and confirm, plus the UI actions they derive.

import { isLanguage } from "../i18n/languages";
import type { OpenJevClient } from "../openjev/openjev-types";
import {
	AGENT_IDS,
	AGENTS,
	type AgentTurn,
	limitActionCalls,
	ORCHESTRATOR_AGENT,
	PROFILE_PATH,
	sanitizeToolArgs,
	TOOL_SCHEMAS,
	type ToolCallDraft,
} from "./assistant-agents";
import type { AnswerHooks } from "./assistant-stream";
import {
	type AssistantAgentId,
	type AssistantContext,
	type AssistantMessage,
	type AssistantRequest,
	type AssistantResponse,
	type AssistantToolCall,
	type AssistantToolName,
	type AssistantToolResult,
	isActionTool,
	isUiTool,
} from "./assistant-types";
import { type GeminiAgentOptions, runGeminiAgent } from "./gemini-agent";
import { answerLocally } from "./local-agents";
import { localCopy } from "./local-copy";
import { latestUserText, routeMessage } from "./orchestrator";
import { parseScreenContext } from "./screen-context";
import { uiActionsForCalls } from "./ui-actions";

export const MAX_MESSAGES = 30;
export const MAX_USER_TEXT = 1000;
export const MAX_ASSISTANT_TEXT = 4000;
export const MAX_TOOL_CALLS_PER_TURN = 8;
/** Bound on the whole conversation, serialized. */
export const MAX_REQUEST_CHARS = 60_000;
const MAX_ID_LENGTH = 100;
const MAX_NAME_LENGTH = 80;
const MAX_PATH_LENGTH = 200;

/** A request the server will not answer; `status` is the HTTP status. */
export class AssistantRequestError extends Error {
	readonly status = 400;
	constructor(message: string) {
		super(message);
		this.name = "AssistantRequestError";
	}
}

function fail(message: string): never {
	throw new AssistantRequestError(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAgentId(value: unknown): value is AssistantAgentId {
	return (AGENT_IDS as readonly unknown[]).includes(value);
}

function isToolName(value: unknown): value is AssistantToolName {
	return typeof value === "string" && Object.hasOwn(TOOL_SCHEMAS, value);
}

function shortString(value: unknown, max: number, field: string): string {
	if (typeof value !== "string" || value.length > max) {
		fail(`${field} must be a string of at most ${max} characters.`);
	}
	return value;
}

function nullableString(
	value: unknown,
	max: number,
	field: string,
): string | null {
	return value === null || value === undefined
		? null
		: shortString(value, max, field);
}

function parseToolCall(value: unknown, index: number): AssistantToolCall {
	if (!isRecord(value)) fail(`toolCalls[${index}] must be an object.`);
	if (!isToolName(value.name)) fail(`toolCalls[${index}].name is unknown.`);
	if (!isRecord(value.args))
		fail(`toolCalls[${index}].args must be an object.`);
	return {
		id: shortString(value.id, MAX_ID_LENGTH, `toolCalls[${index}].id`),
		name: value.name,
		args: value.args,
	} as AssistantToolCall;
}

function parseToolResult(value: unknown, index: number): AssistantToolResult {
	if (!isRecord(value)) fail(`results[${index}] must be an object.`);
	if (!isToolName(value.name)) fail(`results[${index}].name is unknown.`);
	if (!isRecord(value.summary)) {
		fail(`results[${index}].summary must be an object.`);
	}
	if (value.declined !== undefined && typeof value.declined !== "boolean") {
		fail(`results[${index}].declined must be a boolean.`);
	}
	// `display` is for the browser only; the server never needs it.
	return {
		callId: shortString(
			value.callId,
			MAX_ID_LENGTH,
			`results[${index}].callId`,
		),
		name: value.name,
		summary: value.summary,
		...(value.declined ? { declined: true } : {}),
	};
}

function parseMessage(value: unknown, index: number): AssistantMessage {
	if (!isRecord(value)) fail(`messages[${index}] must be an object.`);
	switch (value.role) {
		case "user": {
			const text = shortString(
				value.text,
				MAX_USER_TEXT,
				`messages[${index}].text`,
			);
			if (text.trim() === "") fail(`messages[${index}].text is empty.`);
			return { role: "user", text };
		}
		case "assistant": {
			if (!isAgentId(value.agent)) fail(`messages[${index}].agent is unknown.`);
			const calls = value.toolCalls ?? [];
			if (!Array.isArray(calls) || calls.length > MAX_TOOL_CALLS_PER_TURN) {
				fail(`messages[${index}].toolCalls must be a short array.`);
			}
			return {
				role: "assistant",
				agent: value.agent,
				text: shortString(
					value.text,
					MAX_ASSISTANT_TEXT,
					`messages[${index}].text`,
				),
				toolCalls: calls.map(parseToolCall),
			};
		}
		case "tool": {
			const results = value.results;
			if (
				!Array.isArray(results) ||
				results.length === 0 ||
				results.length > MAX_TOOL_CALLS_PER_TURN
			) {
				fail(`messages[${index}].results must be a short, non-empty array.`);
			}
			return { role: "tool", results: results.map(parseToolResult) };
		}
		default:
			fail(`messages[${index}].role must be user, assistant or tool.`);
	}
}

function parseContext(value: unknown): AssistantContext {
	if (!isRecord(value)) fail("context must be an object.");
	const now = shortString(value.now, 40, "context.now");
	if (Number.isNaN(Date.parse(now))) fail("context.now must be an ISO date.");
	if (typeof value.signedIn !== "boolean") {
		fail("context.signedIn must be a boolean.");
	}
	const isVisitor = value.isVisitor ?? null;
	if (isVisitor !== null && typeof isVisitor !== "boolean") {
		fail("context.isVisitor must be a boolean or null.");
	}
	const fromPath = nullableString(
		value.fromPath,
		MAX_PATH_LENGTH,
		"context.fromPath",
	);
	if (fromPath !== null && !fromPath.startsWith("/")) {
		fail("context.fromPath must be an internal path.");
	}
	// The screen only helps the agents: an unusable one is dropped, not refused.
	const screen = parseScreenContext(value.screen);
	return {
		now,
		signedIn: value.signedIn,
		displayName: nullableString(
			value.displayName,
			MAX_NAME_LENGTH,
			"context.displayName",
		),
		isVisitor,
		fromPath,
		...(isLanguage(value.language) ? { language: value.language } : {}),
		...(screen ? { screen } : {}),
	};
}

/** Validates an untrusted JSON body. Throws AssistantRequestError (400). */
export function parseAssistantRequest(body: unknown): AssistantRequest {
	if (!isRecord(body)) fail("Send JSON with messages and context.");
	const { messages } = body;
	if (
		!Array.isArray(messages) ||
		messages.length === 0 ||
		messages.length > MAX_MESSAGES
	) {
		fail(`messages must have 1 to ${MAX_MESSAGES} items.`);
	}
	const parsed = messages.map(parseMessage);
	const latest = parsed.at(-1);
	if (latest?.role === "assistant") {
		fail("The last message must come from the person or a tool.");
	}
	if (JSON.stringify(parsed).length > MAX_REQUEST_CHARS) {
		fail("The conversation is too long.");
	}
	return { messages: parsed, context: parseContext(body.context) };
}

export interface AnswerDeps {
	openJev: OpenJevClient | null;
	/** Null when GEMINI_API_KEY is not set: the local agents answer. */
	gemini: GeminiAgentOptions | null;
	/** Injectable for tests. */
	runGemini?: typeof runGeminiAgent;
	newId?: () => string;
	onGeminiError?: (error: unknown) => void;
}

const ACCOUNT_ONLY_TOOLS: readonly AssistantToolName[] = ["my_registrations"];

/**
 * Safety net for the model without a session. Personal reads become a
 * sign-in button. An action is kept as a pending card (U02): the card shows
 * the exact text, asks to sign in instead of "Confirmar" and comes back
 * ready after signing in, so nothing has to be said twice. It never runs
 * without the account: the browser runs it with the person's own session.
 */
export function enforceAccount(
	turn: AgentTurn,
	context: AssistantContext,
): AgentTurn {
	if (context.signedIn) return turn;
	const copy = localCopy(context.language);
	// Keep an emergency reminder (Línea 123) if the model gave one.
	const emergency = /\b123\b/.test(turn.text) ? `${copy.emergency} ` : "";
	if (turn.toolCalls.some((call) => isActionTool(call.name))) {
		return {
			// The model's text may claim the action is done: never show it here.
			text: `${emergency}${copy.actionKept}`,
			toolCalls: turn.toolCalls.filter(
				(call) => !ACCOUNT_ONLY_TOOLS.includes(call.name),
			),
		};
	}
	const kept = turn.toolCalls.filter(
		(call) => !ACCOUNT_ONLY_TOOLS.includes(call.name),
	);
	if (kept.length === turn.toolCalls.length) return turn;
	const hasProfileLink = kept.some(
		(call) => call.name === "open_page" && call.args.path === PROFILE_PATH,
	);
	const toolCalls: ToolCallDraft[] = hasProfileLink
		? kept
		: [
				...kept,
				{
					name: "open_page",
					args: { path: PROFILE_PATH, label: copy.signInLabel },
				},
			];
	return {
		text: `${emergency}${copy.needAccount}`,
		toolCalls,
	};
}

/** One assistant turn for the request. Never throws for model failures. */
export async function answer(
	request: AssistantRequest,
	deps: AnswerDeps,
	hooks: AnswerHooks = {},
): Promise<AssistantResponse> {
	const { messages, context } = request;
	const { agent, routedBy } = await routeMessage(messages, context, {
		openJev: deps.openJev,
	});
	hooks.onStart?.(agent, routedBy);

	let turn: AgentTurn | null = null;
	let source: AssistantResponse["source"] = "local";
	if (deps.gemini) {
		const runGemini = deps.runGemini ?? runGeminiAgent;
		// Signed out, enforceAccount may replace the model's text: never stream it.
		const onText = context.signedIn ? hooks.onText : undefined;
		try {
			turn = onText
				? await runGemini(agent, messages, context, deps.gemini, onText)
				: await runGemini(agent, messages, context, deps.gemini);
			source = "gemini";
		} catch (error) {
			deps.onGeminiError?.(error);
		}
	}
	turn = enforceAccount(
		turn ?? answerLocally(agent, messages, context),
		context,
	);

	const newId = deps.newId ?? (() => crypto.randomUUID());
	// Gemini runs as the orchestrator with every tool, whatever the route; the
	// local fallback only answers as the routed agent.
	const allowed =
		source === "gemini"
			? AGENTS[ORCHESTRATOR_AGENT].tools
			: AGENTS[agent].tools;
	const permitted = turn.toolCalls.filter((call) =>
		allowed.includes(call.name),
	);
	// Model calls are checked against the schema once more: UI actions are
	// derived from these args, and runGemini is injectable.
	const checked =
		source === "gemini"
			? permitted.flatMap((call) => {
					const args = sanitizeToolArgs(call.name, call.args);
					return args ? [{ name: call.name, args } as ToolCallDraft] : [];
				})
			: permitted;
	// One action per turn, for Gemini and the local agents alike: a single
	// confirmation card, never a chain of writes.
	const toolCalls = limitActionCalls(checked).map(
		(call) => ({ id: newId(), ...call }) as AssistantToolCall,
	);
	// Only screen changes and no words: no later round will write any, so say
	// it is done instead of leaving an empty bubble.
	const text =
		turn.text.trim() === "" &&
		toolCalls.length > 0 &&
		toolCalls.every((call) => isUiTool(call.name))
			? localCopy(context.language).uiDone
			: turn.text;
	// Visible changes come only from these validated calls, through the whitelist.
	const uiActions = uiActionsForCalls(
		toolCalls,
		latestUserText(messages),
		context.screen,
	);

	return {
		agent,
		routedBy,
		text,
		toolCalls,
		source,
		suggestions: AGENTS[agent].suggestions,
		...(uiActions.length > 0 ? { uiActions } : {}),
	};
}
