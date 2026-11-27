// Contract for Quillart AI, the conversational entry point.
//
// Flow: voice or text (voice is only a conduit: speech-to-text in, text-to-speech
// out) -> orchestrator routes the message to ONE specialized agent -> the agent
// (Gemini with only its own tools, or the local fallback) answers and proposes
// tool calls -> the browser runs them against the community store with the
// person's own session, asking for confirmation before any write.

import type {
	CommunityEvent,
	EventCategory,
	ForumCategory,
	ForumThread,
	Place,
	PlaceKind,
	PublishResult,
} from "../community/community-types";
import type { Language } from "../i18n/languages";

/** Specialized agents, one per section of the platform. */
export type AssistantAgentId =
	| "agenda" // events: discover, register, publish
	| "community" // forum: read, open conversations, reply
	| "places" // public spaces and nature, directions
	| "mobility" // routes, fares, arroyo alerts (existing Guide + Decisor)
	| "city_reports" // problems in public space for the city (triaged)
	| "account"; // profile, my registrations, my publications

/** Read tools run right away; action tools need the person's confirmation. */
export interface AssistantToolArgs {
	search_events: {
		query?: string;
		category?: EventCategory;
		/** Only events starting within this many days (1 = today and tomorrow). */
		days_ahead?: number;
		place_slug?: string;
	};
	get_event: { event_id: string };
	my_registrations: Record<string, never>;
	list_places: { kind?: PlaceKind; query?: string };
	get_place: { place_slug: string };
	list_threads: { category?: ForumCategory; place_slug?: string };
	get_directions: { place_slug: string };
	register_for_event: { event_id: string };
	unregister_from_event: { event_id: string };
	create_event: {
		title: string;
		description: string;
		category: EventCategory;
		/** Barranquilla local time, "YYYY-MM-DDTHH:mm". */
		starts_at_local: string;
		ends_at_local?: string;
		place_slug?: string;
		location_text?: string;
		capacity?: number;
	};
	create_thread: {
		title: string;
		body: string;
		category: ForumCategory;
		place_slug?: string;
	};
	reply_to_thread: { thread_id: string; body: string };
	/** Mobility: route from the Gran Malecón to a corridor destination (existing Guide). */
	plan_route: { destination: "estadio" | "barrio_abajo" | "centro" };
	/** A problem in public space (flooded arroyo, damaged path...). Goes to the forum and the city queue. */
	report_issue: { description: string; place_slug?: string };
	/** Suggests a screen; the UI shows it as a button, never navigates on its own. */
	open_page: { path: string; label: string };
}

export type AssistantToolName = keyof AssistantToolArgs;

export const ACTION_TOOLS: readonly AssistantToolName[] = [
	"register_for_event",
	"unregister_from_event",
	"create_event",
	"create_thread",
	"reply_to_thread",
	"report_issue",
];

export function isActionTool(name: AssistantToolName): boolean {
	return ACTION_TOOLS.includes(name);
}

export interface AssistantToolCall<
	N extends AssistantToolName = AssistantToolName,
> {
	id: string;
	name: N;
	args: AssistantToolArgs[N];
}

/** What a tool returns to the model (compact) and to the UI (rich). */
export interface AssistantToolResult {
	callId: string;
	name: AssistantToolName;
	/** Compact JSON for the model. Never personal data of other people. */
	summary: Record<string, unknown>;
	/** Rich data the chat renders as cards. */
	display?: AssistantDisplay;
	/** True when the person declined the action or it failed. */
	declined?: boolean;
}

export type AssistantDisplay =
	| {
			kind: "events";
			events: CommunityEvent[];
			placeNames: Record<string, string>;
	  }
	| { kind: "places"; places: Place[] }
	| { kind: "threads"; threads: ForumThread[] }
	| { kind: "publish"; result: PublishResult<unknown>; href: string | null }
	| { kind: "link"; href: string; label: string }
	| { kind: "notice"; tone: "ok" | "warn" | "error"; text: string };

/** One turn of the conversation, in a provider-neutral shape. */
export type AssistantMessage =
	| { role: "user"; text: string }
	| {
			role: "assistant";
			agent: AssistantAgentId;
			text: string;
			toolCalls: AssistantToolCall[];
	  }
	| { role: "tool"; results: AssistantToolResult[] };

/** Facts about the person and the moment, sent with every request. */
export interface AssistantContext {
	/** ISO now, so "este sábado" resolves correctly. */
	now: string;
	signedIn: boolean;
	displayName: string | null;
	isVisitor: boolean | null;
	/** Page the person came from, e.g. "/agenda/123", if any. */
	fromPath: string | null;
	/** Interface language the person chose; the reply should use it. */
	language?: Language;
}

export interface AssistantRequest {
	messages: AssistantMessage[];
	context: AssistantContext;
}

export interface AssistantResponse {
	/** The specialized agent that answered this turn. */
	agent: AssistantAgentId;
	/** How the orchestrator chose it. */
	routedBy: "openjev" | "gemini" | "keywords" | "continuation";
	text: string;
	toolCalls: AssistantToolCall[];
	/** Who answered: Gemini with tools, or the local intent router. */
	source: "gemini" | "local";
	/** Short follow-up suggestions for chips. */
	suggestions: string[];
}
