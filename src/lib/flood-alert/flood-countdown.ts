import type { CityEvent } from "../city-events/city-events-types";

/** The minimum a flood zone needs: its code and the corridor zone it belongs to. */
export interface FloodZoneRef {
	code: string;
	name: string;
	zone: string;
	/** Alert already active in the database. */
	alert_active: boolean;
}

/** When each flood zone becomes active, as epoch ms, by flood zone code. */
export type FloodCountdowns = Record<string, number>;

export type FloodStatus =
	| { kind: "none" }
	| { kind: "countdown"; minutesLeft: number }
	| { kind: "active" };

/**
 * Applies a `city-events` event. `aguacero` starts a countdown for every flood
 * zone it names, by flood zone code or by corridor zone; an earlier countdown
 * is kept. `reiniciar` clears everything. Other events change nothing.
 */
export function applyCityEvent(
	countdowns: FloodCountdowns,
	event: CityEvent,
	floodZones: readonly FloodZoneRef[],
	nowMs: number,
): FloodCountdowns {
	if (event.type === "reiniciar") {
		return {};
	}
	if (event.type !== "aguacero") {
		return countdowns;
	}
	const targets = new Set(event.zoneIds);
	const activeAt = nowMs + Math.max(0, event.startsInMin) * 60_000;
	const next = { ...countdowns };
	for (const zone of floodZones) {
		if (targets.has(zone.code) || targets.has(zone.zone)) {
			next[zone.code] = Math.min(
				next[zone.code] ?? Number.POSITIVE_INFINITY,
				activeAt,
			);
		}
	}
	return next;
}

export function floodStatus(
	zone: FloodZoneRef,
	countdowns: FloodCountdowns,
	nowMs: number,
): FloodStatus {
	const activeAt = countdowns[zone.code];
	if (zone.alert_active || (activeAt !== undefined && activeAt <= nowMs)) {
		return { kind: "active" };
	}
	if (activeAt !== undefined) {
		return {
			kind: "countdown",
			minutesLeft: Math.ceil((activeAt - nowMs) / 60_000),
		};
	}
	return { kind: "none" };
}

/**
 * Flood zones routes must avoid: active ones and those counting down. A route
 * that crosses an arroyo about to overflow is not offered either.
 */
export function blockedFloodZoneIds(
	floodZones: readonly FloodZoneRef[],
	countdowns: FloodCountdowns,
	nowMs: number,
): string[] {
	return floodZones
		.filter((zone) => floodStatus(zone, countdowns, nowMs).kind !== "none")
		.map((zone) => zone.code);
}

/** The one alert to show: active first, then the closest countdown. Max one alert at a time. */
export function mostUrgentAlert(
	floodZones: readonly FloodZoneRef[],
	countdowns: FloodCountdowns,
	nowMs: number,
): {
	zone: FloodZoneRef;
	status: Exclude<FloodStatus, { kind: "none" }>;
} | null {
	let best: {
		zone: FloodZoneRef;
		status: Exclude<FloodStatus, { kind: "none" }>;
	} | null = null;
	const urgency = (status: Exclude<FloodStatus, { kind: "none" }>) =>
		status.kind === "active" ? -1 : status.minutesLeft;
	for (const zone of floodZones) {
		const status = floodStatus(zone, countdowns, nowMs);
		if (status.kind === "none") continue;
		if (!best || urgency(status) < urgency(best.status)) {
			best = { zone, status };
		}
	}
	return best;
}
