/** A candidate route the Decider can pick for a visitor. Values come from seed data. */
export interface RouteOption {
	id: string;
	label: string;
	/** Door-to-door travel time in minutes. */
	durationMinutes: number;
	/** Reference fare in COP. */
	fareCop: number;
	/** Expected crowding along the route, from 0 (empty) to 1 (saturated). */
	crowdLevel: number;
	/** True when the whole route works for wheelchairs and reduced mobility. */
	accessible: boolean;
	/** Flood-prone stream ("arroyo") zones the route crosses. */
	floodZoneIds: string[];
	/**
	 * Share of the route's stops with shade, from 0 (none) to 1 (every stop).
	 * Missing means unknown and counts as no shade.
	 */
	shadeShare?: number;
}

/** Current state of the city the Decider reads before choosing. */
export interface DecisionState {
	/** Zones with an active flood alert right now. */
	activeFloodZoneIds: string[];
	/** The visitor asked for accessible routes only. */
	accessibleMode: boolean;
}

/** Relative importance of each criterion. Higher means it matters more. */
export interface DecisionWeights {
	duration: number;
	fare: number;
	crowd: number;
	/** Shade along the route (Rutas frescas, #46): the south is hotter than the north. */
	shade: number;
}

export type DiscardReason = "active-flood" | "not-accessible";

export interface DiscardedOption {
	optionId: string;
	reason: DiscardReason;
}

/** What a chooser (weighted score today, OpenJev later) returns. */
export interface ChooserResult {
	optionId: string;
	/** From 0 (a coin toss) to 1 (no doubt). */
	confidence: number;
}

/**
 * Picks one option among options that already passed the hard rules.
 * OpenJev plugs in here if it runs; otherwise the weighted score is used.
 */
export type Chooser = (
	state: DecisionState,
	options: RouteOption[],
) => ChooserResult;

export interface Decision {
	/** The chosen route, or null when every option was discarded. */
	option: RouteOption | null;
	/** From 0 to 1. Always 0 when no option is safe. */
	confidence: number;
	discarded: DiscardedOption[];
}

/**
 * A chooser that answers asynchronously, like OpenJev over HTTP. Returns null
 * when it cannot answer, so the weighted score decides instead.
 */
export type AsyncChooser = (
	state: DecisionState,
	options: RouteOption[],
) => Promise<ChooserResult | null>;

/** Who picked the option: OpenJev, the weighted score, or nobody (no safe option). */
export type DecisionSource = "openjev" | "weighted" | "none";

export interface DecisionWithSource extends Decision {
	chosenBy: DecisionSource;
}
