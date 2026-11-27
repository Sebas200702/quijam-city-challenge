// Point layers other features add to /mapa: places, community events and forum
// threads with a point (docs/30, U07, U08 and §6.4). A layer says how to load
// its points and how they look; the map draws them, clusters them, adds a chip to
// toggle them, searches them and opens them from /mapa?<urlParam>=<id>.
//
// To add one: write a PointLayer next to places-layer.ts and list it in POINT_LAYERS
// (or call registerMapLayer before /mapa mounts). Points outside the Metropolitan
// Area are dropped by the map; points on the water near the shore move to the shore.

import type { LucideIcon } from "lucide-react";
import type { StatusTone } from "../../lib/corridor/corridor-types";
import type { Messages } from "../../lib/i18n/messages";
import type { MapUrlState } from "../../lib/map/map-url";
import { communityLayer, eventsLayer } from "./community-layers";
import type { PinGlyph } from "./map-markers";
import { placesLayer } from "./places-layer";

export interface MapPoint {
	/** Stable within its layer; also what /mapa?<urlParam>= carries (a slug or an id). */
	id: string;
	lat: number;
	lng: number;
	name: string;
	/** Short context under the name: kind and neighbourhood, date and place… */
	eyebrow: string;
	description?: string;
	/** Where "Ver más" leads (its own page). */
	href?: string;
}

export interface PointLayer {
	/** Unique key, also the clusterer group: "places", "events", "threads"… */
	key: string;
	/** URL parameter that selects one of its points, if any. */
	urlParam?: Exclude<keyof MapUrlState, "camera">;
	tone: StatusTone;
	glyph: PinGlyph;
	Icon: LucideIcon;
	/** Chip and cluster label, plural ("Lugares"). */
	label: (t: Messages) => string;
	/** Accessible name of one pin ("Lugar: Gran Malecón del Río"). */
	pinTitle: (t: Messages, point: MapPoint) => string;
	/** The card's main action ("Ver el lugar"). */
	openLabel: (t: Messages) => string;
	/** Loads the points in the chosen language; may reject (the layer stays empty). */
	load: (t: Messages) => Promise<MapPoint[]>;
}

const POINT_LAYERS: PointLayer[] = [placesLayer, eventsLayer, communityLayer];

/** Adds a layer (once per key). Call it before the map mounts. */
export function registerMapLayer(layer: PointLayer): void {
	const index = POINT_LAYERS.findIndex((item) => item.key === layer.key);
	if (index === -1) POINT_LAYERS.push(layer);
	else POINT_LAYERS[index] = layer;
}

export function registeredMapLayers(): readonly PointLayer[] {
	return POINT_LAYERS;
}

/** Marker key of a point, unique across layers (corridor pins use "stop:…"). */
export function pointKey(layer: string, id: string): string {
	return `point:${layer}:${id}`;
}
