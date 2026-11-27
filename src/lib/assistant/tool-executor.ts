// Runs the tools Quillart AI proposes against the community store, in the
// browser, with the person's own session. Never throws: failures come back as
// a compact `{ error }` summary for the model and a notice for the chat.

import {
	directionsUrl,
	EVENT_CATEGORY_LABELS,
	formatEventDay,
	formatTime,
} from "../community/community-labels";
import {
	bogotaLocalToIso,
	registrationBlocker,
	spotsLeft,
} from "../community/community-rules";
import type {
	CommunityEvent,
	CommunityStore,
	Place,
	PublishResult,
} from "../community/community-types";
import type {
	AssistantDisplay,
	AssistantToolArgs,
	AssistantToolCall,
	AssistantToolName,
	AssistantToolResult,
} from "./assistant-types";
import {
	UNTRUSTED_BODY_MAX,
	UNTRUSTED_TITLE_MAX,
	untrusted,
} from "./untrusted-content";

export interface ToolDeps {
	/** Used by plan_route to ask the mobility Guide. Defaults to global fetch. */
	fetch?: typeof fetch;
	/** Clock, for "days_ahead". Defaults to the current time. */
	now?: () => Date;
}

interface ToolOutcome {
	summary: Record<string, unknown>;
	display?: AssistantDisplay;
	declined?: boolean;
}

interface ToolContext {
	store: CommunityStore;
	fetch: typeof fetch;
	now: Date;
}

type Handler<N extends AssistantToolName> = (
	args: AssistantToolArgs[N],
	ctx: ToolContext,
) => Promise<ToolOutcome>;

const MAX_EVENTS = 6;
const MAX_PLACES = 6;
const MAX_THREADS = 6;
const DAY_MS = 24 * 60 * 60 * 1000;
const BOGOTA_OFFSET_MS = 5 * 60 * 60 * 1000;

const ROUTE_QUESTIONS: Record<
	AssistantToolArgs["plan_route"]["destination"],
	string
> = {
	estadio: "¿Cómo llego al estadio Metropolitano desde el Gran Malecón?",
	barrio_abajo: "¿Cómo llego a Barrio Abajo desde el Gran Malecón?",
	centro: "¿Cómo llego al centro desde el Gran Malecón?",
};

const STOP_WORDS = new Set([
	"de",
	"del",
	"la",
	"las",
	"el",
	"los",
	"en",
	"y",
	"un",
	"una",
	"para",
	"con",
	"por",
	"que",
	"este",
	"esta",
	"plan",
	"planes",
	"evento",
	"eventos",
]);

function normalize(text: string): string {
	return text
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase();
}

function tokens(query: string | undefined): string[] {
	if (!query) return [];
	return normalize(query)
		.split(/[^a-z0-9ñ]+/)
		.filter((word) => word.length >= 3 && !STOP_WORDS.has(word));
}

/** True when any meaningful word of the query appears in the text. */
function matches(text: string, words: string[]): boolean {
	if (words.length === 0) return true;
	const haystack = normalize(text);
	return words.some((word) => haystack.includes(word));
}

export function eventWhen(event: Pick<CommunityEvent, "startsAt">): string {
	return `${formatEventDay(event.startsAt)}, ${formatTime(event.startsAt)}`;
}

/** Midnight in Barranquilla `days` days after today's midnight. */
function bogotaDayStart(now: Date, days: number): number {
	const local = now.getTime() - BOGOTA_OFFSET_MS;
	const midnight = Math.floor(local / DAY_MS) * DAY_MS;
	return midnight + BOGOTA_OFFSET_MS + days * DAY_MS;
}

async function placeNames(
	store: CommunityStore,
	events: CommunityEvent[],
): Promise<Record<string, string>> {
	if (!events.some((event) => event.placeId)) return {};
	const places = await store.listPlaces();
	return Object.fromEntries(places.map((place) => [place.id, place.name]));
}

// Summaries go to the model. Text written by people (titles, descriptions,
// names, free-form locations) is wrapped with `untrusted()` so the model reads
// it as data; ids, dates, counts and catalog values stay plain fields.

function eventSummary(
	event: CommunityEvent,
	names: Record<string, string>,
): Record<string, unknown> {
	const catalogPlace = event.placeId ? names[event.placeId] : undefined;
	return {
		id: event.id,
		title: untrusted(event.title, UNTRUSTED_TITLE_MAX),
		when: eventWhen(event),
		starts_at: event.startsAt,
		category: event.category,
		place: catalogPlace || untrusted(event.locationText, UNTRUSTED_TITLE_MAX),
		spots_left: spotsLeft(event),
		free: event.isFree || !event.priceCop,
		...(event.status === "cancelled" ? { cancelled: true } : {}),
	};
}

function placeSummary(place: Place): Record<string, unknown> {
	return {
		slug: place.slug,
		name: place.name,
		kind: place.kind,
		neighborhood: place.neighborhood,
		free: place.isFree,
		accessible: place.isAccessible,
	};
}

async function requirePlace(
	store: CommunityStore,
	slug: string | undefined,
): Promise<Place | null> {
	if (!slug) return null;
	const place = await store.getPlace(slug);
	if (!place) throw new ToolError(`No encontramos el lugar «${slug}».`);
	return place;
}

async function requireSession(store: CommunityStore): Promise<void> {
	const profile = await store.getSession();
	if (!profile) throw new ToolError("Inicia sesión para continuar.");
}

class ToolError extends Error {}

function publishOutcome<T extends { id: string }>(
	result: PublishResult<T>,
	href: (record: T) => string,
	extra: Record<string, unknown> = {},
): ToolOutcome {
	const link =
		result.record && result.outcome !== "rejected" ? href(result.record) : null;
	return {
		summary: {
			outcome: result.outcome,
			// The triage reason may quote the submitted text.
			message: untrusted(result.message, UNTRUSTED_BODY_MAX),
			id: result.record?.id ?? null,
			...extra,
		},
		display: { kind: "publish", result, href: link },
		declined: result.outcome === "rejected",
	};
}

/** First words of a report, as a short forum title. */
export function reportTitle(description: string): string {
	const text = description.trim().replace(/\s+/g, " ");
	const clause = text.split(/[.,;:!?]/)[0]?.trim() || text;
	const words: string[] = [];
	for (const word of clause.split(" ")) {
		if ([...words, word].join(" ").length > 60 || words.length >= 10) break;
		words.push(word);
	}
	while (words.length > 3 && STOP_WORDS.has(normalize(words.at(-1) ?? "")))
		words.pop();
	const title = words.join(" ") || text.slice(0, 60);
	return `Reporte: ${title.charAt(0).toUpperCase()}${title.slice(1)}`;
}

/** A path inside this app ("/agenda"), never another site. */
export function isSafePath(path: string): boolean {
	return path.startsWith("/") && !path.startsWith("//") && !path.includes("\\");
}

const HANDLERS: { [N in AssistantToolName]: Handler<N> } = {
	async search_events(args, { store, now }) {
		const place = await requirePlace(store, args.place_slug);
		const events = await store.listEvents({
			category: args.category,
			placeId: place?.id,
		});
		const words = tokens(args.query);
		const until =
			args.days_ahead !== undefined && args.days_ahead >= 0
				? bogotaDayStart(now, Math.ceil(args.days_ahead) + 1)
				: null;
		const found = events
			.filter((event) => event.status !== "cancelled")
			.filter(
				(event) => until === null || new Date(event.startsAt).getTime() < until,
			)
			.filter((event) =>
				matches(
					`${event.title} ${event.description} ${EVENT_CATEGORY_LABELS[event.category]}`,
					words,
				),
			);
		const shown = found.slice(0, MAX_EVENTS);
		const names = await placeNames(store, shown);
		return {
			summary: {
				count: found.length,
				events: shown.map((event) => eventSummary(event, names)),
			},
			display:
				shown.length > 0
					? { kind: "events", events: shown, placeNames: names }
					: {
							kind: "notice",
							tone: "warn",
							text: "No encontramos eventos con esas condiciones.",
						},
		};
	},

	async get_event(args, { store, now }) {
		const event = await store.getEvent(args.event_id);
		if (!event) throw new ToolError("Ese evento ya no está disponible.");
		const names = await placeNames(store, [event]);
		return {
			summary: {
				...eventSummary(event, names),
				description: untrusted(event.description, UNTRUSTED_BODY_MAX),
				organizer: untrusted(event.organizerName, UNTRUSTED_TITLE_MAX),
				can_register: registrationBlocker(event, now) ?? true,
			},
			display: { kind: "events", events: [event], placeNames: names },
		};
	},

	async my_registrations(_args, { store }) {
		await requireSession(store);
		const ids = await store.myRegistrations();
		const events =
			ids.length > 0 ? await store.listEvents({ ids, limit: MAX_EVENTS }) : [];
		const names = await placeNames(store, events);
		return {
			summary: {
				count: events.length,
				events: events.map((event) => eventSummary(event, names)),
			},
			display:
				events.length > 0
					? { kind: "events", events, placeNames: names }
					: {
							kind: "notice",
							tone: "warn",
							text: "Todavía no tienes inscripciones a eventos próximos.",
						},
		};
	},

	async list_places(args, { store }) {
		const words = tokens(args.query);
		const places = (await store.listPlaces())
			.filter((place) => !args.kind || place.kind === args.kind)
			.filter((place) =>
				matches(
					`${place.name} ${place.neighborhood} ${place.description}`,
					words,
				),
			);
		const shown = places.slice(0, MAX_PLACES);
		return {
			summary: { count: places.length, places: shown.map(placeSummary) },
			display:
				shown.length > 0
					? { kind: "places", places: shown }
					: {
							kind: "notice",
							tone: "warn",
							text: "No encontramos lugares con esas condiciones.",
						},
		};
	},

	async get_place(args, { store }) {
		const place = await requirePlace(store, args.place_slug);
		if (!place) throw new ToolError("Dime qué lugar buscas.");
		return {
			summary: {
				...placeSummary(place),
				address: place.address,
				opening_hours: untrusted(place.openingHours, UNTRUSTED_TITLE_MAX),
				description: untrusted(place.description, UNTRUSTED_BODY_MAX),
			},
			display: { kind: "places", places: [place] },
		};
	},

	async list_threads(args, { store }) {
		const place = await requirePlace(store, args.place_slug);
		const threads = await store.listThreads({
			category: args.category,
			placeId: place?.id,
			limit: MAX_THREADS,
		});
		return {
			summary: {
				count: threads.length,
				threads: threads.map((thread) => ({
					id: thread.id,
					title: untrusted(thread.title, UNTRUSTED_TITLE_MAX),
					category: thread.category,
					replies: thread.replyCount,
				})),
			},
			display:
				threads.length > 0
					? { kind: "threads", threads }
					: {
							kind: "notice",
							tone: "warn",
							text: "Todavía no hay conversaciones sobre esto.",
						},
		};
	},

	async get_directions(args, { store }) {
		const place = await requirePlace(store, args.place_slug);
		if (!place) throw new ToolError("Dime a qué lugar quieres llegar.");
		const href = directionsUrl(place.name, place.latitude, place.longitude);
		return {
			summary: { place: place.name, address: place.address, url: href },
			display: {
				kind: "link",
				href,
				label: `Cómo llegar a ${place.name}`,
			},
		};
	},

	async plan_route(args, { fetch: fetchImpl }) {
		const question = ROUTE_QUESTIONS[args.destination];
		if (!question) throw new ToolError("No conocemos ese destino todavía.");
		const response = await fetchImpl("/api/guide/ask", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ question }),
		});
		if (!response.ok)
			throw new ToolError(
				"La guía de movilidad no respondió. Intenta de nuevo.",
			);
		const answer = (await response.json()) as {
			reply?: string;
			plan?: { blockedByFlood?: unknown[] } | null;
		};
		const reply = answer.reply ?? "";
		return {
			summary: {
				destination: args.destination,
				reply,
				flood_alert: (answer.plan?.blockedByFlood?.length ?? 0) > 0,
				map: "/mapa",
			},
			display: { kind: "notice", tone: "ok", text: reply },
		};
	},

	async register_for_event(args, { store, now }) {
		await requireSession(store);
		const event = await store.getEvent(args.event_id);
		if (!event) throw new ToolError("Ese evento ya no está disponible.");
		const mine = await store.myRegistrations();
		if (mine.includes(event.id)) {
			return {
				summary: { outcome: "already_registered", event_id: event.id },
				display: {
					kind: "notice",
					tone: "ok",
					text: `Ya estabas inscrito en «${event.title}».`,
				},
			};
		}
		const blocker = registrationBlocker(event, now);
		if (blocker) throw new ToolError(blocker);
		await store.register(event.id);
		return {
			summary: {
				outcome: "registered",
				event_id: event.id,
				title: untrusted(event.title, UNTRUSTED_TITLE_MAX),
				when: eventWhen(event),
			},
			display: {
				kind: "notice",
				tone: "ok",
				text: `¡Listo! Quedaste inscrito en «${event.title}» · ${eventWhen(event)}.`,
			},
		};
	},

	async unregister_from_event(args, { store }) {
		await requireSession(store);
		const event = await store.getEvent(args.event_id);
		if (!event) throw new ToolError("Ese evento ya no está disponible.");
		await store.unregister(event.id);
		return {
			summary: { outcome: "unregistered", event_id: event.id },
			display: {
				kind: "notice",
				tone: "ok",
				text: `Cancelamos tu inscripción en «${event.title}».`,
			},
		};
	},

	async create_event(args, { store }) {
		await requireSession(store);
		const startsAt = bogotaLocalToIso(args.starts_at_local);
		if (!startsAt) throw new ToolError("La fecha de inicio no es válida.");
		const endsAt = args.ends_at_local
			? bogotaLocalToIso(args.ends_at_local)
			: null;
		if (args.ends_at_local && !endsAt)
			throw new ToolError("La hora de cierre no es válida.");
		const place = await requirePlace(store, args.place_slug);
		const result = await store.createEvent({
			title: args.title,
			description: args.description,
			category: args.category,
			startsAt,
			endsAt,
			placeId: place?.id ?? null,
			locationText: args.location_text?.trim() || null,
			capacity: args.capacity ?? null,
			isFree: !args.price_cop,
			priceCop: args.price_cop ?? null,
		});
		return publishOutcome(
			result,
			(event) => `/agenda/${encodeURIComponent(event.id)}`,
		);
	},

	async create_thread(args, { store }) {
		await requireSession(store);
		const place = await requirePlace(store, args.place_slug);
		const result = await store.createThread({
			title: args.title,
			body: args.body,
			category: args.category,
			placeId: place?.id ?? null,
			eventId: null,
		});
		return publishOutcome(result, (thread) => `/foro/${thread.id}`);
	},

	async reply_to_thread(args, { store }) {
		await requireSession(store);
		const result = await store.createPost(args.thread_id, args.body);
		return publishOutcome(result, () => `/foro/${args.thread_id}`, {
			thread_id: args.thread_id,
		});
	},

	async report_issue(args, { store }) {
		await requireSession(store);
		const place = await requirePlace(store, args.place_slug);
		const result = await store.createThread({
			title: reportTitle(args.description),
			body: args.description,
			category: "safety",
			placeId: place?.id ?? null,
			eventId: null,
		});
		return publishOutcome(result, (thread) => `/foro/${thread.id}`);
	},

	async open_page(args) {
		if (!isSafePath(args.path))
			throw new ToolError("Ese enlace no es de Quillart.");
		return {
			summary: { shown: args.path },
			display: { kind: "link", href: args.path, label: args.label },
		};
	},
};

/** Runs one tool call. Never throws. */
export async function runTool(
	call: AssistantToolCall,
	store: CommunityStore,
	deps: ToolDeps = {},
): Promise<AssistantToolResult> {
	const handler = HANDLERS[call.name] as Handler<AssistantToolName> | undefined;
	try {
		if (!handler) throw new ToolError("Esa acción no está disponible.");
		const ctx: ToolContext = {
			store,
			fetch: deps.fetch ?? ((...params) => fetch(...params)),
			now: deps.now?.() ?? new Date(),
		};
		const outcome = await handler(
			(call.args ?? {}) as AssistantToolArgs[AssistantToolName],
			ctx,
		);
		return { callId: call.id, name: call.name, ...outcome };
	} catch (error) {
		const message =
			error instanceof Error && error.message
				? error.message
				: "Algo salió mal. Intenta de nuevo.";
		return {
			callId: call.id,
			name: call.name,
			summary: { error: message },
			display: { kind: "notice", tone: "error", text: message },
			declined: true,
		};
	}
}

/** Result sent when the person says no to an action. */
export function declinedResult(call: AssistantToolCall): AssistantToolResult {
	return {
		callId: call.id,
		name: call.name,
		summary: { declined: true, message: "La persona decidió no hacerlo." },
		declined: true,
	};
}
