/**
 * Contextual notices for the visitor (docs/26, section 3). One slot, one
 * visible notice, a short queue behind it. Pure data: no React, no DOM.
 */

/** What the notice is about. The order of `NOTICE_PRIORITY` is the priority. */
export type NoticeKind = "arroyo" | "anfitrion" | "desvio" | "reporte";

/** Lower number wins (docs/26, table 3.2). */
export const NOTICE_PRIORITY: Record<NoticeKind, number> = {
	arroyo: 1,
	anfitrion: 2,
	desvio: 3,
	reporte: 4,
};

/** Colour of the notice: `.q-alert--alert`, `--safe` or `--info`. */
export type NoticeTone = "alert" | "safe" | "info";

/** How the notice is shown: only an active arroyo interrupts with a modal. */
export type NoticeForm = "modal" | "discreet";

/** An action button on the notice. `id` is handled by whoever mounts the slot. */
export interface NoticeAction {
	id: string;
	label: string;
}

export interface Notice {
	/** Same kind + same object (zone, assignment, report). Used to dedupe. */
	key: string;
	kind: NoticeKind;
	tone: NoticeTone;
	form: NoticeForm;
	/** One short sentence, verb-first. */
	title: string;
	/** The "why" in one sentence. */
	text: string;
	/** Main action (modal: "Cambiar ruta"; discreet: optional). */
	action?: NoticeAction;
	/** Secondary action (modal: "Entendido"). */
	secondaryAction?: NoticeAction;
	/** Epoch ms when the subject becomes true (arroyo countdown target). */
	activeAt?: number;
	/** Epoch ms after which the notice is no longer true. */
	expiresAt?: number;
}

/** The slot: at most one visible notice and up to `MAX_WAITING` waiting. */
export interface NoticeQueueState {
	visible: Notice | null;
	/** Epoch ms when the visible notice was first shown. */
	shownAt: number | null;
	/** Waiting notices, highest priority first. */
	waiting: Notice[];
	/** Modal keys the visitor already answered: never reopened. */
	seenModals: string[];
}

/** Max notices waiting behind the visible one. */
export const MAX_WAITING = 3;

/** No notice closes by itself before this (WCAG 2.2.1). */
export const MIN_VISIBLE_MS = 20_000;

/** A diversion suggestion expires after 20 min (docs/26, 3.3). */
export const DESVIO_TTL_MS = 20 * 60_000;

/** What the visitor's route and position touch, to decide if an arroyo applies. */
export interface VisitorContext {
	/** Flood zone codes crossed by the active route legs. */
	routeFloodZoneCodes?: readonly string[];
	/** Corridor zones of the active route stops. */
	routeZones?: readonly string[];
	/** Corridor zone the visitor is in (from location or the QR stop). */
	currentZone?: string | null;
}
