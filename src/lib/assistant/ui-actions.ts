// UI actions on both sides of the wire. The server derives them from the
// tool calls it already validated (the model never writes them freely), and
// both the server and the browser pass every action through the same
// whitelist before anything is applied. Nothing here writes data.

import {
	cleanPrefill,
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
import { DESTINATIONS, type DestinationKey } from "../trip/trip-planner";
import { normalizeText } from "./assistant-text";
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

/** Screens `ui.open` may open: the app's own sections, nothing else. */
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
];

const PATH_SHAPE = /^\/[a-z0-9\-/]*(\?[^#\s\\]*)?$/i;

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

/** A same-site path to one of the app's sections, or null. */
export function safeOpenPath(value: unknown): string | null {
	if (typeof value !== "string" || value.length > MAX_PATH) return null;
	if (!PATH_SHAPE.test(value) || value.startsWith("//")) return null;
	const pathname = value.split("?")[0];
	const allowed = OPENABLE_PATHS.some(
		(prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
	);
	return allowed ? value : null;
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
				cuando: isAgendaWhen(value.cuando) ? value.cuando : undefined,
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
			if (
				typeof value.destino !== "string" ||
				!Object.hasOwn(DESTINATIONS, value.destino)
			) {
				return null;
			}
			return {
				...base,
				type: "map.showRoute",
				destino: value.destino as DestinationKey,
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
		default:
			return null;
	}
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
			return `/agenda${filtersSearch({ q: action.q, categoria: action.categoria, cuando: action.cuando })}`;
		case "places.filter":
			return `/lugares${filtersSearch({ tipo: action.tipo, q: action.q })}`;
		case "map.showRoute":
			return `/mapa${filtersSearch({ destino: action.destino })}`;
		case "map.flyTo":
		case "map.drop":
			return "/mapa";
		case "form.prefill":
			return prefillHref(action.form, action.fields);
		case "ui.open":
			return action.path;
		case "ui.focus":
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
					cuando: whenFromDaysAhead(args.days_ahead, userText),
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
		case "get_directions": {
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
			if (path !== "/reportar" || search === "") return [];
			const fields = readPrefill("overcharge", search);
			return [{ ...source, type: "form.prefill", form: "overcharge", fields }];
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
