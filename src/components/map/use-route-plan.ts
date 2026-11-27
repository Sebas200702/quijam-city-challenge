import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { isShadedRoute } from "../../lib/decider/weighted-chooser";
import type { MapMessages } from "../../lib/i18n/dictionaries/map";
import type { PlanResponse } from "../../lib/routing/plan-route";
import type { CrowdByZone } from "../../lib/routing/routing-types";

export interface RouteQuery {
	origin: string;
	destination: string;
	accessibleMode: boolean;
}

function subscribeOnline(onChange: () => void) {
	window.addEventListener("online", onChange);
	window.addEventListener("offline", onChange);
	return () => {
		window.removeEventListener("online", onChange);
		window.removeEventListener("offline", onChange);
	};
}

/** True while the browser has a network connection. */
export function useOnline(): boolean {
	return useSyncExternalStore(
		subscribeOnline,
		() => navigator.onLine,
		() => true,
	);
}

/**
 * Asks POST /api/decidir for a route and re-plans when the query, floods or crowding change.
 * A new query object (even with the same values) plans again, so the card can retry on its own.
 */
export function useRoutePlan(
	query: RouteQuery,
	blockedFloodZoneIds: string[],
	crowdByZone: CrowdByZone,
) {
	const [plan, setPlan] = useState<PlanResponse | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	/** When the shown plan arrived, so an offline card can say how old it is. */
	const [updatedAt, setUpdatedAt] = useState<number | null>(null);
	const [attempt, setAttempt] = useState(0);
	const online = useOnline();
	const floods = blockedFloodZoneIds.join(",");
	const crowd = JSON.stringify(crowdByZone);

	const retry = useCallback(() => setAttempt((value) => value + 1), []);

	// Coming back online after a failure plans again without asking the visitor.
	useEffect(() => {
		if (online && error) retry();
	}, [online, error, retry]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: `attempt` only re-runs the request on retry.
	useEffect(() => {
		const { origin, destination, accessibleMode } = query;
		if (origin === destination) {
			setPlan(null);
			setError(null);
			setLoading(false);
			return;
		}
		const controller = new AbortController();
		setLoading(true);
		setError(null);
		fetch("/api/decidir", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			signal: controller.signal,
			body: JSON.stringify({
				origin,
				destination,
				accessibleMode,
				activeFloodZoneIds: floods ? floods.split(",") : [],
				crowdByZone: JSON.parse(crowd),
			}),
		})
			.then(async (response) => {
				if (!response.ok) throw new Error(`HTTP ${response.status}`);
				setPlan((await response.json()) as PlanResponse);
				setUpdatedAt(Date.now());
			})
			.catch((reason: unknown) => {
				if (controller.signal.aborted) return;
				setError(reason instanceof Error ? reason.message : String(reason));
			})
			.finally(() => {
				if (!controller.signal.aborted) setLoading(false);
			});
		return () => controller.abort();
	}, [query, floods, crowd, attempt]);

	return { plan, loading, error, online, updatedAt, retry };
}

/** The Decider dropped at least one route because it crosses an active arroyo. */
export function isRecalculated(plan: PlanResponse | null): boolean {
	return (
		plan?.discarded.some((item) => item.reason === "active-flood") ?? false
	);
}

/**
 * One plain sentence on why this route, for the "why" line (epic #57, rule 6).
 * Built only from what the Decider returned; numbers and options stay in the details.
 */
export function routeWhy(plan: PlanResponse, t: MapMessages): string {
	const { route, discarded } = plan;
	const floods = discarded.filter(
		(item) => item.reason === "active-flood",
	).length;
	const steps = discarded.some((item) => item.reason === "not-accessible");
	if (!route) {
		return floods > 0 ? t.whyAllFlooded : t.whyNoSafe;
	}
	const avoided =
		floods > 0
			? t.whyAvoidedFlood(floods)
			: steps
				? t.whyAvoidedSteps
				: plan.chosenBy === "none"
					? t.whyOnlyRoute
					: t.whyBestRoute;
	const feature =
		steps && route.accessible
			? t.whyWheelchair
			: isShadedRoute(route)
				? t.whyShade
				: route.isGreen
					? t.whyGreen
					: route.accessible
						? t.whyWheelchair
						: t.whyNoFlood;
	return `${avoided}; ${feature}.`;
}

/** Plain-language confidence for the details panel. */
export function confidenceLabel(confidence: number, t: MapMessages): string {
	const percent = Math.round(confidence * 100);
	const levels = t.confidenceLevels;
	const level =
		percent >= 75 ? levels.high : percent >= 50 ? levels.medium : levels.low;
	return t.confidenceValue(level, percent);
}
