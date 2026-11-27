import type { CrowdByZone } from "../routing/routing-types";
import type { CityEvent, CityState } from "./city-events-types";

export const INITIAL_CITY_STATE: CityState = {
	mode: "mundial",
	hour: 15,
	activeFloodZoneIds: [],
	floodAlertAt: null,
	maleconCapacityPct: 60,
	lastOverchargeReportId: null,
	hostAssignment: null,
};

/** Pure reducer shared by every screen that listens to `city-events`. */
export function reduceCityEvent(
	state: CityState,
	event: CityEvent,
	now: number = Date.now(),
): CityState {
	switch (event.type) {
		case "aguacero":
			return {
				...state,
				activeFloodZoneIds: [
					...new Set([...state.activeFloodZoneIds, ...event.zoneIds]),
				],
				floodAlertAt: state.floodAlertAt ?? now,
			};
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
		case "anfitrion_asignado":
			return {
				...state,
				hostAssignment: {
					id: event.assignmentId,
					need: event.need,
					meetingPointCode: event.meetingPointCode,
					status: "pendiente",
				},
			};
		case "anfitrion_estado":
			// Ignore updates for an assignment this screen never saw.
			if (state.hostAssignment?.id !== event.assignmentId) return state;
			return {
				...state,
				hostAssignment:
					event.status === "terminada"
						? null
						: {
								...state.hostAssignment,
								status: event.status,
								etaMin: event.etaMin,
							},
			};
		case "reiniciar":
			return INITIAL_CITY_STATE;
	}
}

/** Crowd levels the route planner uses, derived from the city state. */
export function crowdByZoneFrom(state: CityState): CrowdByZone {
	return { gran_malecon: Math.min(1, state.maleconCapacityPct / 100) };
}
