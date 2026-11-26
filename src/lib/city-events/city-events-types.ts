// Shared contract for the Realtime channel `city-events` (epic #57).
// Do not redefine these types elsewhere: add new event types here first.

export type CityMode = "mundial" | "carnaval" | "cotidiano";

export type CityEvent =
	| { type: "aguacero"; zoneIds: string[]; startsInMin: number }
	| { type: "malecon_saturado"; capacityPct: number }
	| { type: "cobro_abusivo"; reportId: string }
	| { type: "modo_ciudad"; mode: CityMode }
	| { type: "tiempo"; hour: number }
	| { type: "reiniciar" };

/** What every screen derives from the events it has received. */
export interface CityState {
	mode: CityMode;
	/** Hour of the 2034 match day, 8 to 23. */
	hour: number;
	/** Flood zone codes under an active alert. */
	activeFloodZoneIds: string[];
	/** When the active flood alert started, as epoch ms; null without alert. */
	floodAlertAt: number | null;
	/**
	 * When each flood zone in activeFloodZoneIds overflows, as epoch ms
	 * (announcement time + startsInMin). Routes avoid the zone from the
	 * announcement on; screens show the countdown until this time.
	 */
	floodStartsAt: Record<string, number>;
	/** Gran Malecón occupancy, in percent of capacity. */
	maleconCapacityPct: number;
	lastOverchargeReportId: string | null;
}

export const CITY_EVENTS_CHANNEL = "city-events";
export const CITY_EVENT_NAME = "city-event";
