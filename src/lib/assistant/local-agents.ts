// The specialized agents without a model: deterministic tool calls derived
// from the text, and short wrap-ups of tool results in the person's language
// (Spanish by default). Used when GEMINI_API_KEY is missing or Gemini fails,
// so Quillart AI always answers.

import type {
	EventCategory,
	ForumCategory,
	PlaceKind,
} from "../community/community-types";
import { PLACES } from "../community/places-catalog";
import { detectDestination } from "../guide/guide-local";
import type { Language } from "../i18n/languages";
import { messages as dictionaries } from "../i18n/messages";
import { OPEN_DATA_CATALOG } from "../open-data/open-data-catalog";
import { type AgentTurn, PROFILE_PATH } from "./assistant-agents";
import { hasAnyKeyword, matchPlace, normalizeText } from "./assistant-text";
import {
	type AssistantAgentId,
	type AssistantContext,
	type AssistantMessage,
	type AssistantToolArgs,
	type AssistantToolResult,
	isActionTool,
} from "./assistant-types";
import {
	formatFares,
	formatIndicators,
	type ModeFare,
} from "./city-data-format";
import {
	capacityFromText,
	dateFromText,
	priceFromText,
	quotedTitle,
	timeFromText,
	titleFromBody,
	withoutQuotes,
} from "./event-text";
import { LOCAL_COPY, localCopy } from "./local-copy";
import type { LocalCopy } from "./local-copy-types";
import { latestUserText, matchedAgents } from "./orchestrator";
import { screenEventId, screenPlaceSlug } from "./screen-context";

const BOGOTA_OFFSET_MS = -5 * 60 * 60 * 1000;

/** Day of the week in Barranquilla (0 = Sunday); Colombia has no DST. */
export function bogotaWeekday(nowIso: string): number {
	const time = Date.parse(nowIso);
	const safe = Number.isNaN(time) ? Date.now() : time;
	return new Date(safe + BOGOTA_OFFSET_MS).getUTCDay();
}

function daysUntil(weekday: number, nowIso: string): number {
	return (weekday - bogotaWeekday(nowIso) + 7) % 7;
}

const WEEKDAYS: [string, number][] = [
	["domingo", 0],
	["lunes", 1],
	["martes", 2],
	["miercoles", 3],
	["jueves", 4],
	["viernes", 5],
	["sabado", 6],
];

/** "hoy" → 0, "mañana" → 1, "el finde" → until Sunday, "el sábado" → until Saturday. */
export function daysAheadFrom(text: string, nowIso: string): number | null {
	const normalized = normalizeText(text);
	if (
		hasAnyKeyword(normalized, [
			"hoy",
			"today",
			"esta noche",
			"tonight",
			"hoje",
			"esta noite",
			"aujourd hui",
			"ce soir",
		])
	) {
		return 0;
	}
	if (hasAnyKeyword(normalized, ["pasado manana", "apres demain"])) return 2;
	if (hasAnyKeyword(normalized, ["manana", "tomorrow", "amanha", "demain"])) {
		return 1;
	}
	if (
		hasAnyKeyword(normalized, [
			"fin de semana",
			"finde",
			"weekend",
			"fim de semana",
			"week end",
		])
	) {
		return daysUntil(0, nowIso);
	}
	for (const [name, weekday] of WEEKDAYS) {
		if (hasAnyKeyword(normalized, [name])) return daysUntil(weekday, nowIso);
	}
	if (hasAnyKeyword(normalized, ["esta semana", "this week"])) {
		return daysUntil(0, nowIso);
	}
	if (hasAnyKeyword(normalized, ["este mes", "this month"])) return 30;
	return null;
}

const EVENT_CATEGORY_WORDS: Record<EventCategory, string[]> = {
	music: [
		"musica",
		"music",
		"concierto*",
		"concert",
		"concerts",
		"baile*",
		"bailar",
		"salsa",
		"champeta",
		"cumbia",
		"millo",
		"tambora",
	],
	culture: [
		"cultura*",
		"culture",
		"teatro",
		"arte",
		"museo*",
		"carnaval",
		"cine",
	],
	sport: [
		"deporte*",
		"sport*",
		"futbol",
		"correr",
		"carrera",
		"bici*",
		"yoga",
		"partido",
	],
	nature: ["naturaleza", "nature", "aves", "manglar*", "caminata*", "siembra"],
	volunteer: ["voluntari*", "volunteer*", "limpieza", "jornada"],
	food: ["comida", "food", "gastronom*", "comer", "fritos", "mercado"],
	learning: ["taller*", "workshop*", "curso*", "clase*", "aprender"],
	community: ["vecin*", "barrio", "encuentro*", "comunitari*"],
};

const FORUM_CATEGORY_WORDS: Partial<Record<ForumCategory, string[]>> = {
	mobility: ["movilidad", "transporte", "transmetro", "bus", "trancon"],
	nature: ["naturaleza", "aves", "manglar*", "arbol*", "ambiente"],
	safety: ["seguridad", "inseguridad", "robo*", "peligro*"],
	culture: ["cultura*", "carnaval", "musica", "arte"],
	visitors: ["visitante*", "turista*", "extranjero*", "visitors"],
	neighborhood: ["barrio", "vecin*", "cuadra"],
};

const PLACE_KIND_WORDS: Record<PlaceKind, string[]> = {
	nature: ["naturaleza", "nature", "manglar*", "aves", "cienaga", "ecoparque"],
	park: ["parque*", "park*"],
	waterfront: ["rio", "malecon", "mar", "playa*", "muelle", "river"],
	culture: ["cultura*", "museo*", "culture", "museum"],
	heritage: ["patrimonio", "historia", "historic*", "centro historico"],
	sport: ["deporte*", "cancha*", "sport*"],
};

function firstMatch<K extends string>(
	normalized: string,
	words: Partial<Record<K, string[]>>,
): K | undefined {
	for (const [key, list] of Object.entries(words) as [K, string[]][]) {
		if (hasAnyKeyword(normalized, list)) return key;
	}
	return undefined;
}

const ORDINALS: [string[], number][] = [
	[["primero", "primera", "first", "1"], 0],
	[["segundo", "segunda", "second", "2"], 1],
	[["tercero", "tercera", "third", "3"], 2],
	[["cuarto", "cuarta", "fourth", "4"], 3],
	[["quinto", "quinta", "fifth", "5"], 4],
];

/** Event ids from the latest event tool results, in the order they were shown. */
export function recentEventIds(messages: AssistantMessage[]): string[] {
	for (let index = messages.length - 1; index >= 0; index -= 1) {
		const message = messages[index];
		if (message.role !== "tool") continue;
		for (const result of message.results) {
			if (result.name !== "search_events" && result.name !== "get_event") {
				continue;
			}
			const ids = idsInSummary(result.summary);
			if (ids.length > 0) return ids;
		}
	}
	return [];
}

function idsInSummary(summary: Record<string, unknown>): string[] {
	if (typeof summary.id === "string") return [summary.id];
	for (const value of Object.values(summary)) {
		if (!Array.isArray(value)) continue;
		const ids = value
			.map((item) =>
				typeof item === "object" && item !== null
					? (item as { id?: unknown }).id
					: undefined,
			)
			.filter((id): id is string => typeof id === "string");
		if (ids.length > 0) return ids;
	}
	return [];
}

function pickEventId(text: string, ids: string[]): string | null {
	if (ids.length === 0) return null;
	const normalized = normalizeText(text);
	if (hasAnyKeyword(normalized, ["ultimo", "ultima", "last"])) {
		return ids[ids.length - 1];
	}
	for (const [words, position] of ORDINALS) {
		if (hasAnyKeyword(normalized, words)) return ids[position] ?? null;
	}
	return ids.length === 1 ? ids[0] : null;
}

/** The place the text names, or the one open on the screen ("¿qué hay aquí?"). */
function placeFor(text: string, context: AssistantContext) {
	const named = matchPlace(text);
	if (named) return named;
	const slug = screenPlaceSlug(context.screen);
	return slug ? (PLACES.find((place) => place.slug === slug) ?? null) : null;
}

function signInTurn(copy: LocalCopy, reason: string): AgentTurn {
	return {
		text: copy.signIn(reason),
		toolCalls: [
			{
				name: "open_page",
				args: { path: PROFILE_PATH, label: copy.signInLabel },
			},
		],
	};
}

const REGISTER_WORDS = [
	"inscrib*",
	"anotame",
	"anotarme",
	"registrame",
	"reservame",
	"sign me up",
	"register",
	"inscrev*",
	"inscrire*",
];
const UNREGISTER_WORDS = [
	"cancelar mi inscripcion",
	"cancela mi inscripcion",
	"desinscrib*",
	"ya no voy",
	"ya no puedo ir",
	"borrame",
];
const CREATE_EVENT_WORDS = [
	"publicar",
	"publica",
	"crear",
	"crea",
	"organizar",
	"organizo",
	"subir",
	"anunciar",
];

const DAY_MS = 24 * 60 * 60 * 1000;

function capitalize(text: string): string {
	return text.charAt(0).toUpperCase() + text.slice(1);
}

/** A colon that introduces the event, not the one inside "6:30 pm". */
const INTRO_COLON = /(?<!\d):(?!\d)/;

/**
 * What the person said about the event they want to publish, as a
 * create_event draft: title (a quoted name wins), description (their words),
 * category, start time when they gave a day and an hour, capacity, price and
 * the place.
 */
export function eventDraftFromText(
	text: string,
	context: AssistantContext,
): Partial<AssistantToolArgs["create_event"]> & {
	title: string;
	description: string;
	category: EventCategory;
} {
	const clean = text.trim().replace(/\s+/g, " ");
	const quoted = quotedTitle(clean);
	const colon = INTRO_COLON.exec(clean)?.index ?? -1;
	const quoteAt = quoted ? clean.indexOf(quoted) : -1;
	const body = (
		colon >= 0 && (quoteAt < 0 || quoteAt > colon)
			? clean.slice(colon + 1)
			: clean.replace(
					/^.*?\b(evento|plan|actividad|event)\b(\s+(de|llamad[oa]|titulad[oa]|que se llama))?/i,
					"",
				)
	).trim();
	// "Quiero publicar un evento" alone: nothing to fill yet.
	const description = capitalize(withoutQuotes(body)).slice(0, 2000);
	const title = capitalize(quoted ?? titleFromBody(withoutQuotes(body))).slice(
		0,
		120,
	);
	const normalized = normalizeText(clean);
	const category = firstMatch(normalized, EVENT_CATEGORY_WORDS) ?? "community";
	const draft: ReturnType<typeof eventDraftFromText> = {
		title,
		description,
		category,
	};
	// The quoted name says nothing about when: "Fiesta del sábado" may be on Friday.
	const details = quoted ? clean.replace(quoted, " ") : clean;
	const whenText = details.replace(/\bde la ma[nñ]ana\b/gi, " ");
	const time = timeFromText(details);
	const days = daysAheadFrom(whenText, context.now);
	const date = dateFromText(whenText, context.now);
	if (time && (date || days !== null)) {
		const now = Date.parse(context.now);
		const today = new Date(
			(Number.isNaN(now) ? Date.now() : now) + BOGOTA_OFFSET_MS,
		);
		const day =
			date ??
			new Date(today.getTime() + (days ?? 0) * DAY_MS)
				.toISOString()
				.slice(0, 10);
		draft.starts_at_local = `${day}T${time}`;
	}
	const capacity = capacityFromText(details);
	if (capacity !== null) draft.capacity = capacity;
	const price = priceFromText(details);
	if (price !== null) draft.price_cop = price;
	const place = placeFor(clean, context);
	if (place) draft.place_slug = place.slug;
	return draft;
}

/** The event form, filled with what could be understood (U14). */
function eventFormPath(draft: ReturnType<typeof eventDraftFromText>): string {
	if (!draft.title) return "/agenda/nuevo";
	const params = new URLSearchParams({
		titulo: draft.title,
		categoria: draft.category,
	});
	// Short enough for a link; a long text is better written in the form.
	if (draft.description.length <= 160) {
		params.set("descripcion", draft.description);
	}
	if (draft.place_slug) params.set("lugar", draft.place_slug);
	if (draft.capacity) params.set("cupos", String(draft.capacity));
	if (draft.price_cop) params.set("costo", String(draft.price_cop));
	return `/agenda/nuevo?${params.toString()}`;
}

function agendaTurn(
	text: string,
	messages: AssistantMessage[],
	context: AssistantContext,
): AgentTurn {
	const copy = localCopy(context.language);
	const normalized = normalizeText(text);

	if (
		hasAnyKeyword(normalized, CREATE_EVENT_WORDS) &&
		hasAnyKeyword(normalized, ["evento*", "plan", "actividad*", "event"])
	) {
		// Signed in or not, the draft is kept: without an account the card
		// asks to sign in and comes back ready to confirm (U02).
		const draft = eventDraftFromText(text, context);
		if (draft.title && draft.starts_at_local) {
			return {
				text: copy.eventDrafted,
				toolCalls: [
					{
						name: "create_event",
						args: draft as AssistantToolArgs["create_event"],
					},
				],
			};
		}
		return {
			text: copy.eventFormFilled,
			toolCalls: [
				{
					name: "open_page",
					args: {
						path: eventFormPath(draft),
						label: copy.createEventLabel,
					},
				},
			],
		};
	}

	const wantsOut = hasAnyKeyword(normalized, UNREGISTER_WORDS);
	if (wantsOut || hasAnyKeyword(normalized, REGISTER_WORDS)) {
		// "Inscríbeme" on an event's screen means that event.
		const eventId =
			pickEventId(text, recentEventIds(messages)) ??
			screenEventId(context.screen);
		if (eventId) {
			return wantsOut
				? {
						text: copy.confirmUnregister,
						toolCalls: [
							{ name: "unregister_from_event", args: { event_id: eventId } },
						],
					}
				: {
						text: copy.confirmRegister,
						toolCalls: [
							{ name: "register_for_event", args: { event_id: eventId } },
						],
					};
		}
		if (wantsOut) {
			return {
				text: copy.whichToLeave,
				toolCalls: [],
			};
		}
	}

	const args: AssistantToolArgs["search_events"] = {};
	const daysAhead = daysAheadFrom(text, context.now);
	if (daysAhead !== null) args.days_ahead = daysAhead;
	const category = firstMatch(normalized, EVENT_CATEGORY_WORDS);
	if (category) args.category = category;
	const place = placeFor(text, context);
	if (place) args.place_slug = place.slug;
	const label = category
		? dictionaries[context.language ?? "es"].shared.eventCategories[category]
		: null;
	return {
		text: copy.searchEvents(label),
		toolCalls: [{ name: "search_events", args }],
	};
}

function communityTurn(text: string, context: AssistantContext): AgentTurn {
	const copy = localCopy(context.language);
	const normalized = normalizeText(text);
	if (
		hasAnyKeyword(normalized, [
			"nueva conversacion",
			"abrir",
			"abre",
			"crear",
			"publicar",
			"preguntar",
			"preguntarle",
			"escribir",
			"nuevo tema",
			"new thread",
		])
	) {
		return {
			text: copy.newThread,
			toolCalls: [
				{
					name: "open_page",
					args: { path: "/foro?nuevo=1", label: copy.newThreadLabel },
				},
			],
		};
	}
	const args: AssistantToolArgs["list_threads"] = {};
	const category = firstMatch(normalized, FORUM_CATEGORY_WORDS);
	if (category) args.category = category;
	const place = placeFor(text, context);
	if (place) args.place_slug = place.slug;
	return {
		text: copy.listThreads,
		toolCalls: [{ name: "list_threads", args }],
	};
}

const DIRECTIONS_WORDS = [
	"como llego",
	"como llegar",
	"como voy",
	"direccion*",
	"ubicacion",
	"donde queda",
	"how do i get",
	"directions",
	"como chego",
	"como chegar",
	"comment aller",
	"itineraire",
	"llevame",
	"lleveme",
	"llevarme",
	"llevanos",
	"take me",
	"quiero ir",
	"quiero llegar",
	"ruta*",
	"route*",
];

function placesTurn(text: string, context: AssistantContext): AgentTurn {
	const copy = localCopy(context.language);
	const normalized = normalizeText(text);
	const place = placeFor(text, context);
	if (place) {
		if (hasAnyKeyword(normalized, DIRECTIONS_WORDS)) {
			return {
				text: copy.directionsTo(place.name),
				toolCalls: [
					{ name: "get_directions", args: { place_slug: place.slug } },
				],
			};
		}
		return {
			text: copy.aboutPlace(place.name),
			toolCalls: [{ name: "get_place", args: { place_slug: place.slug } }],
		};
	}
	const kind = firstMatch(normalized, PLACE_KIND_WORDS);
	return {
		text: copy.listPlaces,
		toolCalls: [{ name: "list_places", args: kind ? { kind } : {} }],
	};
}

const FARE_WORDS = [
	"tarifa*",
	"pasaje*",
	"precio*",
	"cuanto cuesta",
	"cuanto vale",
	"cuanto sale",
	"cobra*",
	"fare*",
	"price*",
	"how much",
	"passagem",
	"preco*",
	"quanto custa",
	"tarif*",
	"prix",
	"combien",
];

function mobilityTurn(text: string, context: AssistantContext): AgentTurn {
	const copy = localCopy(context.language);
	if (hasAnyKeyword(normalizeText(text), FARE_WORDS)) {
		return {
			text: copy.fares,
			toolCalls: [{ name: "get_fares", args: {} }],
		};
	}
	const destination = detectDestination(text);
	if (destination) {
		return {
			text: copy.routeFromMalecon,
			toolCalls: [{ name: "plan_route", args: { destination } }],
		};
	}
	const place = placeFor(text, context);
	if (place) {
		return {
			text: copy.directionsTo(place.name),
			toolCalls: [{ name: "get_directions", args: { place_slug: place.slug } }],
		};
	}
	return {
		text: copy.whereTo,
		toolCalls: [
			{ name: "open_page", args: { path: "/mapa", label: copy.mapLabel } },
		],
	};
}

const NEWS_WORDS = [
	"novedad*",
	"aviso*",
	"noticia*",
	"alerta*",
	"news",
	"novidade*",
	"nouveaute*",
	"actualite*",
];

const INDICATOR_WORDS = [
	"indicador*",
	"indicator*",
	"indicateur*",
	"meta*",
	"progreso",
	"progress",
];

/** Words of each dataset slug and title, so "los paraderos" finds it. */
function datasetFor(normalized: string) {
	return OPEN_DATA_CATALOG.find((dataset) =>
		hasAnyKeyword(normalized, [
			dataset.slug.replace(/-/g, " "),
			...normalizeText(dataset.title)
				.trim()
				.split(" ")
				.filter((word) => word.length >= 6),
		]),
	);
}

function cityDataTurn(text: string, context: AssistantContext): AgentTurn {
	const copy = localCopy(context.language);
	const normalized = normalizeText(text);
	if (hasAnyKeyword(normalized, NEWS_WORDS)) {
		return { text: copy.news, toolCalls: [{ name: "get_news", args: {} }] };
	}
	if (hasAnyKeyword(normalized, INDICATOR_WORDS)) {
		return {
			text: copy.indicators,
			toolCalls: [{ name: "get_city_indicators", args: {} }],
		};
	}
	const dataset = datasetFor(normalized);
	return {
		text: copy.openData,
		toolCalls: [
			{
				name: "get_open_data",
				args: dataset ? { dataset: dataset.slug } : {},
			},
		],
	};
}

const EMERGENCY_WORDS = [
	"emergencia*",
	"emergency",
	"herido*",
	"accidente*",
	"peligro*",
	"atrapado*",
	"se lo llevo",
	"arrastr*",
	"incendio",
	"fire",
	"auxilio",
	"ayuda urgente",
	"urgence*",
	"ferido*",
	"blesse*",
	"perigo*",
	"danger*",
	"incendie",
	"au secours",
];

/** The Spanish emergency reminder; other languages live in LOCAL_COPY. */
export const EMERGENCY_TEXT = LOCAL_COPY.es.emergency;

const MAX_REPORT_LENGTH = 1000;

const OVERCHARGE_WORDS = [
	"me cobraron",
	"cobro de mas",
	"cobrar de mas",
	"cobro abusivo",
	"overcharg*",
];

/** "Me cobraron 25.000 en un taxi" → the fare report form, already filled (U17). */
export function overchargeReportPath(text: string): string {
	const normalized = normalizeText(text);
	const params = new URLSearchParams();
	const amount = /(\d{1,3}(?:[.,\s]\d{3})+|\d{4,6})/.exec(text)?.[1];
	if (amount) params.set("monto", amount.replace(/\D/g, ""));
	if (hasAnyKeyword(normalized, ["taxi*"])) params.set("vehiculo", "taxi");
	else if (hasAnyKeyword(normalized, ["bus", "buseta*", "transmetro"])) {
		params.set("vehiculo", "bus");
	}
	const search = params.toString();
	return `/reportar${search ? `?${search}` : ""}`;
}

function cityReportsTurn(text: string, context: AssistantContext): AgentTurn {
	const copy = localCopy(context.language);
	const normalizedText = normalizeText(text);
	const emergency = hasAnyKeyword(normalizedText, EMERGENCY_WORDS);
	const prefix = emergency ? `${copy.emergency} ` : "";
	if (!emergency && hasAnyKeyword(normalizedText, OVERCHARGE_WORDS)) {
		// Fares have their own form (no account needed): open it filled.
		return {
			text: copy.fareReportReady,
			toolCalls: [
				{
					name: "open_page",
					args: {
						path: overchargeReportPath(text),
						label: copy.fareReportLabel,
					},
				},
			],
		};
	}
	// Without an account the report stays ready: the card asks to sign in (U02).
	const place = placeFor(text, context);
	return {
		text: `${prefix}${copy.reportReady}`,
		toolCalls: [
			{
				name: "report_issue",
				args: {
					description: text.trim().slice(0, MAX_REPORT_LENGTH),
					...(place ? { place_slug: place.slug } : {}),
				},
			},
		],
	};
}

function accountTurn(text: string, context: AssistantContext): AgentTurn {
	const copy = localCopy(context.language);
	const normalized = normalizeText(text);
	if (!context.signedIn) {
		return signInTurn(copy, copy.reasons.notSignedIn);
	}
	if (
		hasAnyKeyword(normalized, [
			"perfil",
			"profile",
			"cuenta",
			"cerrar sesion",
			"nombre",
			"contrasena",
			"profil",
			"conta",
			"compte",
			"senha",
			"mot de passe",
		]) &&
		!hasAnyKeyword(normalized, ["inscripcion*", "inscrit*", "mis eventos"])
	) {
		return {
			text: copy.profile,
			toolCalls: [
				{
					name: "open_page",
					args: { path: PROFILE_PATH, label: copy.profileLabel },
				},
			],
		};
	}
	return {
		text: copy.myRegistrations,
		toolCalls: [{ name: "my_registrations", args: {} }],
	};
}

// --- Tool-result wrap-up ------------------------------------------------------

function countIn(summary: Record<string, unknown>): number | null {
	if (typeof summary.count === "number") return summary.count;
	for (const value of Object.values(summary)) {
		if (Array.isArray(value)) return value.length;
	}
	return null;
}

function failed(result: AssistantToolResult): boolean {
	return typeof result.summary.error === "string";
}

function publishText(
	result: AssistantToolResult,
	done: string,
	copy: LocalCopy,
): string {
	const outcome = result.summary.outcome;
	if (outcome === "held") return copy.wrapUp.held;
	if (outcome === "rejected") return copy.wrapUp.rejected;
	return done;
}

/** One short sentence for a tool result in the language; "" when nothing to add. */
export function wrapUpResult(
	result: AssistantToolResult,
	language?: Language,
): string {
	const copy = localCopy(language);
	const words = copy.wrapUp;
	// The chat already shows the error or moderation notice; keep this short.
	if (failed(result)) return words.failed;
	if (result.summary.outcome === "rejected") {
		return publishText(result, "", copy);
	}
	if (result.declined) {
		return isActionTool(result.name) ? words.declined : "";
	}
	const count = countIn(result.summary);
	switch (result.name) {
		case "search_events":
			return count === 0
				? words.eventsNone
				: count === null
					? words.eventsSome
					: words.eventsCount(count);
		case "get_event":
			return words.eventDetails;
		case "my_registrations":
			return count === 0
				? words.registrationsNone
				: count === null
					? words.registrationsSome
					: words.registrationsCount(count);
		case "list_places":
			return count === 0
				? words.placesNone
				: count === null
					? words.placesSome
					: words.placesCount(count);
		case "get_place":
			return words.placeInfo(
				typeof result.summary.name === "string" ? result.summary.name : null,
			);
		case "get_directions":
			return words.directions;
		case "list_threads":
			return count === 0
				? words.threadsNone
				: count === null
					? words.threadsSome
					: words.threadsCount(count);
		case "plan_route":
			return result.summary.flood_alert === true
				? words.floodAlert
				: words.route;
		case "register_for_event":
			return result.summary.outcome === "already_registered"
				? words.alreadyRegistered
				: words.registered;
		case "unregister_from_event":
			return words.unregistered;
		case "create_event":
			return publishText(result, words.eventPublished, copy);
		case "create_thread":
			return publishText(result, words.threadPublished, copy);
		case "reply_to_thread":
			return publishText(result, words.replyPublished, copy);
		case "report_issue":
			return publishText(result, words.reportSent, copy);
		case "open_page":
			return "";
		case "get_fares": {
			const fares = result.summary.fares;
			return Array.isArray(fares) && fares.length > 0
				? words.fares(formatFares(fares as ModeFare[]))
				: words.fallback;
		}
		case "get_news": {
			const alerts = result.summary.arroyo_alerts;
			const events = result.summary.new_events;
			return words.news(
				Array.isArray(alerts) ? alerts.length : 0,
				Array.isArray(events) ? events.length : 0,
			);
		}
		case "get_open_data":
			return Array.isArray(result.summary.datasets)
				? words.openDataCatalog(count ?? 0)
				: words.openDataRecords(count ?? 0);
		case "get_city_indicators": {
			const indicators = result.summary.indicators;
			return Array.isArray(indicators) && indicators.length > 0
				? words.indicators(
						formatIndicators(
							indicators as Parameters<typeof formatIndicators>[0],
						),
					)
				: words.fallback;
		}
	}
}

export function wrapUpResults(
	results: AssistantToolResult[],
	language?: Language,
): string {
	const sentences = [
		...new Set(
			results.map((result) => wrapUpResult(result, language)).filter(Boolean),
		),
	];
	return sentences.slice(0, 3).join(" ") || localCopy(language).wrapUp.fallback;
}

/**
 * The orchestrator without Gemini: every specialist the keywords point to
 * takes its part, and their sentences and tool calls are joined.
 */
function orchestratorTurn(
	text: string,
	messages: AssistantMessage[],
	context: AssistantContext,
): AgentTurn {
	const parts = matchedAgents(text).filter((id) => id !== "quillart");
	const turns = (parts.length > 0 ? parts : ["agenda" as const]).map((id) =>
		answerLocally(id, messages, context),
	);
	return {
		text: turns
			.map((turn) => turn.text)
			.filter(Boolean)
			.join(" "),
		toolCalls: turns.flatMap((turn) => turn.toolCalls),
	};
}

/** One local agent turn: a wrap-up after tool results, or tool calls from the text. */
export function answerLocally(
	agent: AssistantAgentId,
	messages: AssistantMessage[],
	context: AssistantContext,
): AgentTurn {
	const latest = messages.at(-1);
	if (latest?.role === "tool") {
		return {
			text: wrapUpResults(latest.results, context.language),
			toolCalls: [],
		};
	}
	const text = latestUserText(messages);
	switch (agent) {
		case "agenda":
			return agendaTurn(text, messages, context);
		case "community":
			return communityTurn(text, context);
		case "places":
			return placesTurn(text, context);
		case "mobility":
			return mobilityTurn(text, context);
		case "city_reports":
			return cityReportsTurn(text, context);
		case "account":
			return accountTurn(text, context);
		case "city_data":
			return cityDataTurn(text, context);
		case "quillart":
			return orchestratorTurn(text, messages, context);
	}
}
