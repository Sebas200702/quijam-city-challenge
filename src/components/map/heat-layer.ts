// "Calor y sombra" layer (Rutas frescas, #46): a soft heat tint per stop by zone,
// and a small badge on every stop with shade or water. Off until the visitor turns it on.

import L from "leaflet";
import { type RefObject, useEffect } from "react";
import type { CorridorData } from "../../lib/corridor/corridor-types";
import { coolPoints, ZONE_HEAT } from "../../lib/corridor/heat-reference";
import type { MapMessages } from "../../lib/i18n/dictionaries/map";
import "./heat-layer.css";

/** Own pane under the arroyos and the route, so the heat never hides them. */
const HEAT_PANE = "corridor-heat";
const HEAT_RADIUS_M = 450;

const svg = (paths: string) =>
	`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
// Lucide "tree-palm" (shade, as in the stop detail) and "droplet" (water).
const SHADE_GLYPH = svg(
	'<path d="M13 8c0-2.76-2.46-5-5.5-5S2 5.24 2 8h2l1-1 1 1h4"/><path d="M13 7.14A5.82 5.82 0 0 1 16.5 6c3.04 0 5.5 2.24 5.5 5h-3l-1-1-1 1h-3"/><path d="M5.89 9.71c-2.15 2.15-2.3 5.47-.35 7.43l4.24-4.25.7-.7.71-.71 2.12-2.12c-1.95-1.96-5.27-1.8-7.42.35"/><path d="M11 15.5c.5 2.5-.17 4.5-1 6.5h4c2-5.5-.5-12-1-14"/>',
);
const WATER_GLYPH = svg(
	'<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
);

function coolIcon(shade: boolean, water: boolean): L.DivIcon {
	const glyphs = [shade && SHADE_GLYPH, water && WATER_GLYPH].filter(Boolean);
	const width = 8 + glyphs.length * 18;
	return L.divIcon({
		className: "corridor-cool",
		html: `<span class="corridor-cool__badge" aria-hidden="true">${glyphs.join("")}</span>`,
		iconSize: [width, 24],
		// Above and right of the stop pin, so both stay readable.
		iconAnchor: [-12, 34],
	});
}

export function buildHeatLayer(
	map: L.Map,
	data: CorridorData,
	t: MapMessages,
): L.LayerGroup {
	if (!map.getPane(HEAT_PANE)) {
		map.createPane(HEAT_PANE).classList.add("corridor-heat-pane");
	}
	const tints = data.stops.map((stop) =>
		L.circle([stop.latitude, stop.longitude], {
			pane: HEAT_PANE,
			radius: HEAT_RADIUS_M,
			className: `corridor-heat corridor-heat--${ZONE_HEAT[stop.zone]}`,
			interactive: false,
		}),
	);
	const badges = coolPoints(data.stops).map((point) => {
		const label = t.heat.coolPin(point.name, point.shade, point.water);
		const marker = L.marker([point.latitude, point.longitude], {
			icon: coolIcon(point.shade, point.water),
			interactive: false,
			keyboard: false,
			title: label,
		});
		marker.on("add", () => {
			const element = marker.getElement();
			element?.setAttribute("role", "img");
			element?.setAttribute("aria-label", label);
		});
		return marker;
	});
	return L.layerGroup([...tints, ...badges]);
}

/** Shows the heat layer on the map while `on` is true; rebuilt when the data or language change. */
export function useHeatLayer(
	mapRef: RefObject<L.Map | null>,
	data: CorridorData,
	on: boolean,
	t: MapMessages,
): void {
	useEffect(() => {
		const map = mapRef.current;
		if (!map || !on) return;
		const layer = buildHeatLayer(map, data, t).addTo(map);
		return () => {
			layer.remove();
		};
	}, [mapRef, data, on, t]);
}
