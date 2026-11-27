// The map's side of Quillart AI (audit v2, U05 and U06), kept out of the map
// component so the map can change without touching it: it publishes the map
// view as screen context and applies the agent's `map.flyTo`, `map.drop` and
// `map.showRoute` actions, each with its undo. `/mapa?destino=` opens the map
// on that route. Any map that holds a Leaflet map and a route query can use it.

import L from "leaflet";
import { type RefObject, useEffect, useRef } from "react";
import { screenContext } from "../../lib/assistant/screen-context-store";
import { useT } from "../../lib/i18n/use-language";
import { focusMap } from "../../lib/map/map-focus";
import { prefersReducedMotion } from "../../lib/reduced-motion";
import { DESTINATIONS, type DestinationKey } from "../../lib/trip/trip-planner";
import { useUiAction } from "../agent-dock/use-ui-action";
import { pinIcon } from "./map-markers";
import type { RouteQuery } from "./use-route-plan";

interface MapUiActionsOptions {
	mapRef: RefObject<L.Map | null>;
	query: RouteQuery;
	setQuery: (query: RouteQuery) => void;
	/** Code of the selected stop, arroyo or business, if any. */
	selected: string | null;
}

function move(map: L.Map, center: L.LatLngExpression, zoom: number) {
	if (prefersReducedMotion()) map.setView(center, zoom, { animate: false });
	else map.flyTo(center, zoom, { duration: 0.6 });
}

function isDestination(value: string | null): value is DestinationKey {
	return value !== null && Object.hasOwn(DESTINATIONS, value);
}

export function useMapUiActions({
	mapRef,
	query,
	setQuery,
	selected,
}: MapUiActionsOptions): void {
	const t = useT();
	const pinsRef = useRef<L.LayerGroup | null>(null);
	const queryRef = useRef(query);
	queryRef.current = query;

	// `/mapa?destino=estadio`: the route the agent (or a link) asked for.
	// biome-ignore lint/correctness/useExhaustiveDependencies: read once, on arrival.
	useEffect(() => {
		const destino = new URLSearchParams(window.location.search).get("destino");
		if (!isDestination(destino)) return;
		setQuery({
			...queryRef.current,
			destination: DESTINATIONS[destino].stopCode,
		});
	}, []);

	// What the agent sees: the view (rounded by the server), the selection and the route.
	useEffect(() => {
		const map = mapRef.current;
		if (!map) return;
		const publish = () => {
			const center = map.getCenter();
			screenContext.publish({
				route: "/mapa",
				title: t.map.mapAria,
				map: {
					center: [center.lat, center.lng],
					zoom: map.getZoom(),
					...(selected ? { selected } : {}),
					route: { origen: query.origin, destino: query.destination },
				},
			});
		};
		publish();
		map.on("moveend", publish);
		return () => {
			map.off("moveend", publish);
		};
	}, [mapRef, selected, query.origin, query.destination, t]);
	useEffect(() => () => screenContext.reset(), []);

	useUiAction("map.showRoute", (action) => {
		const before = queryRef.current;
		const destination = DESTINATIONS[action.destino];
		setQuery({
			...before,
			destination: destination.stopCode,
			accessibleMode: action.accesible ?? before.accessibleMode,
		});
		return {
			labels: [t.dock.routeTo(destination.name)],
			undo: () => setQuery(before),
		};
	});

	useUiAction("map.flyTo", (action) => {
		const map = mapRef.current;
		if (!map) return null;
		const center = map.getCenter();
		const zoom = map.getZoom();
		// Same path as any other focus request: refused outside the AMB (U09).
		if (!focusMap({ lat: action.lat, lng: action.lng, zoom: action.zoom ?? 16 }))
			return null;
		return {
			labels: action.label ? [action.label] : [],
			undo: () => move(map, center, zoom),
		};
	});

	useUiAction("map.drop", (action) => {
		const map = mapRef.current;
		if (!map) return null;
		const layer = L.layerGroup();
		for (const pin of action.pins) {
			// Gold with the star: made by the agent, and it says so in words too.
			const title = `${pin.label} · ${t.dock.madeByAgent}`;
			L.marker([pin.lat, pin.lng], {
				icon: pinIcon({
					tone: "gold",
					glyph: "star",
					label: pin.label,
					status: t.dock.madeByAgent,
					labeled: action.pins.length <= 3,
				}),
				title,
				alt: title,
				keyboard: false,
				zIndexOffset: 900,
			}).addTo(layer);
		}
		const previous = pinsRef.current;
		previous?.remove();
		layer.addTo(map);
		pinsRef.current = layer;
		if (action.pins.length > 1) {
			map.fitBounds(
				L.latLngBounds(action.pins.map((pin) => [pin.lat, pin.lng])),
				{ padding: [48, 48], animate: !prefersReducedMotion() },
			);
		}
		return {
			labels: [t.dock.pinsOnMap(action.pins.length)],
			undo: () => {
				layer.remove();
				if (previous) previous.addTo(map);
				pinsRef.current = previous;
			},
		};
	});
}
