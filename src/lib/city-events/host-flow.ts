import type { CityEvent, HostAssignment } from "./city-events-types";

/** Demo meeting point for case 2 (Troncal Murillo, ramp exit). */
export const DEMO_MEETING_POINT_CODE = "STOP-MURILLO-SUR";
export const DEMO_MEETING_POINT_LABEL =
	"Joaquín Barrios Polo, salida con rampa";
/** Minutes the host needs to reach the meeting point in the demo. */
export const DEMO_HOST_ETA_MIN = 6;

export type HostAction = "accept" | "arrived" | "finish";

/** The one primary action for each step of the host's flow, or null when waiting. */
export function nextHostAction(
	assignment: HostAssignment | null,
): HostAction | null {
	switch (assignment?.status) {
		case "pendiente":
			return "accept";
		case "en_camino":
			return "arrived";
		case "llego":
			return "finish";
		default:
			return null;
	}
}

/** The event a host action publishes. */
export function hostActionEvent(
	action: HostAction,
	assignmentId: string,
): CityEvent {
	switch (action) {
		case "accept":
			return {
				type: "anfitrion_estado",
				assignmentId,
				status: "en_camino",
				etaMin: DEMO_HOST_ETA_MIN,
			};
		case "arrived":
			return { type: "anfitrion_estado", assignmentId, status: "llego" };
		case "finish":
			return { type: "anfitrion_estado", assignmentId, status: "terminada" };
	}
}

/** A demo assignment (visitor with reduced mobility in a downpour). */
export function demoAssignmentEvent(assignmentId: string): CityEvent {
	return {
		type: "anfitrion_asignado",
		assignmentId,
		need: "movilidad_reducida",
		meetingPointCode: DEMO_MEETING_POINT_CODE,
	};
}
