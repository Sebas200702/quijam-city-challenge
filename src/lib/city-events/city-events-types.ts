// Shared contract for the Realtime channel `city-events` (epic #57).
// Do not redefine these types elsewhere: add new event types here first.

export type HostNeed = "movilidad_reducida";

/** en_camino: the host accepted and walks to the meeting point. */
export type HostStatus = "en_camino" | "llego" | "terminada";

export interface HostAssignment {
	id: string;
	need: HostNeed;
	meetingPointCode: string;
	/** pendiente until the host accepts. */
	status: "pendiente" | HostStatus;
	etaMin?: number;
}

export type CityMode = "mundial" | "carnaval" | "cotidiano";

export type CityEvent =
	| { type: "aguacero"; zoneIds: string[]; startsInMin: number }
	| { type: "malecon_saturado"; capacityPct: number }
	| { type: "cobro_abusivo"; reportId: string }
	| { type: "modo_ciudad"; mode: CityMode }
	| { type: "tiempo"; hour: number }
	| { type: "reiniciar" }
	// Host duo (#50). The Decider announces the assignment; the host moves it forward.
	| {
			type: "anfitrion_asignado";
			assignmentId: string;
			need: HostNeed;
			meetingPointCode: string;
	  }
	| {
			type: "anfitrion_estado";
			assignmentId: string;
			status: HostStatus;
			etaMin?: number;
	  };

/** What every screen derives from the events it has received. */
export interface CityState {
	mode: CityMode;
	/** Hour of the 2034 match day, 8 to 23. */
	hour: number;
	/** Flood zone codes under an active alert. */
	activeFloodZoneIds: string[];
	/** When the active flood alert started, as epoch ms; null without alert. */
	floodAlertAt: number | null;
	/** Gran Malecón occupancy, in percent of capacity. */
	maleconCapacityPct: number;
	lastOverchargeReportId: string | null;
	/** The current host assignment (case 2); null when there is none. */
	hostAssignment: HostAssignment | null;
}

export const CITY_EVENTS_CHANNEL = "city-events";
export const CITY_EVENT_NAME = "city-event";
