// UI actions on both sides of the wire. The server derives them from the
// tool calls it already validated (the model never writes them freely), and
// both the server and the browser pass every action through the same
// whitelist before anything is applied. Nothing here writes data.

import {
	cleanPrefill,
	PREFILL_PARAMS,
	prefillHref,
	readPrefill,
} from "../community/form-prefill";
import {
	filtersSearch,
	isAgendaWhen,
	isEventCategory,
	isPlaceKind,
} from "../community/list-filters";
import { PLACES } from "../community/places-catalog";
import { CORRIDOR_SEED } from "../corridor/corridor-seed";
import { isLanguage } from "../i18n/languages";
import { type RouteCatalog, resolveRouteTarget } from "../map/route-target";
import { isTheme } from "../theme";
import { DESTINATIONS, type DestinationKey } from "../trip/trip-planner";
import { hasKeyword, matchPlace, normalizeText } from "./assistant-text";
import type { AssistantToolArgs, AssistantToolCall } from "./assistant-types";
import { DRAFT_FIELDS, screenThreadId } from "./screen-context";
import type { ScreenContext, ScreenFormId } from "./screen-context-types";
import type {
	AgendaWhen,
	MapPin,
	UiAction,
	UiActionType,
	UiFocusTarget,
} from "./ui-action-types";

export const MAX_UI_ACTIONS = 8;
export const MAX_MAP_PINS = 12;
const MAX_LABEL = 80;
const MAX_QUERY = 100;
const MAX_PATH = 300;
const MAX_ID = 100;

/** The Barranquilla metro area, with a margin: pins and views stay inside. */
export const METRO_BOX = {
	south: 10.75,
	north: 11.15,
	west: -75.05,
	east: -74.6,
};

export const UI_ACTION_TYPES: readonly UiActionType[] = [
	"agenda.filter",
	"places.filter",
	"map.flyTo",
	"map.drop",
	"map.showRoute",
	"form.prefill",
	"ui.focus",
	"ui.open",
	"app.language",
	"app.theme",
	"app.back",
];

export const UI_FOCUS_TARGETS: readonly UiFocusTarget[] = [
	"agenda-results",
	"places-results",
	"event-actions",
	"event-form",
	"thread-form",
	"reply-form",
	"report-form",
];

/**
 * Screens `ui.open` may open: the same list the model is given
 * (assistant-agents.ts OPENABLE_SCREENS). Role portals (/vendedor,
 * /presentador, /anfitrion, /moderacion) stay out: their entry URLs write on
 * load (claim a business, start a presenter session), and nothing reached
 * through `ui.open` may write without the person's own click.
 */
export const OPENABLE_PATHS = [
	"/inicio",
	"/agenda",
	"/foro",
	"/lugares",
	"/mapa",
	"/reportar",
	"/perfil",
	"/pasaporte",
	"/jerga",
	"/datos",
	"/ciudad",
];

/** Sections with one level of detail screens: an event, a thread, a place. */
const DETAIL_SECTIONS = ["/agenda", "/foro", "/lugares"];

/**
 * The only query keys each screen may receive: its filters and its form
 * prefill (the person still reviews and sends). Anything else, such as an
 * OAuth `code` or an entry-tracking key, is refused, so no URL that acts on
 * load can be reached through `ui.open`.
 */
const OPEN_QUERY_KEYS: Record<string, readonly string[]> = {
	"/agenda": ["q", "categoria", "fecha", "cuando"],
	"/agenda/nuevo": Object.values(PREFILL_PARAMS.event),
	"/foro": [
		"lugar",
		"evento",
		"nuevo",
		...Object.values(PREFILL_PARAMS.thread),
	],
	"/lugares": ["q", "tipo"],
	"/mapa": [
		"destino",
		"lugar",
		"evento",
		"conversacion",
		"negocio",
		"lat",
		"lng",
		"zoom",
	],
	"/reportar": Object.values(PREFILL_PARAMS.overcharge),
};

/** Query keys a detail screen ("/foro/abc") may receive. */
const DETAIL_QUERY_KEYS: Record<string, readonly string[]> = {
	"/foro": Object.values(PREFILL_PARAMS.reply),
};

const PATH_SHAPE = /^\/[a-z0-9\-/]*(\?[^#\s\\]*)?$/i;
const DETAIL_SEGMENT = /^[a-z0-9][a-z0-9_-]{0,99}$/i;
/** Route destinations the map resolves: named ones, stop codes, place slugs. */
const ROUTE_KEY = /^[a-z0-9][a-z0-9_-]{0,79}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function shortText(value: unknown, max: number): string | undefined {
	if (typeof value !== "string") return undefined;
	const clean = value.replace(/\s+/g, " ").trim();
	return clean === "" ? undefined : clean.slice(0, max);
}

function inMetro(lat: unknown, lng: unknown): boolean {
	return (
		typeof lat === "number" &&
		typeof lng === "number" &&
		lat >= METRO_BOX.south &&
		lat <= METRO_BOX.north &&
		lng >= METRO_BOX.west &&
		lng <= METRO_BOX.east
	);
}

/** Query keys `path` accepts, or null when the screen cannot be opened. */
function openQueryKeys(path: string): readonly string[] | null {
	const pathname = path.replace(/\/+$/, "");
	if (OPENABLE_PATHS.includes(pathname)) return OPEN_QUERY_KEYS[pathname] ?? [];
	if (Object.hasOwn(OPEN_QUERY_KEYS, pathname))
		return OPEN_QUERY_KEYS[pathname];
	const cut = pathname.lastIndexOf("/");
	const section = pathname.slice(0, cut);
	if (
		!DETAIL_SECTIONS.includes(section) ||
		!DETAIL_SEGMENT.test(pathname.slice(cut + 1))
	) {
		return null;
	}
	return DETAIL_QUERY_KEYS[section] ?? [];
}

/**
 * A same-site path to one of the app's sections (or one of its detail
 * screens), with only that screen's known query keys; null otherwise.
 */
export function safeOpenPath(value: unknown): string | null {
	if (typeof value !== "string" || value.length > MAX_PATH) return null;
	if (!PATH_SHAPE.test(value) || value.startsWith("//")) return null;
	const [pathname, search = ""] = value.split("?");
	const keys = openQueryKeys(pathname);
	if (!keys) return null;
	const params = new URLSearchParams(search);
	for (const key of params.keys()) {
		if (!keys.includes(key)) return null;
	}
	return value;
}

function sanitizePin(value: unknown): MapPin | null {
	if (!isRecord(value) || !inMetro(value.lat, value.lng)) return null;
	const label = shortText(value.label, MAX_LABEL);
	const kind = value.kind;
	if (!label || (kind !== "event" && kind !== "place" && kind !== "report")) {
		return null;
	}
	return { lat: value.lat as number, lng: value.lng as number, label, kind };
}

function withoutEmpty<T extends Record<string, unknown>>(value: T): T {
	return Object.fromEntries(
		Object.entries(value).filter(([, item]) => item !== undefined),
	) as T;
}

/** Checks one action against the whitelist; null when anything is off. */
export function sanitizeUiAction(value: unknown): UiAction | null {
	if (!isRecord(value)) return null;
	const base = withoutEmpty({
		fromCall:
			typeof value.fromCall === "string" && value.fromCall.length <= MAX_ID
				? value.fromCall
				: undefined,
		navigate: value.navigate === true ? true : undefined,
	});
	switch (value.type) {
		case "agenda.filter": {
			const action = withoutEmpty({
				q: shortText(value.q, MAX_QUERY),
				categoria: isEventCategory(value.categoria)
					? value.categoria
					: undefined,
				fecha: isAgendaWhen(value.fecha) ? value.fecha : undefined,
			});
			if (Object.keys(action).length === 0) return null;
			return { ...base, type: "agenda.filter", ...action };
		}
		case "places.filter": {
			const action = withoutEmpty({
				q: shortText(value.q, MAX_QUERY),
				tipo: isPlaceKind(value.tipo) ? value.tipo : undefined,
			});
			if (Object.keys(action).length === 0) return null;
			return { ...base, type: "places.filter", ...action };
		}
		case "map.flyTo": {
			if (!inMetro(value.lat, value.lng)) return null;
			const zoom =
				typeof value.zoom === "number" && value.zoom >= 11 && value.zoom <= 18
					? Math.round(value.zoom)
					: undefined;
			return withoutEmpty({
				...base,
				type: "map.flyTo" as const,
				lat: value.lat as number,
				lng: value.lng as number,
				zoom,
				label: shortText(value.label, MAX_LABEL),
				lugar:
					typeof value.lugar === "string" &&
					/^[a-z0-9-]{1,80}$/.test(value.lugar)
						? value.lugar
						: undefined,
			});
		}
		case "map.drop": {
			if (!Array.isArray(value.pins)) return null;
			const pins = value.pins
				.slice(0, MAX_MAP_PINS)
				.map(sanitizePin)
				.filter((pin): pin is MapPin => pin !== null);
			return pins.length > 0 ? { ...base, type: "map.drop", pins } : null;
		}
		case "map.showRoute": {
			// Named destinations, stop codes and place slugs: the map resolves it
			// (resolveRouteTarget) and ignores a key it cannot place.
			const destino =
				typeof value.destino === "string" ? value.destino.trim() : "";
			if (!ROUTE_KEY.test(destino)) return null;
			return {
				...base,
				type: "map.showRoute",
				destino,
				...(value.accesible === true ? { accesible: true } : {}),
			};
		}
		case "form.prefill": {
			const form = value.form as ScreenFormId;
			if (!Object.hasOwn(DRAFT_FIELDS, form) || !isRecord(value.fields)) {
				return null;
			}
			const fields = cleanPrefill(form, value.fields);
			if (Object.keys(fields).length === 0) return null;
			const threadId =
				typeof value.threadId === "string" &&
				/^[A-Za-z0-9_-]{1,100}$/.test(value.threadId)
					? value.threadId
					: undefined;
			if (form === "reply" && !threadId) return null;
			return withoutEmpty({
				...base,
				type: "form.prefill" as const,
				form,
				fields,
				threadId,
			});
		}
		case "ui.focus":
			return (UI_FOCUS_TARGETS as readonly unknown[]).includes(value.target)
				? { ...base, type: "ui.focus", target: value.target as UiFocusTarget }
				: null;
		case "ui.open": {
			const path = safeOpenPath(value.path);
			return path ? { ...base, type: "ui.open", path } : null;
		}
		// Whole-app controls apply on any screen: `navigate` means nothing there.
		case "app.language":
			return isLanguage(value.language)
				? { ...appBase(base), type: "app.language", language: value.language }
				: null;
		case "app.theme":
			return isTheme(value.theme)
				? { ...appBase(base), type: "app.theme", theme: value.theme }
				: null;
		case "app.back":
			return { ...appBase(base), type: "app.back" };
		default:
			return null;
	}
}

function appBase(base: { fromCall?: string }): { fromCall?: string } {
	return base.fromCall ? { fromCall: base.fromCall } : {};
}

/** Whitelisted actions from untrusted input (a response, the session). */
export function sanitizeUiActions(value: unknown): UiAction[] {
	if (!Array.isArray(value)) return [];
	return value
		.slice(0, MAX_UI_ACTIONS)
		.map(sanitizeUiAction)
		.filter((action): action is UiAction => action !== null);
}

/** Where an action can be applied, as a URL; null when it has no screen of its own. */
export function uiActionHref(action: UiAction): string | null {
	switch (action.type) {
		case "agenda.filter":
			return `/agenda${filtersSearch({ q: action.q, categoria: action.categoria, fecha: action.fecha })}`;
		case "places.filter":
			return `/lugares${filtersSearch({ tipo: action.tipo, q: action.q })}`;
		case "map.showRoute":
			return `/mapa${filtersSearch({ destino: action.destino })}`;
		// The /mapa contract of the metro-area map (map-url.ts): ?lugar= or a camera.
		case "map.flyTo":
			return action.lugar
				? `/mapa${filtersSearch({ lugar: action.lugar })}`
				: `/mapa${filtersSearch({
						lat: action.lat.toFixed(5),
						lng: action.lng.toFixed(5),
						zoom: action.zoom === undefined ? null : String(action.zoom),
					})}`;
		case "map.drop":
			return "/mapa";
		case "form.prefill":
			return prefillHref(action.form, action.fields);
		case "ui.open":
			return action.path;
		// Focus stays on this screen; app.* applies wherever the person is.
		case "ui.focus":
		case "app.language":
		case "app.theme":
		case "app.back":
			return null;
	}
}

// --- Derivation from tool calls ----------------------------------------------

const WEEKEND_WORDS = [
	"finde",
	"fin de semana",
	"weekend",
	"sabado",
	"domingo",
];

/** The agenda's date chip closest to a `days_ahead` search. */
export function whenFromDaysAhead(
	daysAhead: number | undefined,
	userText: string,
): AgendaWhen | undefined {
	if (daysAhead === undefined) return undefined;
	if (daysAhead === 0) return "hoy";
	const text = normalizeText(userText);
	if (daysAhead <= 6 && WEEKEND_WORDS.some((word) => text.includes(word))) {
		return "finde";
	}
	return daysAhead <= 6 ? "semana" : undefined;
}

/** What the map resolves routes against, as shipped with the app. */
const ROUTE_CATALOG: RouteCatalog = {
	stops: CORRIDOR_SEED.stops,
	places: PLACES,
	segments: CORRIDOR_SEED.segments,
};

const DESTINATION_KEYS = Object.keys(DESTINATIONS) as DestinationKey[];

/** A route destination the map can draw: its key and the name it shows. */
export interface RouteDestination {
	key: string;
	name: string;
}

/** Keys the map might know for `destination`, most precise first. */
function routeCandidates(destination: string, text: string): string[] {
	const words = text.replace(/ /g, "_");
	const slug = text.replace(/ /g, "-");
	const named = DESTINATION_KEYS.filter(
		(key) =>
			key === words || normalizeText(DESTINATIONS[key].name).trim() === text,
	);
	const byName = PLACES.find(
		(place) => normalizeText(place.name).trim() === text,
	);
	const spoken = matchPlace(destination);
	// "al centro", "el estadio": a named destination inside a longer phrase.
	const inPhrase = DESTINATION_KEYS.filter((key) =>
		hasKeyword(` ${text} `, key.replace(/_/g, " ")),
	);
	return [
		...named,
		// Stop codes are upper case ("stop-centro" → "STOP-CENTRO").
		slug.toUpperCase(),
		slug,
		...(byName ? [byName.slug] : []),
		...(spoken ? [spoken.slug] : []),
		...inPhrase,
	];
}

/**
 * The map's key for a route destination as a person or the model writes it
 * ("Centro", "Barrio Abajo", "stop-centro", "Gran Malecón del Río", "el
 * malecón"), checked with the map's own resolver (resolveRouteTarget, which
 * is case-sensitive). Null when the map could not place it: the tool then
 * says so instead of claiming a route it never drew.
 */
export function routeDestination(destination: string): RouteDestination | null {
	const text = normalizeText(destination).trim();
	if (text === "") return null;
	for (const key of routeCandidates(destination, text)) {
		if (!ROUTE_KEY.test(key)) continue;
		const target = resolveRouteTarget(key, ROUTE_CATALOG);
		if (target) return { key, name: target.name };
	}
	return null;
}

function placePin(slug: string | undefined): MapPin | null {
	const place = PLACES.find((item) => item.slug === slug);
	if (!place || !inMetro(place.latitude, place.longitude)) return null;
	return {
		lat: place.latitude,
		lng: place.longitude,
		label: place.name,
		kind: "place",
	};
}

/** "2026-12-05T08:00" → date and time fields of the event form. */
function eventFormFields(
	args: AssistantToolArgs["create_event"],
): Record<string, string> {
	const [date, time] = args.starts_at_local.split("T");
	return {
		title: args.title,
		description: args.description,
		category: args.category,
		...(date ? { date } : {}),
		...(time ? { startTime: time.slice(0, 5) } : {}),
		...(args.place_slug ? { place: args.place_slug } : {}),
		...(args.location_text ? { locationText: args.location_text } : {}),
		...(args.capacity ? { capacity: String(args.capacity) } : {}),
		...(args.price_cop ? { price: String(args.price_cop) } : {}),
	};
}

function fromCall(
	call: AssistantToolCall,
	userText: string,
	screen?: ScreenContext,
): UiAction[] {
	const source = { fromCall: call.id };
	switch (call.name) {
		case "search_events": {
			const args = call.args as AssistantToolArgs["search_events"];
			return [
				{
					...source,
					type: "agenda.filter",
					q: args.query,
					categoria: args.category,
					fecha: whenFromDaysAhead(args.days_ahead, userText),
				},
			];
		}
		case "list_places": {
			const args = call.args as AssistantToolArgs["list_places"];
			const pins = PLACES.filter(
				(place) => !args.kind || place.kind === args.kind,
			)
				.map((place) => placePin(place.slug))
				.filter((pin): pin is MapPin => pin !== null);
			return [
				{ ...source, type: "places.filter", tipo: args.kind, q: args.query },
				{ ...source, type: "map.drop", pins },
			];
		}
		case "get_place":
		case "get_directions":
		case "show_on_map": {
			const args = call.args as AssistantToolArgs["get_place"];
			const pin = placePin(args.place_slug);
			if (!pin) return [];
			return [
				{ ...source, type: "map.drop", pins: [pin] },
				{
					...source,
					type: "map.flyTo",
					lat: pin.lat,
					lng: pin.lng,
					zoom: 16,
					label: pin.label,
					lugar: args.place_slug,
					// "Llévame al Malecón" / "muéstramelo en el mapa": the person wants
					// to see it, so open the map there (U05). A plain lookup only marks it.
					...(call.name === "get_place" ? {} : { navigate: true }),
				},
			];
		}
		case "plan_route": {
			const args = call.args as AssistantToolArgs["plan_route"];
			// The person asked for a route: show it, opening the map if needed (U05).
			return [
				{
					...source,
					type: "map.showRoute",
					destino: args.destination,
					navigate: true,
				},
			];
		}
		case "show_route": {
			const args = call.args as AssistantToolArgs["show_route"];
			// Only a destination the map can draw; the tool reports the rest.
			const destination = routeDestination(args.destination);
			if (!destination) return [];
			return [
				{
					...source,
					type: "map.showRoute",
					destino: destination.key,
					navigate: true,
				},
			];
		}
		// UI tools: the model drives the screen directly; each one is the action.
		case "filter_agenda": {
			const args = call.args as AssistantToolArgs["filter_agenda"];
			const q = shortText(args.query, MAX_QUERY);
			const categoria = isEventCategory(args.category)
				? args.category
				: undefined;
			const fecha = isAgendaWhen(args.when) ? args.when : undefined;
			// No filter at all: "abre la agenda".
			if (!q && !categoria && !fecha) {
				return [{ ...source, type: "ui.open", path: "/agenda" }];
			}
			return [
				{
					...source,
					type: "agenda.filter",
					q,
					categoria,
					fecha,
					navigate: true,
				},
			];
		}
		case "filter_places": {
			const args = call.args as AssistantToolArgs["filter_places"];
			const q = shortText(args.query, MAX_QUERY);
			const tipo = isPlaceKind(args.kind) ? args.kind : undefined;
			if (!q && !tipo) {
				return [{ ...source, type: "ui.open", path: "/lugares" }];
			}
			return [{ ...source, type: "places.filter", q, tipo, navigate: true }];
		}
		case "set_language": {
			const args = call.args as AssistantToolArgs["set_language"];
			return [{ ...source, type: "app.language", language: args.language }];
		}
		case "set_theme": {
			const args = call.args as AssistantToolArgs["set_theme"];
			return [{ ...source, type: "app.theme", theme: args.theme }];
		}
		case "focus_on": {
			const args = call.args as AssistantToolArgs["focus_on"];
			return [{ ...source, type: "ui.focus", target: args.target }];
		}
		case "go_back":
			return [{ ...source, type: "app.back" }];
		case "get_event": {
			const args = call.args as AssistantToolArgs["get_event"];
			return screen?.entity?.kind === "event" &&
				screen.entity.id === args.event_id
				? [{ ...source, type: "ui.focus", target: "event-actions" }]
				: [];
		}
		case "open_page": {
			// A filled fare report link also fills the form when it is on screen (U17).
			const args = call.args as AssistantToolArgs["open_page"];
			const [path, search = ""] = args.path.split("?");
			// The person asked for that screen: take them there (with its prefill in the URL).
			const open = { ...source, type: "ui.open" as const, path: args.path };
			if (path !== "/reportar" || search === "") return [open];
			const fields = readPrefill("overcharge", search);
			return [
				{ ...source, type: "form.prefill", form: "overcharge", fields },
				open,
			];
		}
		// Actions keep their confirmation card; the form on screen only mirrors it.
		case "create_event":
			return [
				{
					...source,
					type: "form.prefill",
					form: "event",
					fields: eventFormFields(
						call.args as AssistantToolArgs["create_event"],
					),
				},
			];
		case "create_thread": {
			const args = call.args as AssistantToolArgs["create_thread"];
			return [
				{
					...source,
					type: "form.prefill",
					form: "thread",
					fields: {
						title: args.title,
						body: args.body,
						category: args.category,
					},
				},
			];
		}
		case "reply_to_thread": {
			const args = call.args as AssistantToolArgs["reply_to_thread"];
			// Only the conversation on screen: never fill someone else's thread.
			if (screenThreadId(screen) !== args.thread_id) return [];
			return [
				{
					...source,
					type: "form.prefill",
					form: "reply",
					fields: { body: args.body },
					threadId: args.thread_id,
				},
			];
		}
		default:
			return [];
	}
}

/** UI actions for a turn's validated tool calls, already whitelisted. */
export function uiActionsForCalls(
	calls: readonly AssistantToolCall[],
	userText: string,
	screen?: ScreenContext,
): UiAction[] {
	return sanitizeUiActions(
		calls.flatMap((call) => fromCall(call, userText, screen)),
	);
}
