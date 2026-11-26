// Registry of the specialized agents behind Quillart AI: what each one does,
// which tools it may use, how it is instructed, and the Gemini function
// declarations of every tool. The orchestrator picks ONE agent per turn.

import type { FunctionDeclaration } from "@google/genai";
import {
	EVENT_CATEGORY_LABELS,
	FORUM_CATEGORY_LABELS,
	PLACE_KIND_LABELS,
} from "../community/community-labels";
import type {
	EventCategory,
	ForumCategory,
	PlaceKind,
} from "../community/community-types";
import { PLACES } from "../community/places-catalog";
import { AGENT_LABELS } from "./assistant-labels";
import type {
	AssistantAgentId,
	AssistantToolArgs,
	AssistantToolName,
} from "./assistant-types";

export interface AgentDefinition {
	id: AssistantAgentId;
	/** Spanish name shown next to each answer. */
	label: string;
	/** One line in English; the orchestrator routes with it. */
	description: string;
	/** The only tools this agent may propose. */
	tools: readonly AssistantToolName[];
	/** Agent-specific rules, added to the shared rules. */
	rules: string[];
	/** Spanish chips shown after its answers. */
	suggestions: string[];
}

/** A tool call an agent proposes, before the server gives it an id. */
export type ToolCallDraft = {
	[N in AssistantToolName]: { name: N; args: AssistantToolArgs[N] };
}[AssistantToolName];

/** What one agent turn produces, from Gemini or from the local fallback. */
export interface AgentTurn {
	text: string;
	toolCalls: ToolCallDraft[];
}

export const AGENT_IDS: readonly AssistantAgentId[] = [
	"agenda",
	"community",
	"places",
	"mobility",
	"city_reports",
	"account",
];

export const EVENT_CATEGORIES = Object.keys(
	EVENT_CATEGORY_LABELS,
) as EventCategory[];
export const FORUM_CATEGORIES = Object.keys(
	FORUM_CATEGORY_LABELS,
) as ForumCategory[];
export const PLACE_KINDS = Object.keys(PLACE_KIND_LABELS) as PlaceKind[];
export const ROUTE_DESTINATIONS = [
	"estadio",
	"barrio_abajo",
	"centro",
] as const;

/** Where the person signs in or creates an account. */
export const PROFILE_PATH = "/perfil";

export const AGENTS: Record<AssistantAgentId, AgentDefinition> = {
	agenda: {
		id: "agenda",
		label: AGENT_LABELS.agenda,
		description:
			"Community events in Barranquilla: find plans by date or category, see an event, register or cancel a registration, publish a new event",
		tools: [
			"search_events",
			"get_event",
			"register_for_event",
			"unregister_from_event",
			"create_event",
			"open_page",
		],
		rules: [
			"Search events before recommending any; only mention events returned by search_events or get_event.",
			"To register, use the event_id from a previous tool result. If the person says 'the second one', pick it from the last results in order.",
			"To publish an event you need title, description, category and start time; ask briefly for what is missing, or offer open_page '/agenda/nuevo' to fill the form.",
			"starts_at_local is Barranquilla local time 'YYYY-MM-DDTHH:mm'.",
		],
		suggestions: [
			"¿Qué planes hay este fin de semana?",
			"Planes de música hoy",
			"Quiero publicar un evento",
		],
	},
	community: {
		id: "community",
		label: AGENT_LABELS.community,
		description:
			"Moderated community forum: read conversations, start a new conversation, reply to one",
		tools: ["list_threads", "create_thread", "reply_to_thread", "open_page"],
		rules: [
			"List conversations before summarizing them; only mention threads returned by list_threads.",
			"Never repeat names or personal details of other people from the forum; summarize topics only.",
			"Before create_thread or reply_to_thread, make sure the text is respectful; content is moderated and may be held for review.",
		],
		suggestions: [
			"¿De qué se está hablando en el foro?",
			"Quiero abrir una conversación",
			"Conversaciones sobre naturaleza",
		],
	},
	places: {
		id: "places",
		label: AGENT_LABELS.places,
		description:
			"Public spaces and nature of Barranquilla (parks, wetlands, waterfront, culture, heritage): what to visit, place details, how to get there, events at a place; general 'what to do in the city' questions",
		tools: [
			"list_places",
			"get_place",
			"get_directions",
			"search_events",
			"open_page",
		],
		rules: [
			"Only describe places returned by list_places or get_place; never invent opening hours or prices.",
			`Known place slugs: ${PLACES.map((place) => `${place.slug} (${place.name})`).join("; ")}.`,
		],
		suggestions: [
			"Lugares de naturaleza para ir",
			"¿Qué hay en el Gran Malecón?",
			"Planes al aire libre gratis",
		],
	},
	mobility: {
		id: "mobility",
		label: AGENT_LABELS.mobility,
		description:
			"Getting around Barranquilla: routes, Transmetro and buses, fares, fair taxis, arroyo (flash flood) alerts, how to get to the stadium, Barrio Abajo or downtown",
		tools: ["plan_route", "get_directions", "list_places", "open_page"],
		rules: [
			"For the stadium, Barrio Abajo or downtown (centro) call plan_route; it starts at the Gran Malecón.",
			"For any other catalog place call get_directions with its slug.",
			"Never invent routes, times or fares; only use tool results. Prefer the green route.",
			"If it is raining, remind the person never to cross a flooded arroyo.",
		],
		suggestions: [
			"¿Cómo llego al estadio?",
			"¿Cómo llego al centro?",
			"Ver el mapa del corredor",
		],
	},
	city_reports: {
		id: "city_reports",
		label: AGENT_LABELS.city_reports,
		description:
			"Report a problem in public space to the city: flooded street or arroyo, damaged path, potholes, lighting, trash, overcharging, insecurity; emergencies",
		tools: ["report_issue", "list_threads", "open_page"],
		rules: [
			"If anyone may be in danger right now, FIRST tell the person to call Línea 123 (emergencies), then offer the report.",
			"Call report_issue with a clear description in the person's own words (what, where, since when); add place_slug when it is a catalog place.",
			"Do not promise when the city will fix it; reports are triaged and followed up.",
		],
		suggestions: [
			"Reportar un arroyo crecido",
			"Hay un hueco en la vía",
			"Ver reportes de mi barrio",
		],
	},
	account: {
		id: "account",
		label: AGENT_LABELS.account,
		description:
			"The person's own account: sign in or create an account, profile, my registrations, my publications",
		tools: ["my_registrations", "open_page"],
		rules: [
			`To sign in, create an account or edit the profile, call open_page '${PROFILE_PATH}'.`,
			"Only talk about the signed-in person's own data.",
		],
		suggestions: [
			"¿En qué eventos estoy inscrito?",
			"Ir a mi perfil",
			"¿Qué planes hay este fin de semana?",
		],
	},
};

/** Rules every agent follows. */
const SHARED_RULES = [
	"You are Quillart AI, the assistant of a real citizen platform for Barranquilla, Colombia, where residents and visitors publish events, register, talk in a moderated forum and connect with public spaces and nature.",
	"Answer in the person's language (Spanish by default), warm, Colombian Caribbean tone, short: at most 3 sentences.",
	"Never invent events, places, threads, times, prices or numbers: only use tool results.",
	"For any action (register, publish, reply, report) ALWAYS call the action tool; the app asks the person to confirm. Never say an action is done until a tool result says so.",
	`If the person is not signed in and the action needs an account, say so and call open_page with path '${PROFILE_PATH}'.`,
	"Resolve relative dates ('hoy', 'este sábado', 'el finde') from the current time in America/Bogota given below.",
	"open_page only suggests a screen as a button; use internal paths like '/agenda', '/foro', '/lugares', '/mapa', '/perfil'.",
	"If the question belongs to another section, answer briefly and suggest asking about it.",
];

export function agentInstruction(agent: AssistantAgentId): string {
	const definition = AGENTS[agent];
	return [
		...SHARED_RULES,
		`You are the ${definition.label} (${definition.id}): ${definition.description}.`,
		...definition.rules,
	].join("\n");
}

export function isToolAllowed(
	agent: AssistantAgentId,
	name: string,
): name is AssistantToolName {
	return (AGENTS[agent].tools as readonly string[]).includes(name);
}

// --- Tool schemas -----------------------------------------------------------

/** The JSON Schema subset we use, so arguments can be validated here too. */
interface ParamSchema {
	type: "string" | "integer";
	description: string;
	enum?: readonly string[];
	minimum?: number;
	maximum?: number;
	maxLength?: number;
}

interface ToolSchema {
	description: string;
	properties: Record<string, ParamSchema>;
	required: string[];
}

const placeSlug: ParamSchema = {
	type: "string",
	description: "Slug of a catalog place, e.g. 'gran-malecon'",
	maxLength: 80,
};
const eventId: ParamSchema = {
	type: "string",
	description: "Event id from a previous tool result",
	maxLength: 100,
};

export const TOOL_SCHEMAS: { [N in AssistantToolName]: ToolSchema } = {
	search_events: {
		description:
			"Search upcoming community events. Read-only, runs right away.",
		properties: {
			query: {
				type: "string",
				description: "Free text, e.g. 'salsa'",
				maxLength: 100,
			},
			category: {
				type: "string",
				description: "Event category",
				enum: EVENT_CATEGORIES,
			},
			days_ahead: {
				type: "integer",
				description:
					"Only events starting within this many days from today (0 = today, 1 = today and tomorrow)",
				minimum: 0,
				maximum: 60,
			},
			place_slug: placeSlug,
		},
		required: [],
	},
	get_event: {
		description: "Details of one event. Read-only.",
		properties: { event_id: eventId },
		required: ["event_id"],
	},
	my_registrations: {
		description:
			"Events the signed-in person registered for. Read-only; needs an account.",
		properties: {},
		required: [],
	},
	list_places: {
		description: "List public spaces and natural areas. Read-only.",
		properties: {
			kind: { type: "string", description: "Kind of place", enum: PLACE_KINDS },
			query: { type: "string", description: "Free text", maxLength: 100 },
		},
		required: [],
	},
	get_place: {
		description: "Details of one place. Read-only.",
		properties: { place_slug: placeSlug },
		required: ["place_slug"],
	},
	list_threads: {
		description: "List forum conversations. Read-only.",
		properties: {
			category: {
				type: "string",
				description: "Forum category",
				enum: FORUM_CATEGORIES,
			},
			place_slug: placeSlug,
		},
		required: [],
	},
	get_directions: {
		description: "How to get to a catalog place (map link). Read-only.",
		properties: { place_slug: placeSlug },
		required: ["place_slug"],
	},
	register_for_event: {
		description:
			"Register the signed-in person for an event. Action: the app asks for confirmation.",
		properties: { event_id: eventId },
		required: ["event_id"],
	},
	unregister_from_event: {
		description:
			"Cancel the person's registration for an event. Action: the app asks for confirmation.",
		properties: { event_id: eventId },
		required: ["event_id"],
	},
	create_event: {
		description:
			"Publish a community event. Action: the app asks for confirmation; content is moderated.",
		properties: {
			title: { type: "string", description: "Short title", maxLength: 120 },
			description: {
				type: "string",
				description: "What, for whom, what to bring",
				maxLength: 2000,
			},
			category: {
				type: "string",
				description: "Event category",
				enum: EVENT_CATEGORIES,
			},
			starts_at_local: {
				type: "string",
				description: "Barranquilla local time, 'YYYY-MM-DDTHH:mm'",
				maxLength: 16,
			},
			ends_at_local: {
				type: "string",
				description: "Barranquilla local time, 'YYYY-MM-DDTHH:mm'",
				maxLength: 16,
			},
			place_slug: placeSlug,
			location_text: {
				type: "string",
				description: "Address or meeting point when it is not a catalog place",
				maxLength: 200,
			},
			capacity: {
				type: "integer",
				description: "Maximum attendees",
				minimum: 1,
				maximum: 100000,
			},
		},
		required: ["title", "description", "category", "starts_at_local"],
	},
	create_thread: {
		description:
			"Start a forum conversation. Action: the app asks for confirmation; content is moderated.",
		properties: {
			title: { type: "string", description: "Short title", maxLength: 120 },
			body: { type: "string", description: "Message", maxLength: 2000 },
			category: {
				type: "string",
				description: "Forum category",
				enum: FORUM_CATEGORIES,
			},
			place_slug: placeSlug,
		},
		required: ["title", "body", "category"],
	},
	reply_to_thread: {
		description:
			"Reply in a forum conversation. Action: the app asks for confirmation; content is moderated.",
		properties: {
			thread_id: {
				type: "string",
				description: "Thread id from a previous tool result",
				maxLength: 100,
			},
			body: { type: "string", description: "Reply", maxLength: 2000 },
		},
		required: ["thread_id", "body"],
	},
	plan_route: {
		description:
			"Route from the Gran Malecón to a corridor destination, with fare and fair taxi range. Read-only.",
		properties: {
			destination: {
				type: "string",
				description: "Corridor destination",
				enum: ROUTE_DESTINATIONS,
			},
		},
		required: ["destination"],
	},
	report_issue: {
		description:
			"Report a problem in public space to the city (goes to the forum and the city queue). Action: the app asks for confirmation.",
		properties: {
			description: {
				type: "string",
				description: "What happens, where and since when",
				maxLength: 1000,
			},
			place_slug: placeSlug,
		},
		required: ["description"],
	},
	open_page: {
		description:
			"Suggest a screen of the app as a button. Never navigates by itself.",
		properties: {
			path: {
				type: "string",
				description: "Internal path starting with '/', e.g. '/agenda'",
				maxLength: 200,
			},
			label: {
				type: "string",
				description: "Short button text in the person's language",
				maxLength: 60,
			},
		},
		required: ["path", "label"],
	},
};

function toJsonSchema(schema: ToolSchema): Record<string, unknown> {
	return {
		type: "object",
		properties: Object.fromEntries(
			Object.entries(schema.properties).map(([key, param]) => [
				key,
				{ ...param, ...(param.enum ? { enum: [...param.enum] } : {}) },
			]),
		),
		required: schema.required,
		additionalProperties: false,
	};
}

/** Gemini function declarations for the tools this agent may use, and no others. */
export function toolDeclarationsFor(
	agent: AssistantAgentId,
): FunctionDeclaration[] {
	return AGENTS[agent].tools.map((name) => ({
		name,
		description: TOOL_SCHEMAS[name].description,
		parametersJsonSchema: toJsonSchema(TOOL_SCHEMAS[name]),
	}));
}

/**
 * Checks model-proposed arguments against the tool schema: drops unknown keys,
 * clamps nothing silently. Null when a required field is missing or a value
 * has the wrong type or is outside its enum or bounds.
 */
export function sanitizeToolArgs<N extends AssistantToolName>(
	name: N,
	args: unknown,
): AssistantToolArgs[N] | null {
	if (typeof args !== "object" || args === null || Array.isArray(args)) {
		return null;
	}
	const schema = TOOL_SCHEMAS[name];
	const input = args as Record<string, unknown>;
	const output: Record<string, unknown> = {};
	for (const [key, param] of Object.entries(schema.properties)) {
		const value = input[key];
		if (value === undefined || value === null || value === "") continue;
		if (param.type === "string") {
			if (typeof value !== "string") return null;
			const text = value.trim();
			if (text === "") continue;
			if (param.maxLength !== undefined && text.length > param.maxLength) {
				return null;
			}
			if (param.enum && !param.enum.includes(text)) return null;
			output[key] = text;
		} else {
			const number = typeof value === "string" ? Number(value) : value;
			if (typeof number !== "number" || !Number.isInteger(number)) return null;
			if (param.minimum !== undefined && number < param.minimum) return null;
			if (param.maximum !== undefined && number > param.maximum) return null;
			output[key] = number;
		}
	}
	if (schema.required.some((key) => output[key] === undefined)) return null;
	if (name === "open_page" && !isInternalPath(output.path)) return null;
	return output as AssistantToolArgs[N];
}

/** Only same-site paths: "/agenda", never "//evil.com" or "https://...". */
export function isInternalPath(path: unknown): path is string {
	return (
		typeof path === "string" &&
		path.startsWith("/") &&
		!path.startsWith("//") &&
		!path.includes("\\")
	);
}
