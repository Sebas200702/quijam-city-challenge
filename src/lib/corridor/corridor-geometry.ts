// Pure helpers for the corridor map: the corridor line and the status of each layer item.

import { CORRIDOR_ROUTE_POLYLINE } from "./corridor-route";
import type {
	CorridorBusiness,
	CorridorStop,
	FloodZone,
	MapStatus,
} from "./corridor-types";

/** Pilot corridor order: Estadio - Troncal Murillo - Centro - Barrio Abajo - Gran Malecon. */
export const CORRIDOR_STOP_ORDER = [
	"STOP-ESTADIO",
	"STOP-MURILLO-SUR",
	"STOP-MURILLO-46",
	"STOP-CENTRO",
	"STOP-BARRIO-ABAJO",
	"STOP-MALECON-SUR",
	"STOP-MALECON-NORTE",
] as const;

export type LatLngTuple = [number, number];

/**
 * Corridor line as [lat, lng] points in corridor order. Stops missing from the
 * data are skipped, so a partial dataset still draws a line.
 */
export function buildCorridorPath(stops: CorridorStop[]): LatLngTuple[] {
	const byCode = new Map(stops.map((stop) => [stop.code, stop]));
	return CORRIDOR_STOP_ORDER.flatMap((code) => {
		const stop = byCode.get(code);
		return stop ? [[stop.latitude, stop.longitude] as LatLngTuple] : [];
	});
}

/**
 * Decodes an encoded polyline (Google algorithm, as returned by OSRM) into
 * [lat, lng] points. Returns an empty list if the string is malformed.
 */
export function decodePolyline(encoded: string, precision = 5): LatLngTuple[] {
	const factor = 10 ** precision;
	const points: LatLngTuple[] = [];
	let index = 0;
	let lat = 0;
	let lng = 0;

	const nextDelta = (): number | null => {
		let result = 0;
		let shift = 0;
		let byte: number;
		do {
			if (index >= encoded.length) return null;
			byte = encoded.charCodeAt(index++) - 63;
			result |= (byte & 0x1f) << shift;
			shift += 5;
		} while (byte >= 0x20);
		return result & 1 ? ~(result >> 1) : result >> 1;
	};

	while (index < encoded.length) {
		const dLat = nextDelta();
		const dLng = nextDelta();
		if (dLat === null || dLng === null) return [];
		lat += dLat;
		lng += dLng;
		points.push([lat / factor, lng / factor]);
	}
	return points;
}

/**
 * Line to draw for the corridor: the street-following route stored in the repo,
 * or straight segments between the stops if that route cannot be decoded.
 */
export function corridorLine(stops: CorridorStop[]): LatLngTuple[] {
	const route = decodePolyline(CORRIDOR_ROUTE_POLYLINE);
	return route.length >= 2 ? route : buildCorridorPath(stops);
}

/** Bounding box [[south, west], [north, east]] that holds every point, or null if there are none. */
export function boundsOf(
	points: LatLngTuple[],
): [LatLngTuple, LatLngTuple] | null {
	if (points.length === 0) return null;
	const lats = points.map(([lat]) => lat);
	const lngs = points.map(([, lng]) => lng);
	return [
		[Math.min(...lats), Math.min(...lngs)],
		[Math.max(...lats), Math.max(...lngs)],
	];
}

const RISK_LABELS: Record<FloodZone["risk_level"], string> = {
	low: "Riesgo bajo",
	moderate: "Riesgo moderado",
	high: "Riesgo alto",
	critical: "Riesgo crítico",
};

/** Active alert is red; high or critical risk without an alert is gold; the rest is green. */
export function floodZoneStatus(zone: FloodZone): MapStatus {
	if (zone.alert_active) return { tone: "red", label: "Alerta activa" };
	const label = RISK_LABELS[zone.risk_level];
	if (zone.risk_level === "high" || zone.risk_level === "critical") {
		return { tone: "gold", label };
	}
	return { tone: "green", label };
}

export function businessStatus(business: CorridorBusiness): MapStatus {
	return business.is_open
		? { tone: "gold", label: "Abierto" }
		: { tone: "neutral", label: "Cerrado" };
}

export type ServiceKey =
	| "accessible"
	| "shade"
	| "hydration"
	| "recycling"
	| "hosts"
	| "verified"
	| "commissionFree";

export const SERVICE_LABELS: Record<ServiceKey, string> = {
	accessible: "Accesible",
	shade: "Sombra",
	hydration: "Hidratación",
	recycling: "Reciclaje",
	hosts: "Anfitriones",
	verified: "Verificado",
	commissionFree: "Sin comisión",
};

/** Services a stop offers, in a fixed order. */
export function stopServices(stop: CorridorStop): ServiceKey[] {
	const services: [boolean, ServiceKey][] = [
		[stop.is_accessible, "accessible"],
		[stop.has_shade, "shade"],
		[stop.has_hydration, "hydration"],
		[stop.has_recycling, "recycling"],
		[stop.has_host_duo, "hosts"],
	];
	return services.filter(([offered]) => offered).map(([, key]) => key);
}
