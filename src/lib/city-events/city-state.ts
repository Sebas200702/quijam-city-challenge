import type { CrowdByZone } from "../routing/routing-types";
import type { CityEvent, CityState } from "./city-events-types";

export const INITIAL_CITY_STATE: CityState = {
	mode: "mundial",
	hour: 15,
	activeFloodZoneIds: [],
	floodAlertAt: null,
	floodStartsAt: {},
	maleconCapacityPct: 60,
	lastOverchargeReportId: null,
};

/** Pure reducer shared by every screen that listens to `city-events`. */
export function reduceCityEvent(
	state: CityState,
	event: CityEvent,
	now: number = Date.now(),
): CityState {
	switch (event.type) {
		case "aguacero": {
			const startsAt = now + Math.max(0, event.startsInMin) * 60_000;
			const floodStartsAt = { ...state.floodStartsAt };
			for (const id of event.zoneIds) {
				// A second downpour never pushes an earlier countdown back.
				floodStartsAt[id] = Math.min(floodStartsAt[id] ?? startsAt, startsAt);
			}
			return {
				...state,
				activeFloodZoneIds: [
					...new Set([...state.activeFloodZoneIds, ...event.zoneIds]),
				],
				floodAlertAt: state.floodAlertAt ?? now,
				floodStartsAt,
			};
		}
		case "malecon_saturado":
			return { ...state, maleconCapacityPct: event.capacityPct };
		case "cobro_abusivo":
			return { ...state, lastOverchargeReportId: event.reportId };
		case "modo_ciudad":
			return { ...state, mode: event.mode };
		case "tiempo":
			return event.hour >= 8 && event.hour <= 23
				? { ...state, hour: event.hour }
				: state;
		case "reiniciar":
			return INITIAL_CITY_STATE;
	}
}

/** Crowd levels the route planner uses, derived from the city state. */
export function crowdByZoneFrom(state: CityState): CrowdByZone {
	return { gran_malecon: Math.min(1, state.maleconCapacityPct / 100) };
}
