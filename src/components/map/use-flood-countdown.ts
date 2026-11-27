import { useEffect, useMemo, useState } from "react";
import type { CityEvent } from "../../lib/city-events/city-events-types";
import {
	applyCityEvent,
	blockedFloodZoneIds,
	type FloodCountdowns,
	type FloodZoneRef,
	mostUrgentAlert,
} from "../../lib/flood-alert/flood-countdown";

const TICK_MS = 15_000;

/**
 * Turns `aguacero` events into per-arroyo countdowns, the zones routes must
 * avoid and the one alert to show (with the epoch ms it becomes active).
 */
export function useFloodCountdown(
	lastEvent: CityEvent | null,
	floodZones: readonly FloodZoneRef[],
) {
	const [countdowns, setCountdowns] = useState<FloodCountdowns>({});
	const [now, setNow] = useState(() => Date.now());

	useEffect(() => {
		if (!lastEvent) return;
		const at = Date.now();
		setNow(at);
		setCountdowns((current) =>
			applyCityEvent(current, lastEvent, floodZones, at),
		);
	}, [lastEvent, floodZones]);

	const counting = Object.keys(countdowns).length > 0;
	useEffect(() => {
		if (!counting) return;
		const timer = setInterval(() => setNow(Date.now()), TICK_MS);
		return () => clearInterval(timer);
	}, [counting]);

	return useMemo(() => {
		const urgent = mostUrgentAlert(floodZones, countdowns, now);
		return {
			blocked: blockedFloodZoneIds(floodZones, countdowns, now),
			// `activeAt` lets the arroyo modal show a live mm:ss countdown.
			alert: urgent
				? { ...urgent, activeAt: countdowns[urgent.zone.code] }
				: null,
		};
	}, [floodZones, countdowns, now]);
}
