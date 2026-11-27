// UI actions: what Quillart AI changes on the screen the person is looking at
// (audit v2, U05 and §6.2). They only read or show (filter, move the map, drop
// pins, prefill a form, open a screen); they never write. Writes keep going
// through the confirmation card with the exact, editable text.

import type { EventCategory, PlaceKind } from "../community/community-types";
import type { DestinationKey } from "../trip/trip-planner";
import type { ScreenFormId } from "./screen-context-types";

/** Agenda date filter, as in `/agenda?cuando=`. */
export type AgendaWhen = "hoy" | "finde" | "semana";

export interface MapPin {
	lat: number;
	lng: number;
	label: string;
	kind: "event" | "place" | "report";
}

/** Parts of a screen the agent may point at (`ui.focus`), by element id. */
export type UiFocusTarget =
	| "agenda-results"
	| "places-results"
	| "event-actions"
	| "event-form"
	| "thread-form"
	| "reply-form"
	| "report-form";

interface UiActionBase {
	/** Tool call that produced it, so the dock can skip its duplicate cards. */
	fromCall?: string;
	/**
	 * When the current screen cannot apply it: true opens the screen that can
	 * (by URL, so it survives a reload); false leaves it to the conversation.
	 */
	navigate?: boolean;
}

export type UiAction = UiActionBase &
	(
		| {
				type: "agenda.filter";
				q?: string;
				categoria?: EventCategory;
				cuando?: AgendaWhen;
		  }
		| { type: "places.filter"; q?: string; tipo?: PlaceKind }
		| {
				type: "map.flyTo";
				lat: number;
				lng: number;
				zoom?: number;
				label?: string;
		  }
		| { type: "map.drop"; pins: MapPin[] }
		| { type: "map.showRoute"; destino: DestinationKey; accesible?: boolean }
		| {
				type: "form.prefill";
				form: ScreenFormId;
				fields: Record<string, string>;
				/** For `reply`: the conversation the reply belongs to. */
				threadId?: string;
		  }
		| { type: "ui.focus"; target: UiFocusTarget }
		| { type: "ui.open"; path: string }
	);

export type UiActionType = UiAction["type"];

export type UiActionOf<T extends UiActionType> = Extract<UiAction, { type: T }>;
