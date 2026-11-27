import type { DecisionSource } from "../../../lib/decider/decider-types";
import type { FloodStatus } from "../../../lib/flood-alert/flood-countdown";

/**
 * Where a section's data stands. `offline` keeps showing the last known data
 * with a stale note and disables every write action.
 */
export type SectionLoadState = "loading" | "ready" | "error" | "offline";

/** Flood zone row for the active arroyo section. */
export interface ArroyoRow {
	id: string;
	name: string;
	/** Corridor zone label, e.g. "Troncal Murillo". */
	zoneLabel: string;
	riskLabel: string;
	status: FloodStatus;
}

export type AffectedRouteState = "blocked" | "suspended" | "active";

/** A route recalculated because of an active arroyo. */
export interface AffectedRoute {
	id: string;
	label: string;
	/** One short line: what changed for the visitor. */
	detail: string;
	state: AffectedRouteState;
	icon: "bus" | "bus-front" | "accessible" | "walk" | "taxi";
}

export type HostDispatchStep = "requested" | "accepted" | "arrived";

/** A host pair ("dupla") sent to help a visitor during the arroyo. */
export interface HostDispatch {
	id: string;
	/** Pair code and meeting point, e.g. "Dupla JB-03 · Joaquín Barrios Polo". */
	title: string;
	/** Who they help, in plain words. */
	detail: string;
	/** Time ("17:16") each step happened; missing steps are pending. */
	steps: Partial<Record<HostDispatchStep, string>>;
}

/** One hard rule the Decider checked before proposing the diversion. */
export interface DiversionRuleCheck {
	id: string;
	passed: boolean;
	text: string;
}

/** The Decider proposal to divert visitors from a saturated zone. */
export interface DiversionProposal {
	id: string;
	fromLabel: string;
	toLabel: string;
	/** One sentence: why the Decider proposes it. */
	why: string;
	fromPctNow: number;
	/** Expected occupancy of the origin if the whole quota arrives. */
	fromPctAfter: number;
	/** Max people the destination accepts (75 % of its threshold minus current). */
	quota: number;
	walkMinutes: number;
	/** From 0 to 1, like the Decider's ChooserResult. */
	confidence: number;
	chosenBy: DecisionSource;
	rules: DiversionRuleCheck[];
	/** Other options reviewed, one plain line each. */
	alternatives: string[];
}

/** An applied diversion the city follows until it reverts it. */
export interface ActiveDiversion {
	id: string;
	fromLabel: string;
	toLabel: string;
	/** Clock time it started, e.g. "17:46". */
	since: string;
	arrived: number;
	quota: number;
	fromPctBefore: number;
	fromPctNow: number;
	businessVisits: number;
	committeePaused: boolean;
}
