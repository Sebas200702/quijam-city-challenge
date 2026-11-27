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
import {
	AGENTS,
	type AgentTurn,
	PROFILE_PATH,
	type ToolCallDraft,
} from "./assistant-agents";
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
import type { AppScreen, LocalCopy } from "./local-copy-types";
import {
	latestUserText,
	matchedAgents,
	slangQuestionTerm,
} from "./orchestrator";
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

// --- App commands -------------------------------------------------------------
// Requests to drive the app itself (language, light/dark mode, back, open a
// screen, show a place on the map, a slang word), answered the same way by
// every agent before its own turn. Deliberately strict: a data question
// ("¿qué eventos hay hoy?") or a place ("llévame al Malecón") never matches,
// so it still reaches the agent that looks the data up.

/** Courtesy and "can you / I want to" openers, stripped before matching. */
const COMMAND_OPENERS = [
	"por favor",
	"porfa",
	"oye",
	"hola",
	"hey",
	"quillart",
	"please",
	"ok",
	"okay",
	"dale",
	"bueno",
	"y",
	"me puedes",
	"me podrias",
	"puedes",
	"podrias",
	"quiero",
	"quisiera",
	"necesito",
	"can you",
	"could you",
	"i want to",
	"i d like to",
	"i would like to",
	"let s",
	"voce pode",
	"pode",
	"eu quero",
	"quero",
	"gostaria de",
	"peux tu",
	"tu peux",
	"pouvez vous",
	"je veux",
	"je voudrais",
	"s il te plait",
	"s il vous plait",
	"stp",
	"svp",
];

const COMMAND_CLOSERS = [
	"por favor",
	"porfa",
	"please",
	"pls",
	"s il te plait",
	"s il vous plait",
	"stp",
	"svp",
	"gracias",
	"thanks",
	"obrigado",
	"obrigada",
	"merci",
	"ya",
	"ahora",
	"now",
	"agora",
	"maintenant",
	"quillart",
];

/** The command itself, without openers and closers: " abre el mapa ". */
function commandCore(normalized: string): string {
	let core = normalized;
	for (let changed = true; changed; ) {
		changed = false;
		for (const phrase of COMMAND_OPENERS) {
			if (core.startsWith(` ${phrase} `)) {
				core = core.slice(phrase.length + 1);
				changed = true;
			}
		}
		for (const phrase of COMMAND_CLOSERS) {
			if (core.endsWith(` ${phrase} `)) {
				core = core.slice(0, core.length - phrase.length - 1);
				changed = true;
			}
		}
	}
	return core;
}

function wordsOf(core: string): string[] {
	return core.trim().split(" ").filter(Boolean);
}

const LANGUAGE_WORDS: Record<Language, string[]> = {
	es: ["espanol", "castellano", "spanish", "espagnol", "espanhol"],
	en: ["ingles", "english", "anglais"],
	pt: ["portugues", "portuguese", "portugais"],
	fr: ["frances", "french", "francais"],
};

function languageOf(word: string | undefined): Language | null {
	if (!word) return null;
	for (const [language, words] of Object.entries(LANGUAGE_WORDS) as [
		Language,
		string[],
	][]) {
		if (words.includes(word)) return language;
	}
	return null;
}

/** Words that start a language change: "habla…", "cambia el idioma…". */
const LANGUAGE_LEADS = new Set([
	"idioma",
	"lenguaje",
	"lengua",
	"language",
	"langue",
	"lingua",
	"habla",
	"hablame",
	"hablemos",
	"hable",
	"hablar",
	"responde",
	"respondeme",
	"responder",
	"contesta",
	"contestame",
	"escribe",
	"escribeme",
	"cambia",
	"cambiar",
	"cambialo",
	"cambiame",
	"pon",
	"ponlo",
	"ponme",
	"pasa",
	"pasalo",
	"pasame",
	"speak",
	"talk",
	"answer",
	"reply",
	"write",
	"switch",
	"change",
	"set",
	"fala",
	"fale",
	"falar",
	"responda",
	"mude",
	"mudar",
	"muda",
	"troca",
	"trocar",
	"coloca",
	"parle",
	"parlez",
	"parler",
	"reponds",
	"repondez",
	"ecris",
	"passe",
	"passer",
	"mets",
	"changer",
]);

/** Words allowed between the lead and the language: "el idioma de la app a". */
const LANGUAGE_LINKS = new Set([
	...LANGUAGE_LEADS,
	..."en in em a al to para o l into me la el le lo los the de del da do du it us nos con conmigo with com avec".split(
		" ",
	),
	..."app aplicacion aplicativo todo everything tudo tout pagina page site sitio web plataforma platform interfaz interface mejor better solo only mi my tu your su et y and".split(
		" ",
	),
]);

/**
 * "en inglés", "cambia el idioma a inglés", "habla en inglés", "switch to
 * english", "em português", "en français" → that language. The language must
 * end the command, so "¿hay eventos en inglés?" stays a question.
 */
function languageCommand(core: string): Language | null {
	const words = wordsOf(core);
	const language = languageOf(words.at(-1));
	if (!language) return null;
	if (words.length === 1) return language;
	if (words.length === 2 && LANGUAGE_LINKS.has(words[0])) return language;
	if (!LANGUAGE_LEADS.has(words[0])) return null;
	const middle = words.slice(1, -1);
	return middle.every((word) => LANGUAGE_LINKS.has(word) || languageOf(word))
		? language
		: null;
}

const DARK_PHRASES = [
	"modo oscuro",
	"tema oscuro",
	"fondo oscuro",
	"modo noche",
	"modo nocturno",
	"dark mode",
	"dark theme",
	"night mode",
	"modo escuro",
	"tema escuro",
	"mode sombre",
	"theme sombre",
	"mode nuit",
];
const LIGHT_PHRASES = [
	"modo claro",
	"tema claro",
	"fondo claro",
	"modo dia",
	"modo de dia",
	"light mode",
	"light theme",
	"day mode",
	"mode clair",
	"theme clair",
	"mode jour",
];
const TURN_OFF_WORDS = [
	"quita*",
	"desactiva*",
	"apaga*",
	"turn off",
	"switch off",
	"disable",
	"desliga*",
	"desativ*",
	"eteins",
	"enleve",
];

/** Last position of any of the phrases in the text, or -1. */
function lastIndexOfAny(normalized: string, phrases: string[]): number {
	return Math.max(
		...phrases.map((phrase) => normalized.lastIndexOf(` ${phrase} `)),
	);
}

/** "modo oscuro", "dark mode", "quita el modo oscuro" → the theme to set. */
function themeCommand(normalized: string): "light" | "dark" | null {
	if (wordsOf(normalized).length > 10) return null;
	const dark = lastIndexOfAny(normalized, DARK_PHRASES);
	const light = lastIndexOfAny(normalized, LIGHT_PHRASES);
	if (dark < 0 && light < 0) return null;
	// "de modo claro a modo oscuro": the one said last wins.
	const named = dark > light ? "dark" : "light";
	const both = dark >= 0 && light >= 0;
	if (!both && hasAnyKeyword(normalized, TURN_OFF_WORDS)) {
		return named === "dark" ? "light" : "dark";
	}
	return named;
}

const BACK_COMMANDS = new Set([
	"atras",
	"ve atras",
	"ir atras",
	"vamos atras",
	"vuelve atras",
	"volver atras",
	"vuelvete",
	"regresa",
	"regresar",
	"regresa atras",
	"regresar atras",
	"regresate",
	"devuelvete",
	"devuelveme",
	"pa tras",
	"pa atras",
	"para atras",
	"volver",
	"vuelve a la pantalla anterior",
	"vuelve a la pagina anterior",
	"volver a la pantalla anterior",
	"volver a la pagina anterior",
	"regresa a la pantalla anterior",
	"regresa a la pagina anterior",
	"pantalla anterior",
	"pagina anterior",
	"go back",
	"back",
	"previous page",
	"previous screen",
	"voltar",
	"volta",
	"volte",
	"voltar atras",
	"volta atras",
	"tela anterior",
	"retour",
	"reviens",
	"revenir",
	"retourne",
	"retour en arriere",
	"reviens en arriere",
	"revenir en arriere",
	"en arriere",
	"page precedente",
	"ecran precedent",
]);
const MAX_BACK_WORDS = 5;

/** "atrás", "vuelve atrás", "regresa", "go back": short and nothing else. */
function isBackCommand(core: string): boolean {
	const words = wordsOf(core);
	return (
		words.length > 0 &&
		words.length <= MAX_BACK_WORDS &&
		BACK_COMMANDS.has(words.join(" "))
	);
}

/** Verbs that open or show something, longest first so "show me" wins over "show". */
const OPEN_VERBS = [
	"llevame a la seccion de",
	"llevame a la seccion",
	"emmene moi a",
	"take me to the",
	"take me to",
	"me leva para",
	"me leve para",
	"llevame a",
	"llevame al",
	"go back to",
	"vamos a",
	"vamos al",
	"montre moi",
	"me mostre",
	"show me",
	"ensename",
	"muestrame",
	"mostrame",
	"pasame a",
	"pasame al",
	"entra a",
	"entra al",
	"entrar a",
	"entrar al",
	"vuelve a",
	"vuelve al",
	"volver a",
	"volver al",
	"regresa a",
	"regresa al",
	"regresar a",
	"regresar al",
	"aller a",
	"allons a",
	"retourne a",
	"retour a",
	"ir para",
	"vai para",
	"va para",
	"back to",
	"go to",
	"ir a",
	"ir al",
	"ve a",
	"ve al",
	"va a",
	"abreme",
	"abrime",
	"abre",
	"abrir",
	"abra",
	"muestra",
	"mostrar",
	"mostre",
	"mostra",
	"ouvre",
	"ouvrir",
	"ouvrez",
	"montre",
	"affiche",
	"open",
	"show",
	"see",
	"view",
	"go",
	"ver",
	"veamos",
	"voir",
];

/** Articles and "section of" between the verb and the screen. */
const SCREEN_LINKS = new Set(
	"a al la el los las lo mi mis my the to de del seccion section pantalla screen pagina page o os as meu minha meus minhas do da para secao tela le les l mon ma mes du des au aux ecran rubrique onglet tab".split(
		" ",
	),
);

/** What each screen is called; the whole rest of the command must be one of these. */
const SCREEN_WORDS: Record<AppScreen, string[]> = {
	mapa: ["mapa", "map", "carte", "mapa de la ciudad", "city map"],
	agenda: [
		"agenda",
		"eventos",
		"events",
		"evenements",
		"planes",
		"plans",
		"calendario",
		"calendar",
		"agenda de eventos",
	],
	foro: [
		"foro",
		"forum",
		"comunidad",
		"community",
		"comunidade",
		"communaute",
		"conversaciones",
	],
	lugares: ["lugares", "places", "sitios", "lieux", "endroits"],
	perfil: [
		"perfil",
		"profile",
		"cuenta",
		"account",
		"profil",
		"compte",
		"conta",
	],
	datos: [
		"datos",
		"datos abiertos",
		"open data",
		"dados",
		"dados abertos",
		"donnees",
		"donnees ouvertes",
	],
	reportar: [
		"reportar",
		"reportes",
		"reporte",
		"report",
		"reports",
		"reportar un problema",
		"signaler",
		"signalements",
		"relatar",
	],
	jerga: [
		"jerga",
		"jerga costena",
		"slang",
		"glosario",
		"glossary",
		"glossario",
		"glossaire",
		"argot",
		"giria",
		"diccionario costeno",
	],
	pasaporte: ["pasaporte", "passport", "passaporte", "passeport"],
	inicio: [
		"inicio",
		"home",
		"pagina principal",
		"pantalla principal",
		"principal",
		"accueil",
	],
};

/** "abre el mapa", "llévame a la sección de lugares", "go to my profile". */
function screenCommand(core: string): AppScreen | null {
	const verb = OPEN_VERBS.find((phrase) => core.startsWith(` ${phrase} `));
	if (!verb) return null;
	const rest = wordsOf(core.slice(verb.length + 1));
	while (rest.length > 1 && SCREEN_LINKS.has(rest[0])) rest.shift();
	const name = rest.join(" ");
	for (const [screen, words] of Object.entries(SCREEN_WORDS) as [
		AppScreen,
		string[],
	][]) {
		if (words.includes(name)) return screen;
	}
	return null;
}

const ON_MAP_PHRASES = [
	"en el mapa",
	"en mapa",
	"on the map",
	"in the map",
	"no mapa",
	"sur la carte",
];
const SHOW_WORDS = [
	"muestra*",
	"ensena*",
	"ubica*",
	"localiza*",
	"donde",
	"show*",
	"where",
	"locate",
	"find",
	"mostr*",
	"montre*",
	"ou est",
	"ver",
	"see",
	"voir",
	"marca*",
	"pon",
	"ponme",
];

/** "muéstrame el Malecón en el mapa" → that catalog place, or null. */
function onMapPlace(text: string, normalized: string) {
	if (!hasAnyKeyword(normalized, ON_MAP_PHRASES)) return null;
	if (!hasAnyKeyword(normalized, SHOW_WORDS)) return null;
	// "¿Cómo llego…?" is a route: the agent answers it with directions.
	if (hasAnyKeyword(normalized, DIRECTIONS_WORDS)) return null;
	return matchPlace(text);
}

/** The app command in the text, as a turn, or null when it is not one. */
export function appCommand(
	text: string,
	agent: AssistantAgentId,
	context: AssistantContext,
): AgentTurn | null {
	const copy = localCopy(context.language);
	const normalized = normalizeText(text);
	const core = commandCore(normalized);
	const turn = (reply: string, ...toolCalls: ToolCallDraft[]): AgentTurn => ({
		text: reply,
		toolCalls,
	});

	const language = languageCommand(core);
	if (language) {
		// Said in the language the person just chose.
		return turn(localCopy(language).app.languageSet, {
			name: "set_language",
			args: { language },
		});
	}
	const theme = themeCommand(normalized);
	if (theme) {
		return turn(theme === "dark" ? copy.app.themeDark : copy.app.themeLight, {
			name: "set_theme",
			args: { theme },
		});
	}
	if (isBackCommand(core)) {
		return turn(copy.app.back, { name: "go_back", args: {} });
	}
	const place = onMapPlace(text, normalized);
	if (place) {
		return turn(copy.app.onMap(place.name), {
			name: "show_on_map",
			args: { place_slug: place.slug },
		});
	}
	const screen = screenCommand(core);
	if (screen) {
		const label = copy.app.screens[screen];
		return turn(copy.app.opening(label), {
			name: "open_page",
			args: { path: `/${screen}`, label },
		});
	}
	const term = slangQuestionTerm(text);
	if (term) {
		// The orchestrator routes slang to Places; any other agent opens the glossary.
		const label = copy.app.screens.jerga;
		return AGENTS[agent].tools.includes("lookup_slang")
			? turn(copy.app.slang, { name: "lookup_slang", args: { term } })
			: turn(copy.app.opening(label), {
					name: "open_page",
					args: { path: "/jerga", label },
				});
	}
	return null;
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
		case "lookup_slang": {
			const list = slangList(result.summary.entries, language);
			return list ? words.slang(list) : words.slangNone;
		}
		// The screen already changed: just say so.
		case "filter_agenda":
		case "filter_places":
		case "show_on_map":
		case "show_route":
		case "set_language":
		case "set_theme":
		case "focus_on":
		case "go_back":
			return copy.uiDone;
	}
}

const MAX_SLANG_WRAP_UP = 3;

/** "Bacano: Muy bueno, chévere." lines of a lookup_slang summary, or "". */
function slangList(entries: unknown, language?: Language): string {
	if (!Array.isArray(entries)) return "";
	return entries
		.slice(0, MAX_SLANG_WRAP_UP)
		.flatMap((entry) => {
			const item = entry as Record<string, unknown>;
			const meaning =
				language === "en"
					? item.meaning_en
					: (item.meaning_es ?? item.meaning_en);
			return typeof item.term === "string" && typeof meaning === "string"
				? [`${item.term}: ${meaning}`]
				: [];
		})
		.join(" ");
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
	// Driving the app (language, theme, back, a screen) works from any agent.
	const command = appCommand(text, agent, context);
	if (command) return command;
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
