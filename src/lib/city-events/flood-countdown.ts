import type { CityState } from "./city-events-types";

export type FloodAlert =
	| { code: string; kind: "active" }
	| { code: string; kind: "countdown"; minutesLeft: number };

/**
 * The one flood alert to show (epic #57, rule 4: one alert at a time): an
 * overflowing arroyo first, otherwise the closest countdown. Null without floods.
 */
export function mostUrgentFlood(
	state: CityState,
	now: number,
): FloodAlert | null {
	let best: { code: string; startsAt: number } | null = null;
	for (const code of state.activeFloodZoneIds) {
		// Zones from older data without a time are treated as already active.
		const startsAt = state.floodStartsAt[code] ?? now;
		if (!best || startsAt < best.startsAt) best = { code, startsAt };
	}
	if (!best) return null;
	if (best.startsAt <= now) return { code: best.code, kind: "active" };
	return {
		code: best.code,
		kind: "countdown",
		minutesLeft: Math.ceil((best.startsAt - now) / 60_000),
	};
}

/** True while at least one arroyo is still counting down, so screens keep a clock running. */
export function hasPendingFlood(state: CityState, now: number): boolean {
	return state.activeFloodZoneIds.some(
		(code) => (state.floodStartsAt[code] ?? now) > now,
	);
}

/** Short sentence for the visitor, with the arroyo's name. */
export function floodAlertText(alert: FloodAlert, name: string): string {
	return alert.kind === "active"
		? `${name}: arroyo activo. No cruces.`
		: `${name}: se activa en ${alert.minutesLeft} min. Evita la zona.`;
}
