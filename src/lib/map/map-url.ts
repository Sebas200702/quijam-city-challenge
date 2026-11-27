// The /mapa URL contract: what a link (or Quillart AI) can ask the map to show.
//
//   /mapa?lugar=<slug>              selects and centres a place (U07)
//   /mapa?evento=<id>               selects a community event with a point (U08)
//   /mapa?conversacion=<id>         selects a forum thread with a point (U08)
//   /mapa?negocio=<code>            opens a business card (vendor "Cómo te ven")
//   /mapa?lat=<lat>&lng=<lng>&zoom=<z>  centres a point inside the AMB
//
// Every field is optional; a URL may combine an entity with a camera (the entity wins).
// Points outside the Metropolitan Area are dropped: the map never shows them (U09).

import { isInsideAmb } from "../geo/amb-boundary";

export const MAP_PATH = "/mapa";

/** Zooms a link may ask for: from the whole AMB to a street corner. */
export const MIN_LINK_ZOOM = 10;
export const MAX_LINK_ZOOM = 19;

export interface MapCamera {
	lat: number;
	lng: number;
	zoom?: number;
}

export interface MapUrlState {
	/** Place slug (`places.slug`). */
	lugar?: string;
	/** Community event id (`events.id`). */
	evento?: string;
	/** Forum thread id (`forum_threads.id`). */
	conversacion?: string;
	/** Business code (`businesses.code`). */
	negocio?: string;
	camera?: MapCamera;
}

/** Slugs, ids and codes: letters, digits, "-" and "_", up to 80 characters. */
const KEY = /^[\p{L}\p{N}_-]{1,80}$/u;

function key(value: string | null): string | undefined {
	const trimmed = value?.trim();
	return trimmed && KEY.test(trimmed) ? trimmed : undefined;
}

function clampZoom(value: number): number {
	return Math.min(MAX_LINK_ZOOM, Math.max(MIN_LINK_ZOOM, Math.round(value)));
}

/** Reads the map state from a query string ("?lugar=…" or a URLSearchParams). */
export function parseMapUrl(search: string | URLSearchParams): MapUrlState {
	const params =
		typeof search === "string" ? new URLSearchParams(search) : search;
	const state: MapUrlState = {};
	const lugar = key(params.get("lugar"));
	const evento = key(params.get("evento"));
	const conversacion = key(params.get("conversacion"));
	const negocio = key(params.get("negocio"));
	if (lugar) state.lugar = lugar;
	if (evento) state.evento = evento;
	if (conversacion) state.conversacion = conversacion;
	if (negocio) state.negocio = negocio;
	const lat = Number.parseFloat(params.get("lat") ?? "");
	const lng = Number.parseFloat(params.get("lng") ?? "");
	if (isInsideAmb(lat, lng)) {
		const zoom = Number.parseFloat(params.get("zoom") ?? "");
		state.camera = Number.isFinite(zoom)
			? { lat, lng, zoom: clampZoom(zoom) }
			: { lat, lng };
	}
	return state;
}

/** Builds a /mapa link; fields that would not survive parseMapUrl are left out. */
export function mapHref(state: MapUrlState = {}): string {
	const params = new URLSearchParams();
	const lugar = key(state.lugar ?? null);
	const evento = key(state.evento ?? null);
	const conversacion = key(state.conversacion ?? null);
	const negocio = key(state.negocio ?? null);
	if (lugar) params.set("lugar", lugar);
	if (evento) params.set("evento", evento);
	if (conversacion) params.set("conversacion", conversacion);
	if (negocio) params.set("negocio", negocio);
	const camera = state.camera;
	if (camera && isInsideAmb(camera.lat, camera.lng)) {
		params.set("lat", camera.lat.toFixed(5));
		params.set("lng", camera.lng.toFixed(5));
		if (camera.zoom !== undefined)
			params.set("zoom", String(clampZoom(camera.zoom)));
	}
	const query = params.toString();
	return query ? `${MAP_PATH}?${query}` : MAP_PATH;
}
