import { useEffect, useMemo, useState } from "react";
import { subscribeCityEvents } from "../../lib/city-events/city-events-channel";
import type { FloodZone } from "../../lib/corridor/corridor-types";
import {
	applyCityEvent,
	blockedFloodZoneIds,
	type FloodCountdowns,
	floodStatus,
	mostUrgentAlert,
} from "../../lib/flood-alert/flood-countdown";
import { buildRouteOptions } from "../../lib/flood-alert/route-options";
import {
	type RouteRecalc,
	recalculateRoute,
} from "../../lib/flood-alert/route-recalc";
import { ROUTE_SEGMENTS } from "../../lib/flood-alert/route-segments-seed";

/** The visitor's current trip, when there is one. */
export interface ActiveTrip {
	optionId: string;
	fromStop: string;
	toStop: string;
	accessibleMode: boolean;
}

/**
 * Flood state for the map: listens to `aguacero` and `reiniciar` events, counts
 * down every second while a countdown runs, and recalculates the active trip.
 */
export function useFloodAlerts(
	floodZones: FloodZone[],
	trip: ActiveTrip | null,
) {
	const [countdowns, setCountdowns] = useState<FloodCountdowns>({});
	const [nowMs, setNowMs] = useState(() => Date.now());

	useEffect(
		() =>
			subscribeCityEvents((event) =>
				setCountdowns((current) =>
					applyCityEvent(current, event, floodZones, Date.now()),
				),
			),
		[floodZones],
	);

	const counting = Object.keys(countdowns).length > 0;
	useEffect(() => {
		setNowMs(Date.now());
		if (!counting) return;
		const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
		return () => window.clearInterval(timer);
	}, [counting]);

	/** Flood zones with the live alert: an arroyo whose countdown ended is active. */
	const liveFloodZones = useMemo(
		() =>
			floodZones.map((zone) =>
				floodStatus(zone, countdowns, nowMs).kind === "active"
					? { ...zone, alert_active: true }
					: zone,
			),
		[floodZones, countdowns, nowMs],
	);

	/** Codes of arroyos drawn in red: active or counting down. */
	const blocked = useMemo(
		() => blockedFloodZoneIds(floodZones, countdowns, nowMs),
		[floodZones, countdowns, nowMs],
	);

	const alert = mostUrgentAlert(floodZones, countdowns, nowMs);

	const recalc: RouteRecalc | null = useMemo(() => {
		if (!trip) return null;
		return recalculateRoute({
			currentOptionId: trip.optionId,
			options: buildRouteOptions(ROUTE_SEGMENTS, trip.fromStop, trip.toStop),
			blockedFloodZoneIds: blocked,
			floodZones,
			accessibleMode: trip.accessibleMode,
		});
	}, [trip, blocked, floodZones]);

	return { liveFloodZones, blocked, alert, recalc };
}
