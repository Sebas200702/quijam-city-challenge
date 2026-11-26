import type { CorridorStop, FloodZone } from "../corridor/corridor-types";
import { decideWithRemote } from "../decider/decide-with-remote";
import type {
	AsyncChooser,
	DecisionSource,
	DiscardReason,
} from "../decider/decider-types";
import { explainDecision } from "../decider/explain-decision";
import { buildItineraries } from "./build-itineraries";
import type { CrowdByZone, Itinerary, RouteSegment } from "./routing-types";

export interface PlanRequest {
	origin: string;
	destination: string;
	accessibleMode: boolean;
	/** Flood zones the presenter or the city marked active, on top of the data. */
	activeFloodZoneIds: string[];
	crowdByZone: CrowdByZone;
}

export interface PlanDeps {
	segments: RouteSegment[];
	stops: Pick<CorridorStop, "code" | "zone">[];
	floodZones: Pick<FloodZone, "code" | "alert_active">[];
	remote?: AsyncChooser;
}

export interface RouteSummary {
	id: string;
	label: string;
	durationMinutes: number;
	fareCop: number;
}

export interface PlanResponse {
	explanation: string;
	chosenBy: DecisionSource;
	confidence: number;
	route: Itinerary | null;
	discarded: (RouteSummary & { reason: DiscardReason })[];
	alternatives: RouteSummary[];
}

function summary(itinerary: Itinerary): RouteSummary {
	const { id, label, durationMinutes, fareCop } = itinerary;
	return { id, label, durationMinutes, fareCop };
}

export async function planRoute(
	request: PlanRequest,
	deps: PlanDeps,
): Promise<PlanResponse> {
	const itineraries = buildItineraries({
		segments: deps.segments,
		stopZones: Object.fromEntries(
			deps.stops.map((stop) => [stop.code, stop.zone]),
		),
		origin: request.origin,
		destination: request.destination,
		crowdByZone: request.crowdByZone,
	});
	const activeFloodZoneIds = [
		...new Set([
			...deps.floodZones
				.filter((zone) => zone.alert_active)
				.map((zone) => zone.code),
			...request.activeFloodZoneIds,
		]),
	];
	const decision = await decideWithRemote(
		{ activeFloodZoneIds, accessibleMode: request.accessibleMode },
		itineraries,
		{ remote: deps.remote },
	);
	const byId = new Map(
		itineraries.map((itinerary) => [itinerary.id, itinerary]),
	);
	const discardedIds = new Set(decision.discarded.map((item) => item.optionId));
	const route = decision.option ? (byId.get(decision.option.id) ?? null) : null;
	return {
		explanation: explainDecision(decision),
		chosenBy: decision.chosenBy,
		confidence: decision.confidence,
		route,
		discarded: decision.discarded.flatMap((item) => {
			const itinerary = byId.get(item.optionId);
			return itinerary ? [{ ...summary(itinerary), reason: item.reason }] : [];
		}),
		alternatives: itineraries
			.filter(
				(itinerary) =>
					itinerary.id !== route?.id && !discardedIds.has(itinerary.id),
			)
			.map(summary),
	};
}

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Validates the JSON body of POST /api/decidir. */
export function parsePlanRequest(
	body: unknown,
	knownStops: Set<string>,
): Parsed<PlanRequest> {
	if (!isRecord(body))
		return { ok: false, error: "Body must be a JSON object" };
	const { origin, destination } = body;
	if (typeof origin !== "string" || !knownStops.has(origin)) {
		return { ok: false, error: `Unknown origin stop: ${String(origin)}` };
	}
	if (typeof destination !== "string" || !knownStops.has(destination)) {
		return {
			ok: false,
			error: `Unknown destination stop: ${String(destination)}`,
		};
	}
	const accessibleMode = body.accessibleMode ?? false;
	if (typeof accessibleMode !== "boolean") {
		return { ok: false, error: "accessibleMode must be a boolean" };
	}
	const floods = body.activeFloodZoneIds ?? [];
	if (!Array.isArray(floods) || floods.some((id) => typeof id !== "string")) {
		return { ok: false, error: "activeFloodZoneIds must be a list of strings" };
	}
	const crowd = body.crowdByZone ?? {};
	if (
		!isRecord(crowd) ||
		Object.values(crowd).some(
			(value) => typeof value !== "number" || value < 0 || value > 1,
		)
	) {
		return {
			ok: false,
			error: "crowdByZone values must be numbers from 0 to 1",
		};
	}
	return {
		ok: true,
		value: {
			origin,
			destination,
			accessibleMode,
			activeFloodZoneIds: floods as string[],
			crowdByZone: crowd as CrowdByZone,
		},
	};
}
