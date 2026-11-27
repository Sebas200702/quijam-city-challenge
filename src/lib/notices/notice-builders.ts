import type { ReportStatus } from "../city-dashboard-types";
import type { FloodStatus, FloodZoneRef } from "../flood-alert/flood-countdown";
import {
	DESVIO_TTL_MS,
	type Notice,
	type VisitorContext,
} from "./notice-types";

/** Shared action ids, handled by whoever mounts the slot. */
export const NOTICE_ACTIONS = {
	changeRoute: { id: "change-route", label: "Cambiar ruta" },
	acknowledge: { id: "acknowledge", label: "Entendido" },
	seeBarrioAbajo: { id: "see-barrio-abajo", label: "Ver Barrio Abajo" },
} as const;

export interface ArroyoAlert {
	zone: FloodZoneRef;
	status: Exclude<FloodStatus, { kind: "none" }>;
	/** Epoch ms when the arroyo becomes active, if known. */
	activeAt?: number;
}

/**
 * Does the arroyo touch the visitor's route or current zone (docs/26, 3.1)?
 * Without any context we cannot tell, so safety wins and it applies.
 */
export function floodTouchesVisitor(
	zone: FloodZoneRef,
	context?: VisitorContext,
): boolean {
	if (!context) return true;
	const { routeFloodZoneCodes, routeZones, currentZone } = context;
	return Boolean(
		routeFloodZoneCodes?.includes(zone.code) ||
			routeZones?.includes(zone.zone) ||
			(currentZone && currentZone === zone.zone),
	);
}

/** "Arroyo activo en 12 min" or "Arroyo activo ahora". */
export function arroyoTitle(status: ArroyoAlert["status"]): string {
	return status.kind === "active"
		? "Arroyo activo ahora"
		: `Arroyo activo en ${status.minutesLeft} min`;
}

/** The only interrupting notice: a modal, one per arroyo zone. */
export function arroyoNotice(
	alert: ArroyoAlert,
	context?: VisitorContext,
): Notice {
	const onRoute =
		!context ||
		Boolean(
			context.routeFloodZoneCodes?.includes(alert.zone.code) ||
				context.routeZones?.includes(alert.zone.zone),
		);
	const where = onRoute ? "sobre tu ruta" : "cerca de ti";
	return {
		key: `arroyo:${alert.zone.code}`,
		kind: "arroyo",
		tone: "alert",
		form: "modal",
		title: arroyoTitle(alert.status),
		text: `En ${alert.zone.name}, ${where}. No cruces calles con agua. Las rutas que te mostramos lo evitan.`,
		action: NOTICE_ACTIONS.changeRoute,
		secondaryAction: NOTICE_ACTIONS.acknowledge,
		activeAt: alert.activeAt,
	};
}

export interface HostUpdate {
	assignmentId: string;
	status: "en_camino" | "llego";
	/** Minutes until the host arrives (en_camino). */
	minutesLeft?: number;
	meetingPoint: string;
}

/** "Tu anfitrión va en camino" and then "Tu anfitrión llegó", same key. */
export function hostNotice(update: HostUpdate): Notice {
	const onTheWay = update.status === "en_camino";
	const eta =
		onTheWay && update.minutesLeft !== undefined
			? `. Llega en ${update.minutesLeft} min`
			: "";
	return {
		key: `anfitrion:${update.assignmentId}`,
		kind: "anfitrion",
		tone: "safe",
		form: "discreet",
		title: onTheWay ? `Tu anfitrión va en camino${eta}` : "Tu anfitrión llegó",
		text: `Punto de encuentro: ${update.meetingPoint}.`,
	};
}

export interface DiversionSuggestion {
	walkMinutes: number;
	openBusinesses: number;
}

/** Suggestion, never an order. Expires after 20 min. */
export function diversionNotice(
	suggestion: DiversionSuggestion,
	nowMs: number,
): Notice {
	return {
		key: "desvio:barrio_abajo",
		kind: "desvio",
		tone: "info",
		form: "discreet",
		title: `Barrio Abajo a ${suggestion.walkMinutes} min a pie. ${suggestion.openBusinesses} negocios abiertos`,
		text: "El Malecón está muy lleno ahora. Si quieres, conoce el barrio y su comida.",
		action: NOTICE_ACTIONS.seeBarrioAbajo,
		expiresAt: nowMs + DESVIO_TTL_MS,
	};
}

/** Copy per report status, same states as the city inbox (`REPORT_STATUS_LABELS`). */
const REPORT_COPY: Record<
	ReportStatus,
	Pick<Notice, "tone" | "title" | "text">
> = {
	open: {
		tone: "safe",
		title: "Recibimos tu reporte",
		text: "Llegó a la ciudad para revisión. Te avisamos aquí cuando lo revise.",
	},
	in_review: {
		tone: "info",
		title: "Tu reporte está en revisión",
		text: "La ciudad está revisando el cobro. No tienes que hacer nada.",
	},
	resolved: {
		tone: "safe",
		title: "Tu reporte fue resuelto",
		text: "La ciudad revisó el cobro. Gracias por avisar.",
	},
	dismissed: {
		tone: "info",
		title: "La ciudad revisó tu reporte",
		text: "Esta vez no encontró un cobro abusivo. Gracias por avisar.",
	},
};

/**
 * The visitor's own overcharge report, after leaving /reportar (which shows
 * its own confirmation). One key per report, so each status change replaces
 * the previous notice.
 */
export function reportNotice(reportId: string, status: ReportStatus): Notice {
	return {
		key: `reporte:${reportId}`,
		kind: "reporte",
		form: "discreet",
		...REPORT_COPY[status],
	};
}
