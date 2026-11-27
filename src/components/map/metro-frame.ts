// One base map for every Leaflet map of the app: OpenStreetMap tiles limited to the
// Barranquilla Metropolitan Area, an opaque mask over everything outside it, the
// municipal borders with their names, and camera limits (docs/30, U09 and §6.5).

import L from "leaflet";
import {
	AMB_BBOX,
	AMB_RING,
	type BoundingBox,
	MUNICIPALITIES,
	padBbox,
} from "../../lib/geo/amb-boundary";
import { prefersReducedMotion } from "../../lib/reduced-motion";
import "./metro-frame.css";

// Standard OpenStreetMap tiles: no API key. The dark theme darkens them in CSS.
export const OSM_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
/** Tiles and municipal boundaries both come from OpenStreetMap (ODbL). */
export const OSM_ATTRIBUTION =
	'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>';

const MASK_PANE = "metroMask";
const LABEL_PANE = "metroLabels";
/** From this zoom on the streets name themselves: the municipality names step aside. */
const STREET_ZOOM = 14;
/** Room past the AMB box the camera may show (the mask covers it). */
const BOUNDS_PAD = 0.04;

const toLatLngBounds = (box: BoundingBox) =>
	L.latLngBounds([box.south, box.west], [box.north, box.east]);

/** The AMB box, a little padded: the camera never leaves it. */
export const AMB_BOUNDS = toLatLngBounds(padBbox(AMB_BBOX, BOUNDS_PAD));

/** The whole world with the AMB cut out (Web Mercator stops at ±85°). */
const WORLD: L.LatLngTuple[] = [
	[85, -180],
	[85, 180],
	[-85, 180],
	[-85, -180],
];

/** Tile layer that only asks for tiles over the AMB. */
export function metroTileLayer(options: L.TileLayerOptions = {}): L.TileLayer {
	return L.tileLayer(OSM_TILE_URL, {
		attribution: OSM_ATTRIBUTION,
		maxZoom: 19,
		bounds: AMB_BOUNDS,
		...options,
	});
}

/** Lowest zoom at which the whole AMB box still fits: going further only shows the mask. */
function fitZoom(map: L.Map): number {
	return map.getBoundsZoom(AMB_BOUNDS, false);
}

/**
 * Creates a Leaflet map framed on the AMB. Callers add their tile layer
 * (`metroTileLayer`) and their own layers; everything outside the AMB stays hidden.
 */
export function createMetroMap(
	container: HTMLElement,
	options: L.MapOptions = {},
): L.Map {
	const still = prefersReducedMotion();
	const map = L.map(container, {
		zoomAnimation: !still,
		fadeAnimation: !still,
		markerZoomAnimation: !still,
		maxBounds: AMB_BOUNDS,
		maxBoundsViscosity: 1,
		...options,
	});
	// Leaflet needs a view before it can measure zooms.
	map.fitBounds(AMB_BOUNDS, { animate: false });
	const updateMinZoom = () => map.setMinZoom(fitZoom(map));
	updateMinZoom();
	map.on("resize", updateMinZoom);

	// The mask sits above the tiles and below every line, area and pin.
	const maskPane = map.createPane(MASK_PANE);
	maskPane.classList.add("metro-mask-pane");
	const labelPane = map.createPane(LABEL_PANE);
	labelPane.classList.add("metro-label-pane");
	// A wide renderer, so a fast drag never uncovers what lies past the edge.
	const renderer = L.svg({ pane: MASK_PANE, padding: 1 });
	const ring = [...AMB_RING] as L.LatLngTuple[];
	L.polygon([WORLD, ring], {
		renderer,
		className: "metro-mask",
		interactive: false,
	}).addTo(map);
	for (const municipality of MUNICIPALITIES) {
		L.polygon(municipality.ring as L.LatLngTuple[], {
			renderer,
			className: "metro-border",
			fill: false,
			interactive: false,
		}).addTo(map);
		L.marker(municipality.labelAt, {
			pane: LABEL_PANE,
			interactive: false,
			keyboard: false,
			icon: L.divIcon({
				className: "metro-label",
				html: municipalityLabel(municipality.name),
				iconSize: [0, 0],
			}),
		}).addTo(map);
	}
	L.polygon(ring, {
		renderer,
		className: "metro-edge",
		fill: false,
		interactive: false,
	}).addTo(map);

	const markStreetZoom = () =>
		container.classList.toggle(
			"metro-map--street",
			map.getZoom() >= STREET_ZOOM,
		);
	container.classList.add("metro-map");
	markStreetZoom();
	map.on("zoomend", markStreetZoom);
	return map;
}

/** Name of a municipality on the map; decorative, the map's own label says what it covers. */
function municipalityLabel(name: string): HTMLElement {
	const label = document.createElement("span");
	label.className = "metro-label__text";
	label.setAttribute("aria-hidden", "true");
	label.textContent = name;
	return label;
}
