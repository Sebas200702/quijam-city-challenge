import { useEffect, useState } from "react";
import type { PlanResponse } from "../../lib/routing/plan-route";
import type { CrowdByZone } from "../../lib/routing/routing-types";

export interface RouteQuery {
	origin: string;
	destination: string;
	accessibleMode: boolean;
}

/** Asks POST /api/decidir for a route and re-plans when the query, floods or crowding change. */
export function useRoutePlan(
	query: RouteQuery,
	blockedFloodZoneIds: string[],
	crowdByZone: CrowdByZone,
) {
	const [plan, setPlan] = useState<PlanResponse | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const { origin, destination, accessibleMode } = query;
	const floods = blockedFloodZoneIds.join(",");
	const crowd = JSON.stringify(crowdByZone);

	useEffect(() => {
		if (origin === destination) {
			setPlan(null);
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
			})
			.catch((reason: unknown) => {
				if (controller.signal.aborted) return;
				setError(reason instanceof Error ? reason.message : String(reason));
			})
			.finally(() => {
				if (!controller.signal.aborted) setLoading(false);
			});
		return () => controller.abort();
	}, [origin, destination, accessibleMode, floods, crowd]);

	return { plan, loading, error };
}
