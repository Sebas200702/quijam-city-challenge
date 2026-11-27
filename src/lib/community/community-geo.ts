// Points of community content on the map (docs/30, U08, §6.4). An event or a thread
// may carry the point of a public place; without one, a catalog place lends its own.
// Points are checked against the Metropolitan Area outline in the forms, both stores
// and the server, so nothing outside the AMB is ever stored.

import {
	ambAnchor,
	isInsideAmb,
	type MunicipalityKey,
	municipalityAt,
} from "../geo/amb-boundary";
import { messages } from "../i18n/messages";
import { getLanguage } from "../i18n/use-language";

export interface GeoPoint {
	latitude: number;
	longitude: number;
}

export interface StoredPoint {
	latitude: number | null;
	longitude: number | null;
	municipality: MunicipalityKey | null;
}

const NO_POINT: StoredPoint = {
	latitude: null,
	longitude: null,
	municipality: null,
};

const isNumber = (value: unknown): value is number =>
	typeof value === "number" && Number.isFinite(value);

/** Null when the optional point is fine (absent, or inside the AMB). */
export function validatePoint(
	latitude: unknown,
	longitude: unknown,
): string | null {
	const missing = (value: unknown) => value === null || value === undefined;
	if (missing(latitude) && missing(longitude)) return null;
	if (
		!isNumber(latitude) ||
		!isNumber(longitude) ||
		!isInsideAmb(latitude, longitude)
	)
		return messages[getLanguage()].geo.pointOutside;
	return null;
}

/**
 * The point to store: the one the person picked, else the catalog place's (moved onto
 * the shore when it sits on the water, dropped when it is outside the AMB).
 */
export function resolvePoint(
	input: { latitude?: number | null; longitude?: number | null },
	place?: GeoPoint | null,
): StoredPoint {
	if (isNumber(input.latitude) && isNumber(input.longitude)) {
		if (!isInsideAmb(input.latitude, input.longitude)) return NO_POINT;
		return {
			latitude: input.latitude,
			longitude: input.longitude,
			municipality:
				municipalityAt(input.latitude, input.longitude)?.key ?? null,
		};
	}
	if (!place) return NO_POINT;
	const anchor = ambAnchor(place.latitude, place.longitude);
	if (!anchor) return NO_POINT;
	return {
		latitude: anchor[0],
		longitude: anchor[1],
		municipality: municipalityAt(anchor[0], anchor[1])?.key ?? null,
	};
}

/** Where content shows on a map: its own point, else its place's; null when neither is in the AMB. */
export function pointOf(
	content: { latitude?: number | null; longitude?: number | null },
	place?: GeoPoint | null,
): GeoPoint | null {
	const resolved = resolvePoint(content, place);
	return resolved.latitude !== null && resolved.longitude !== null
		? { latitude: resolved.latitude, longitude: resolved.longitude }
		: null;
}

/** Name of the municipality a point falls in ("Galapa"), or null outside the AMB. */
export function municipalityName(point: GeoPoint | null): string | null {
	if (!point) return null;
	return municipalityAt(point.latitude, point.longitude)?.name ?? null;
}
