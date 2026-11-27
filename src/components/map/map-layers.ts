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
import type { CorridorData } from "../../lib/corridor/corridor-types";
import type { MapMessages } from "../../lib/i18n/dictionaries/map";
import { statusWord } from "./map-labels";
import { pinIcon } from "./map-markers";

export type LayerKey = "stops" | "floodZones" | "businesses";

export interface CorridorLayers extends Record<LayerKey, L.LayerGroup> {
	corridor: L.LayerGroup;
	/** Every marker, by selectionKey(), so the map can highlight the selected one. */
	markers: Map<string, L.Marker>;
}

/** The corridor's two ends keep their name on the map; other pins show it when selected or near. */
const LABELED_STOPS = new Set(["STOP-ESTADIO", "STOP-MALECON-SUR"]);

/** Id of the SVG pattern that hatches arroyo zones; corridor-map.tsx renders it once. */
export const FLOOD_HATCH_ID = "corridor-flood-hatch";

/** Draws a route as a gold line on a dark edge (the QUILLART active route). */
export function routeLine(
	path: L.LatLngTuple[],
	variant: "active" | "accessible",
): L.Polyline[] {
	return [
		L.polyline(path, {
			className: `corridor-plan-case corridor-plan-case--${variant}`,
			interactive: false,
		}),
		L.polyline(path, {
			className: `corridor-plan corridor-plan--${variant}`,
			interactive: false,
		}),
	];
}

/** An arroyo zone: tinted circle, hatched in red when its alert is on. */
export function floodCircle(
	center: L.LatLngTuple,
	radius: number,
	tone: string,
	live = false,
): L.Circle {
	return L.circle(center, {
		radius,
		className: `corridor-flood corridor-flood--${tone}${live ? " corridor-flood--live" : ""}`,
		interactive: false,
	});
}

interface Pin {
	title: string;
	icon: L.DivIcon;
}

/** Title and icon of every pin in the chosen language, by selectionKey(). */
function pinsOf(data: CorridorData, t: MapMessages): Map<string, Pin> {
	const pins = new Map<string, Pin>();
	for (const stop of data.stops) {
		pins.set(selectionKey({ kind: "stop", code: stop.code }), {
			title: t.pinStop(stop.name, stop.is_accessible),
			icon: pinIcon({
				tone: "green",
				glyph: "transit",
				label: stop.name,
				status: stop.is_accessible ? statusWord(t, "Accesible") : undefined,
				labeled: LABELED_STOPS.has(stop.code),
			}),
		});
	}
	for (const zone of data.floodZones) {
		const { tone, label } = floodZoneStatus(zone);
		const status = statusWord(t, label);
		pins.set(selectionKey({ kind: "floodZone", code: zone.code }), {
			title: t.pinFlood(zone.name, status),
			icon: pinIcon({
				tone,
				glyph: tone === "red" ? "alert" : "water",
				label: zone.name,
				status,
				labeled: tone === "red",
			}),
		});
	}
	for (const business of data.businesses) {
		const { tone, label } = businessStatus(business);
		const status = statusWord(t, label);
		pins.set(selectionKey({ kind: "business", code: business.code }), {
			title: t.pinBusiness(business.name, status),
			icon: pinIcon({
				tone,
				glyph: business.is_open ? "star" : "store",
				label: business.name,
				status,
			}),
		});
	}
	return pins;
}

/** Puts the pins' titles and labels in a new language; the caller re-marks the selected pin. */
export function relabelPins(
	layers: CorridorLayers,
	data: CorridorData,
	t: MapMessages,
): void {
	for (const [key, { title, icon }] of pinsOf(data, t)) {
		const item = layers.markers.get(key);
		if (!item) continue;
		item.options.title = title;
		item.setIcon(icon);
		const element = item.getElement();
		element?.setAttribute("title", title);
		element?.setAttribute("aria-label", title);
	}
}

export function buildCorridorLayers(
	data: CorridorData,
	onSelect: (selection: Selection) => void,
	t: MapMessages,
): CorridorLayers {
	const markers = new Map<string, L.Marker>();
	const pins = pinsOf(data, t);
	const marker = (selection: Selection, latLng: L.LatLngTuple) => {
		const { title, icon } = pins.get(selectionKey(selection)) as Pin;
		const item = L.marker(latLng, { icon, title })
			// Leaflet gives the marker role="button"; name it for screen readers too.
			.on("add", () =>
				item
					.getElement()
					?.setAttribute("aria-label", item.options.title ?? title),
			)
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
		// The corridor itself stays quiet; the route the Decider picks is the gold one.
		corridor: L.layerGroup([
			L.polyline(path, {
				className: "corridor-route-case",
				interactive: false,
			}),
			L.polyline(path, { className: "corridor-route", interactive: false }),
		]),
		stops: L.layerGroup(
			data.stops.map((stop) =>
				marker({ kind: "stop", code: stop.code }, [
					stop.latitude,
					stop.longitude,
				]),
			),
		),
		floodZones: L.layerGroup(
			data.floodZones.flatMap((zone) => {
				const { tone } = floodZoneStatus(zone);
				const center: L.LatLngTuple = [zone.latitude, zone.longitude];
				return [
					floodCircle(center, zone.radius_meters, tone),
					marker({ kind: "floodZone", code: zone.code }, center),
				];
			}),
		),
		businesses: L.layerGroup(
			data.businesses.map((business) =>
				marker({ kind: "business", code: business.code }, [
					business.latitude,
					business.longitude,
				]),
			),
		),
		markers,
	};
}
