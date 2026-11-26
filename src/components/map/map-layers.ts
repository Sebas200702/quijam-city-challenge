// Builds the Leaflet layers of the corridor map from the corridor data.

import L from "leaflet";
import {
	businessStatus,
	corridorLine,
	floodZoneStatus,
} from "../../lib/corridor/corridor-geometry";
import {
	type Selection,
	selectionKey,
} from "../../lib/corridor/corridor-selection";
import type {
	CorridorData,
	FloodZone,
	StatusTone,
} from "../../lib/corridor/corridor-types";
import { pinIcon } from "./map-markers";

export type LayerKey = "stops" | "floodZones" | "businesses";

export interface CorridorLayers extends Record<LayerKey, L.LayerGroup> {
	corridor: L.LayerGroup;
	/** Every marker, by selectionKey(), so the map can highlight the selected one. */
	markers: Map<string, L.Marker>;
	/** Flood zone circles by code, so live alerts can recolor them. */
	floodCircles: Map<string, L.Circle>;
}

const floodClass = (tone: StatusTone) =>
	`corridor-flood corridor-flood--${tone}`;

/**
 * Recolors flood zones without rebuilding the map: codes in `alertCodes`
 * (active or counting down) turn red, the rest keep their usual status.
 */
export function restyleFloodZones(
	layers: CorridorLayers,
	floodZones: readonly FloodZone[],
	alertCodes: ReadonlySet<string>,
) {
	for (const zone of floodZones) {
		const tone: StatusTone = alertCodes.has(zone.code)
			? "red"
			: floodZoneStatus(zone).tone;
		const circle = layers.floodCircles.get(zone.code);
		if (circle) {
			// Options are reused if Leaflet redraws the circle; the element updates now.
			circle.options.className = floodClass(tone);
			circle.getElement()?.setAttribute("class", floodClass(tone));
		}
		layers.markers
			.get(selectionKey({ kind: "floodZone", code: zone.code }))
			?.setIcon(
				pinIcon({
					tone,
					glyph: tone === "red" ? "alert" : "water",
					label: zone.name,
				}),
			);
	}
}

/** The corridor's two ends keep their name on the map; other pins show it when selected. */
const LABELED_STOPS = new Set(["STOP-ESTADIO", "STOP-MALECON-SUR"]);

export function buildCorridorLayers(
	data: CorridorData,
	onSelect: (selection: Selection) => void,
): CorridorLayers {
	const markers = new Map<string, L.Marker>();
	const floodCircles = new Map<string, L.Circle>();
	const marker = (
		selection: Selection,
		latLng: L.LatLngTuple,
		title: string,
		icon: L.DivIcon,
	) => {
		const item = L.marker(latLng, { icon, title })
			.on("click", () => onSelect(selection))
			// Leaflet makes markers focusable but only popups react to Enter.
			.on("keydown", (event) => {
				const { originalEvent } = event as L.LeafletKeyboardEvent;
				if (originalEvent.key !== "Enter" && originalEvent.key !== " ") return;
				originalEvent.preventDefault();
				onSelect(selection);
			});
		markers.set(selectionKey(selection), item);
		return item;
	};

	const path = corridorLine(data.stops);
	return {
		corridor: L.layerGroup([
			L.polyline(path, {
				className: "corridor-route-case",
				interactive: false,
			}),
			L.polyline(path, { className: "corridor-route", interactive: false }),
		]),
		stops: L.layerGroup(
			data.stops.map((stop) =>
				marker(
					{ kind: "stop", code: stop.code },
					[stop.latitude, stop.longitude],
					stop.name,
					pinIcon({
						tone: "green",
						glyph: "transit",
						label: stop.name,
						labeled: LABELED_STOPS.has(stop.code),
					}),
				),
			),
		),
		floodZones: L.layerGroup(
			data.floodZones.flatMap((zone) => {
				const { tone } = floodZoneStatus(zone);
				const center: L.LatLngTuple = [zone.latitude, zone.longitude];
				const circle = L.circle(center, {
					radius: zone.radius_meters,
					className: floodClass(tone),
					interactive: false,
				});
				floodCircles.set(zone.code, circle);
				return [
					circle,
					marker(
						{ kind: "floodZone", code: zone.code },
						center,
						zone.name,
						pinIcon({
							tone,
							glyph: tone === "red" ? "alert" : "water",
							label: zone.name,
						}),
					),
				];
			}),
		),
		businesses: L.layerGroup(
			data.businesses.map((business) =>
				marker(
					{ kind: "business", code: business.code },
					[business.latitude, business.longitude],
					business.name,
					pinIcon({
						tone: businessStatus(business).tone,
						glyph: "star",
						label: business.name,
					}),
				),
			),
		),
		markers,
		floodCircles,
	};
}
