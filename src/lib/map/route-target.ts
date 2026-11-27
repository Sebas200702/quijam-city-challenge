// Where a route on /mapa goes (docs/33, Producto): one of the three named trip
// destinations, any corridor stop by its code, or any catalog place inside the AMB,
// reached through its nearest corridor stop (routing only runs between stops).
// The origin stays the visitor's own choice; the map defaults it to the Malecón.

import type { Place } from "../community/community-types";
import type { CorridorStop } from "../corridor/corridor-types";
import { isInsideAmb } from "../geo/amb-boundary";
import { DESTINATIONS } from "../trip/trip-planner";

export interface RouteTarget {
	/** Stop the Decider routes to. */
	stopCode: string;
	/** What the visitor asked for ("Gran Malecón del Río"), for the labels. */
	name: string;
}

export interface RouteCatalog {
	stops: Pick<CorridorStop, "code" | "name" | "latitude" | "longitude">[];
	places: Pick<Place, "slug" | "name" | "latitude" | "longitude">[];
}

/** Squared equirectangular distance: enough to rank stops a few km apart. */
function closeness(
	a: { latitude: number; longitude: number },
	b: { latitude: number; longitude: number },
): number {
	const cos = Math.cos((a.latitude * Math.PI) / 180);
	const dLat = a.latitude - b.latitude;
	const dLng = (a.longitude - b.longitude) * cos;
	return dLat * dLat + dLng * dLng;
}

/** The route target for a destination key, stop code or place slug; null when unknown. */
export function resolveRouteTarget(
	key: string,
	catalog: RouteCatalog,
): RouteTarget | null {
	if (Object.hasOwn(DESTINATIONS, key)) {
		const known = DESTINATIONS[key as keyof typeof DESTINATIONS];
		return { stopCode: known.stopCode, name: known.name };
	}
	const stop = catalog.stops.find((item) => item.code === key);
	if (stop) return { stopCode: stop.code, name: stop.name };
	const place = catalog.places.find((item) => item.slug === key);
	if (!place || !isInsideAmb(place.latitude, place.longitude)) return null;
	let nearest: RouteCatalog["stops"][number] | null = null;
	for (const candidate of catalog.stops) {
		if (!nearest || closeness(place, candidate) < closeness(place, nearest)) {
			nearest = candidate;
		}
	}
	return nearest ? { stopCode: nearest.code, name: place.name } : null;
}

/**
 * The route to open when /mapa loads: only the one `?destino=` asks for. Without it
 * the map opens with no route, on phones and on desktop alike.
 */
export function arrivalRouteTarget(
	search: string,
	catalog: RouteCatalog,
): RouteTarget | null {
	const destino = new URLSearchParams(search).get("destino");
	return destino ? resolveRouteTarget(destino, catalog) : null;
}
