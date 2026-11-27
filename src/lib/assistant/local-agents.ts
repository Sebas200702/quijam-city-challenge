// The specialized agents without a model: deterministic tool calls derived
// from the text, and short Spanish wrap-ups of tool results. Used when
// GEMINI_API_KEY is missing or Gemini fails, so Quillart AI always answers.

import { EVENT_CATEGORY_LABELS } from "../community/community-labels";
import type {
	EventCategory,
	ForumCategory,
	PlaceKind,
} from "../community/community-types";
import { detectDestination } from "../guide/guide-local";
import { type AgentTurn, PROFILE_PATH } from "./assistant-agents";
import { PLACES } from "../community/places-catalog";
import { hasAnyKeyword, matchPlace, normalizeText } from "./assistant-text";
import {
	type AssistantAgentId,
	type AssistantContext,
	type AssistantMessage,
	type AssistantToolArgs,
	type AssistantToolResult,
	isActionTool,
} from "./assistant-types";
import { latestUserText } from "./orchestrator";
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
	if (hasAnyKeyword(normalized, ["hoy", "today", "esta noche", "tonight"])) {
		return 0;
	}
	if (hasAnyKeyword(normalized, ["pasado manana"])) return 2;
	if (hasAnyKeyword(normalized, ["manana", "tomorrow"])) return 1;
	if (hasAnyKeyword(normalized, ["fin de semana", "finde", "weekend"])) {
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

function signInTurn(reason: string): AgentTurn {
	return {
		text: `${reason} Primero entra a tu cuenta o créala, es rapidito.`,
		toolCalls: [
			{
				name: "open_page",
				args: { path: PROFILE_PATH, label: "Entrar o crear cuenta" },
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

/** "8 am", "8:30 p. m.", "a las 18" → "08:00", "20:30", "18:00". */
export function timeFromText(text: string): string | null {
	const match =
		/\b(\d{1,2})(?::(\d{2}))?\s*(a\.?\s?m\.?|p\.?\s?m\.?)/i.exec(text) ??
		/\ba las (\d{1,2})(?::(\d{2}))?\b/i.exec(text);
	if (!match) return null;
	let hour = Number(match[1]);
	const minutes = Number(match[2] ?? "0");
	const meridiem = (match[3] ?? "").toLowerCase();
	if (meridiem.startsWith("p") && hour < 12) hour += 12;
	if (meridiem.startsWith("a") && hour === 12) hour = 0;
	if (hour > 23 || minutes > 59) return null;
	return `${String(hour).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function capitalize(text: string): string {
	return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * What the person said about the event they want to publish, as a
 * create_event draft: title, description (their words), category, start
 * time when they gave a day and an hour, and the place.
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
	const colon = clean.indexOf(":");
	const body = (
		colon >= 0
			? clean.slice(colon + 1)
			: clean.replace(/^.*?\b(evento|plan|actividad)\b(\s+de)?/i, "")
	).trim();
	// "Quiero publicar un evento" alone: nothing to fill yet.
	const description = capitalize(body).slice(0, 2000);
	const title = capitalize(
		body
			.split(/\s+(?:el|este|esta|para el|hoy|mañana|a las)\s+/i)[0]
			.replace(/[.,;]+$/, ""),
	).slice(0, 80);
	const normalized = normalizeText(clean);
	const category = firstMatch(normalized, EVENT_CATEGORY_WORDS) ?? "community";
	const draft: ReturnType<typeof eventDraftFromText> = {
		title,
		description,
		category,
	};
	const days = daysAheadFrom(clean, context.now);
	const time = timeFromText(clean);
	if (days !== null && time) {
		const now = Date.parse(context.now);
		const today = new Date(
			(Number.isNaN(now) ? Date.now() : now) + BOGOTA_OFFSET_MS,
		);
		const day = new Date(today.getTime() + days * DAY_MS)
			.toISOString()
			.slice(0, 10);
		draft.starts_at_local = `${day}T${time}`;
	}
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
	return `/agenda/nuevo?${params.toString()}`;
}

function agendaTurn(
	text: string,
	messages: AssistantMessage[],
	context: AssistantContext,
): AgentTurn {
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
				text: "Te armé el evento con lo que me dijiste: revisa el texto exacto y confírmalo abajo. Antes de salir en la agenda pasa por una revisión rápida.",
				toolCalls: [
					{
						name: "create_event",
						args: draft as AssistantToolArgs["create_event"],
					},
				],
			};
		}
		return {
			text: "Te dejé el formulario lleno con lo que me dijiste; complétalo con la fecha y la hora y publícalo.",
			toolCalls: [
				{
					name: "open_page",
					args: {
						path: eventFormPath(draft),
						label: "Publicar un evento",
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
						text: "Va, te ayudo a cancelar esa inscripción. Confírmame abajo.",
						toolCalls: [
							{ name: "unregister_from_event", args: { event_id: eventId } },
						],
					}
				: {
						text: "¡De una! Confírmame abajo y te inscribo.",
						toolCalls: [
							{ name: "register_for_event", args: { event_id: eventId } },
						],
					};
		}
		if (wantsOut) {
			return {
				text: "Dime de cuál plan te quieres salir y te ayudo.",
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
	const what = category
		? `planes de ${EVENT_CATEGORY_LABELS[category].toLowerCase()}`
		: "planes";
	return {
		text: `Déjame buscar ${what} para ti.`,
		toolCalls: [{ name: "search_events", args }],
	};
}

function communityTurn(text: string, context: AssistantContext): AgentTurn {
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
			text: "Abre una conversación nueva: cuéntale a la comunidad tu tema con respeto y pasa por moderación antes de salir.",
			toolCalls: [
				{
					name: "open_page",
					args: { path: "/foro?nuevo=1", label: "Abrir conversación" },
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
		text: "Mira de qué se está hablando en la comunidad.",
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
];

function placesTurn(text: string, context: AssistantContext): AgentTurn {
	const normalized = normalizeText(text);
	const place = placeFor(text, context);
	if (place) {
		if (hasAnyKeyword(normalized, DIRECTIONS_WORDS)) {
			return {
				text: `Te muestro cómo llegar a ${place.name}.`,
				toolCalls: [
					{ name: "get_directions", args: { place_slug: place.slug } },
				],
			};
		}
		return {
			text: `Te cuento de ${place.name}.`,
			toolCalls: [{ name: "get_place", args: { place_slug: place.slug } }],
		};
	}
	const kind = firstMatch(normalized, PLACE_KIND_WORDS);
	return {
		text: "Estos son lugares de la ciudad que te pueden gustar.",
		toolCalls: [{ name: "list_places", args: kind ? { kind } : {} }],
	};
}

function mobilityTurn(text: string, context: AssistantContext): AgentTurn {
	const destination = detectDestination(text);
	if (destination) {
		return {
			text: "Te armo la ruta desde el Gran Malecón.",
			toolCalls: [{ name: "plan_route", args: { destination } }],
		};
	}
	const place = placeFor(text, context);
	if (place) {
		return {
			text: `Te muestro cómo llegar a ${place.name}.`,
			toolCalls: [{ name: "get_directions", args: { place_slug: place.slug } }],
		};
	}
	return {
		text: "¿Pa' dónde vas? Te ayudo con el estadio, Barrio Abajo, el centro o cualquier lugar del mapa.",
		toolCalls: [
			{ name: "open_page", args: { path: "/mapa", label: "Ver el mapa" } },
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
];

export const EMERGENCY_TEXT =
	"Si alguien está en peligro, llama ya a la Línea 123.";

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
	const normalizedText = normalizeText(text);
	const emergency = hasAnyKeyword(normalizedText, EMERGENCY_WORDS);
	const prefix = emergency ? `${EMERGENCY_TEXT} ` : "";
	if (!emergency && hasAnyKeyword(normalizedText, OVERCHARGE_WORDS)) {
		// Fares have their own form (no account needed): open it filled.
		return {
			text: "Te dejé el reporte de cobro casi listo: revisa el tramo y el monto y envíalo.",
			toolCalls: [
				{
					name: "open_page",
					args: {
						path: overchargeReportPath(text),
						label: "Reportar el cobro",
					},
				},
			],
		};
	}
	// Without an account the report stays ready: the card asks to sign in (U02).
	const place = placeFor(text, context);
	return {
		text: `${prefix}Preparé tu reporte para la ciudad; revísalo y confírmalo abajo.`,
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
	const normalized = normalizeText(text);
	if (!context.signedIn) {
		return signInTurn("Aún no has entrado a tu cuenta.");
	}
	if (
		hasAnyKeyword(normalized, [
			"perfil",
			"profile",
			"cuenta",
			"cerrar sesion",
			"nombre",
			"contrasena",
		]) &&
		!hasAnyKeyword(normalized, ["inscripcion*", "inscrit*", "mis eventos"])
	) {
		return {
			text: "Ahí puedes ver y editar tu perfil.",
			toolCalls: [
				{
					name: "open_page",
					args: { path: PROFILE_PATH, label: "Ir a mi perfil" },
				},
			],
		};
	}
	return {
		text: "Te muestro los planes en los que estás inscrito.",
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

function plural(count: number, one: string, many: string): string {
	return count === 1 ? `1 ${one}` : `${count} ${many}`;
}

function failed(result: AssistantToolResult): boolean {
	return typeof result.summary.error === "string";
}

function publishText(result: AssistantToolResult, done: string): string {
	const outcome = result.summary.outcome;
	if (outcome === "held") {
		return "Quedó en revisión: un moderador lo mira pronto y te avisamos.";
	}
	if (outcome === "rejected") {
		return "No se publicó porque no cumple las normas de la comunidad.";
	}
	return done;
}

/** One short Spanish sentence for a tool result; "" when nothing to add. */
export function wrapUpResult(result: AssistantToolResult): string {
	// The chat already shows the error or moderation notice; keep this short.
	if (failed(result)) {
		return "Uy, no se pudo completar. ¿Probamos de otra forma?";
	}
	if (result.summary.outcome === "rejected") {
		return publishText(result, "");
	}
	if (result.declined) {
		return isActionTool(result.name)
			? "Listo, no hice nada. ¿Te ayudo con otra cosa?"
			: "";
	}
	const count = countIn(result.summary);
	switch (result.name) {
		case "search_events":
			return count === 0
				? "No encontré planes con eso. ¿Probamos otra fecha o categoría?"
				: count === null
					? "Aquí tienes los planes que encontré."
					: `Encontré ${plural(count, "plan", "planes")}. ¿Te inscribo en alguno?`;
		case "get_event":
			return "Aquí tienes los detalles del evento.";
		case "my_registrations":
			return count === 0
				? "Todavía no estás inscrito en ningún plan. ¿Buscamos uno?"
				: count === null
					? "Estas son tus inscripciones."
					: `Tienes ${plural(count, "inscripción", "inscripciones")}.`;
		case "list_places":
			return count === 0
				? "No encontré lugares con eso. ¿Busco de otro tipo?"
				: count === null
					? "Estos son los lugares que encontré."
					: `Encontré ${plural(count, "lugar", "lugares")} para ti.`;
		case "get_place":
			return typeof result.summary.name === "string"
				? `Aquí tienes la info de ${result.summary.name}.`
				: "Aquí tienes la info del lugar.";
		case "get_directions":
			return "Aquí tienes cómo llegar.";
		case "list_threads":
			return count === 0
				? "Todavía no hay conversaciones de eso. ¿Abres una?"
				: count === null
					? "Estas son las conversaciones de la comunidad."
					: `Encontré ${plural(count, "conversación", "conversaciones")}.`;
		case "plan_route":
			return result.summary.flood_alert === true
				? "Ojo: hay alerta de arroyo en la ruta. Nunca cruces un arroyo crecido."
				: "Esta es la ruta sugerida por el corredor verde.";
		case "register_for_event":
			return result.summary.outcome === "already_registered"
				? "Ya estabas inscrito en ese plan. ¡Nos vemos allá!"
				: "¡Listo, quedaste inscrito! Te esperamos.";
		case "unregister_from_event":
			return "Listo, cancelé tu inscripción.";
		case "create_event":
			return publishText(result, "¡Listo, tu evento quedó publicado!");
		case "create_thread":
			return publishText(result, "¡Listo, tu conversación quedó publicada!");
		case "reply_to_thread":
			return publishText(result, "¡Listo, tu respuesta quedó publicada!");
		case "report_issue":
			return publishText(
				result,
				"Listo, tu reporte llegó a la ciudad y quedó en el foro. ¡Gracias por avisar!",
			);
		case "open_page":
			return "";
	}
}

export function wrapUpResults(results: AssistantToolResult[]): string {
	const sentences = [...new Set(results.map(wrapUpResult).filter(Boolean))];
	return sentences.slice(0, 3).join(" ") || "Listo. ¿Te ayudo con algo más?";
}

/** One local agent turn: a wrap-up after tool results, or tool calls from the text. */
export function answerLocally(
	agent: AssistantAgentId,
	messages: AssistantMessage[],
	context: AssistantContext,
): AgentTurn {
	const latest = messages.at(-1);
	if (latest?.role === "tool") {
		return { text: wrapUpResults(latest.results), toolCalls: [] };
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
	}
}
