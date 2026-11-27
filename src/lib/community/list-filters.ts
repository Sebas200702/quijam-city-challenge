// Filters of the agenda and places lists, read from and written to the URL
// (`/agenda?q=&categoria=&cuando=`, `/lugares?tipo=&q=`), so a filter can be
// shared, survives a reload and Quillart AI can leave a list filtered (U13).

import type { AgendaWhen } from "../assistant/ui-action-types";
import { EVENT_CATEGORY_LABELS, PLACE_KIND_LABELS } from "./community-labels";
import { isoToBogotaLocal } from "./community-rules";
import type { EventCategory, PlaceKind } from "./community-types";

export const AGENDA_WHEN: readonly AgendaWhen[] = ["hoy", "finde", "semana"];
const MAX_QUERY = 100;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface AgendaFilters {
	q: string;
	categoria: EventCategory | null;
	cuando: AgendaWhen | null;
}

export interface PlacesFilters {
	q: string;
	tipo: PlaceKind | null;
}

export const NO_AGENDA_FILTERS: AgendaFilters = {
	q: "",
	categoria: null,
	cuando: null,
};

export function isEventCategory(value: unknown): value is EventCategory {
	return (
		typeof value === "string" && Object.hasOwn(EVENT_CATEGORY_LABELS, value)
	);
}

export function isPlaceKind(value: unknown): value is PlaceKind {
	return typeof value === "string" && Object.hasOwn(PLACE_KIND_LABELS, value);
}

export function isAgendaWhen(value: unknown): value is AgendaWhen {
	return (AGENDA_WHEN as readonly unknown[]).includes(value);
}

function query(params: URLSearchParams): string {
	return (params.get("q") ?? "").trim().slice(0, MAX_QUERY);
}

export function readAgendaFilters(search: string): AgendaFilters {
	const params = new URLSearchParams(search);
	const categoria = params.get("categoria");
	const cuando = params.get("cuando");
	return {
		q: query(params),
		categoria: isEventCategory(categoria) ? categoria : null,
		cuando: isAgendaWhen(cuando) ? cuando : null,
	};
}

export function readPlacesFilters(search: string): PlacesFilters {
	const params = new URLSearchParams(search);
	const tipo = params.get("tipo");
	return { q: query(params), tipo: isPlaceKind(tipo) ? tipo : null };
}

/** `?q=…&categoria=…` with only the set filters, or "" without any. */
export function filtersSearch(
	filters: Record<string, string | null | undefined>,
): string {
	const params = new URLSearchParams();
	for (const [key, value] of Object.entries(filters)) {
		const clean = value?.trim();
		if (clean) params.set(key, clean);
	}
	const text = params.toString();
	return text ? `?${text}` : "";
}

/** The filters that are set, for the screen context. */
export function activeFilters(
	filters: Record<string, string | null | undefined>,
): Record<string, string> {
	return Object.fromEntries(
		Object.entries(filters).flatMap(([key, value]) =>
			value?.trim() ? [[key, value.trim()]] : [],
		),
	);
}

/** Days between today and `iso`, both counted in Barranquilla time. */
export function daysFromToday(iso: string, now: Date): number {
	const day = (value: string) =>
		Date.parse(`${isoToBogotaLocal(value).slice(0, 10)}T00:00:00Z`);
	return Math.round((day(iso) - day(now.toISOString())) / DAY_MS);
}

/** Day of the week in Barranquilla, 0 = Sunday. */
function bogotaWeekday(now: Date): number {
	return new Date(
		Date.parse(`${isoToBogotaLocal(now.toISOString()).slice(0, 10)}T12:00:00Z`),
	).getUTCDay();
}

/** True when an event starting at `iso` falls in `cuando` ("hoy", "finde", "semana"). */
export function matchesWhen(
	iso: string,
	cuando: AgendaWhen | null,
	now: Date,
): boolean {
	if (!cuando) return true;
	const days = daysFromToday(iso, now);
	if (days < 0) return false;
	if (cuando === "hoy") return days === 0;
	if (cuando === "semana") return days <= 6;
	// The coming Saturday and Sunday (today included when it is the weekend).
	const weekday = bogotaWeekday(now);
	const toSunday = (7 - weekday) % 7;
	const toSaturday = weekday === 0 ? -1 : 6 - weekday;
	return days >= Math.max(0, toSaturday) && days <= toSunday;
}
