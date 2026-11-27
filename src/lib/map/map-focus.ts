// focusMap(): lets any part of the page (the agent dock, a card, a list) move the map
// without knowing Leaflet. The map on screen listens; a request made before the map
// mounts waits for it. Requests outside the Metropolitan Area are refused (U09).
// To move the map from another page, link to mapHref() (map-url.ts) instead.

import { isInsideAmb } from "../geo/amb-boundary";
import type { MapCamera } from "./map-url";

export interface MapFocusRequest extends MapCamera {
	/** Select a point of a map layer too, e.g. { layer: "places", id: "gran-malecon" }. */
	select?: { layer: string; id: string };
}

type Listener = (request: MapFocusRequest) => void;

const listeners = new Set<Listener>();
let pending: MapFocusRequest | null = null;

/** Moves the map on screen (or the next one to mount). False when the point is outside the AMB. */
export function focusMap(request: MapFocusRequest): boolean {
	if (!isInsideAmb(request.lat, request.lng)) return false;
	if (listeners.size === 0) {
		pending = request;
		return true;
	}
	for (const listener of listeners) listener(request);
	return true;
}

/** The map subscribes here; it receives a request that was waiting for it at once. */
export function onMapFocus(listener: Listener): () => void {
	listeners.add(listener);
	if (pending) {
		const request = pending;
		pending = null;
		listener(request);
	}
	return () => {
		listeners.delete(listener);
	};
}
