/**
 * Shared types for the visitor secondary-menu pages (/pasaporte, /jerga).
 * The pages only depend on these shapes, so wiring the final sources
 * (issues #45 and #48) is a change in the loader functions only.
 */

/** Where a stamp comes from. Only green (environmental) events give a reward. */
export type StampSource = "verified-business" | "green-event";

export interface PassportStamp {
	id: string;
	/** Business or event name, e.g. "Arepas La Esquina". */
	name: string;
	/** Neighbourhood or place, e.g. "Centro". */
	place: string;
	source: StampSource;
	/** ISO date-time when the stamp was collected. */
	collectedAt: string;
	/** Reward label; only present on green events, e.g. "termo". */
	reward?: string;
}

export interface Passport {
	stamps: PassportStamp[];
}

export interface SlangEntry {
	id: string;
	/** The expression as people say it, e.g. "¡Ajá!". */
	term: string;
	/** Plain-language meaning in Spanish. */
	meaningEs: string;
	/** Plain-language meaning in English. */
	meaningEn: string;
	/** Example sentence in Spanish. */
	example: string;
}
