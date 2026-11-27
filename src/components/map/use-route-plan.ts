import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
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
export function routeWhy(plan: PlanResponse): string {
	const { route, discarded } = plan;
	const floods = discarded.filter(
		(item) => item.reason === "active-flood",
	).length;
	const steps = discarded.some((item) => item.reason === "not-accessible");
	if (!route) {
		return floods > 0
			? "Todas las rutas cruzan un arroyo activo; espera en un lugar seco."
			: "Ahora no hay una ruta segura; espera en un lugar seco.";
	}
	const avoided =
		floods > 0
			? `Evitamos ${floods === 1 ? "una ruta" : `${floods} rutas`} con arroyo activo`
			: steps
				? "Dejamos fuera las rutas que no son accesibles"
				: plan.chosenBy === "none"
					? "Es la única ruta disponible"
					: "Es la ruta con mejor tiempo y tarifa";
	const feature =
		steps && route.accessible
			? "esta es accesible en silla de ruedas"
			: route.isGreen
				? "esta ruta es verde: transporte público o a pie"
				: route.accessible
					? "esta es accesible en silla de ruedas"
					: "esta ruta no cruza arroyos activos";
	return `${avoided}; ${feature}.`;
}

/** Plain-language confidence for the details panel. */
export function confidenceLabel(confidence: number): string {
	const percent = Math.round(confidence * 100);
	const level = percent >= 75 ? "Alta" : percent >= 50 ? "Media" : "Baja";
	return `${level} · ${percent} %`;
}
