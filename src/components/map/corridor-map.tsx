import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { LocateFixed, Minus, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCityState } from "../../lib/city-events/use-city-state";
import { boundsOf, corridorLine } from "../../lib/corridor/corridor-geometry";
import {
	describeSelection,
	findPoint,
	orderedStops,
	type Selection,
	type SelectionKind,
	searchablePoints,
	selectionKey,
} from "../../lib/corridor/corridor-selection";
import type {
	CorridorData,
	CorridorDataSource,
} from "../../lib/corridor/corridor-types";
import "./corridor-map.css";
import { DetailCard } from "./detail-card";
import { MapHeader, type Theme } from "./map-header";
import {
	buildCorridorLayers,
	type CorridorLayers,
	type LayerKey,
} from "./map-layers";
import { setMarkerSelected } from "./map-markers";
import { RouteCard } from "./route-card";
import { StopList } from "./stop-list";
import { type RouteQuery, useRoutePlan } from "./use-route-plan";

// Standard OpenStreetMap tiles: no API key. The dark theme darkens them in CSS.
const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION =
	'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const FALLBACK_CENTER: L.LatLngTuple = [10.97, -74.79];
const WIDE_SCREEN_PX = 640;
/** Same key the layout's inline script reads to apply the theme before paint. */
const THEME_STORAGE_KEY = "quillart-theme";

const LAYER_OF: Record<SelectionKind, LayerKey> = {
	stop: "stops",
	floodZone: "floodZones",
	business: "businesses",
};

interface CorridorMapProps {
	data: CorridorData;
	source: CorridorDataSource;
}

/** Room the floating UI takes: the panel on top (phones) or left (wide), the sheet at the bottom. */
function overlayPadding(map: L.Map) {
	const wide = map.getSize().x >= WIDE_SCREEN_PX;
	return {
		paddingTopLeft: L.point(wide ? [430, 24] : [24, 140]),
		paddingBottomRight: L.point(wide ? [80, 24] : [72, 340]),
	};
}

/** Flies to a point and leaves it in the part of the map the floating UI does not cover. */
function flyToVisible(map: L.Map, latLng: L.LatLng, zoom: number) {
	const { paddingTopLeft, paddingBottomRight } = overlayPadding(map);
	const offset = paddingBottomRight.subtract(paddingTopLeft).divideBy(2);
	const center = map.unproject(map.project(latLng, zoom).add(offset), zoom);
	map.flyTo(center, zoom, { duration: 0.6 });
}

function fitCorridor(map: L.Map, data: CorridorData) {
	// The container may have been resized since the last layout (rotation, devtools).
	map.invalidateSize();
	const bounds = boundsOf(corridorLine(data.stops));
	if (bounds) map.fitBounds(bounds, overlayPadding(map));
	else map.setView(FALLBACK_CENTER, 13);
}

export default function CorridorMap({ data, source }: CorridorMapProps) {
	const containerRef = useRef<HTMLElement>(null);
	const mapRef = useRef<L.Map | null>(null);
	const layersRef = useRef<CorridorLayers | null>(null);
	const [selected, setSelected] = useState<Selection | null>(null);
	const [theme, setTheme] = useState<Theme>(() =>
		document.documentElement.dataset.theme === "dark" ? "dark" : "light",
	);
	const pointNames = useMemo(
		() => searchablePoints(data).map((point) => point.name),
		[data],
	);
	const [visible, setVisible] = useState<Record<LayerKey, boolean>>({
		stops: true,
		floodZones: true,
		businesses: true,
	});

	const stops = useMemo(() => orderedStops(data.stops), [data.stops]);
	const { state: city } = useCityState();
	const [query, setQuery] = useState<RouteQuery>({
		origin: "STOP-MALECON-SUR",
		destination: "STOP-ESTADIO",
		accessibleMode: false,
	});
	const { plan, loading, error } = useRoutePlan(query, city);
	const planLayerRef = useRef<L.LayerGroup | null>(null);
	const floodLayerRef = useRef<L.LayerGroup | null>(null);
	const detail = useMemo(
		() => describeSelection(data, selected),
		[data, selected],
	);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;
		const map = L.map(container, { zoomControl: false });
		L.tileLayer(TILE_URL, {
			attribution: TILE_ATTRIBUTION,
			maxZoom: 19,
		}).addTo(map);
		const layers = buildCorridorLayers(data, (selection) => {
			setSelected(selection);
			const marker = layersRef.current?.markers.get(selectionKey(selection));
			if (marker) map.panInside(marker.getLatLng(), overlayPadding(map));
		});
		layers.corridor.addTo(map);
		fitCorridor(map, data);
		mapRef.current = map;
		layersRef.current = layers;
		planLayerRef.current = L.layerGroup().addTo(map);
		floodLayerRef.current = L.layerGroup().addTo(map);
		return () => {
			map.remove();
			mapRef.current = null;
			layersRef.current = null;
		};
	}, [data]);

	// Show or hide each layer, then mark the selected marker again: Leaflet
	// rebuilds a marker's element when its layer comes back.
	useEffect(() => {
		const map = mapRef.current;
		const layers = layersRef.current;
		if (!map || !layers) return;
		for (const key of Object.keys(visible) as LayerKey[]) {
			if (visible[key]) layers[key].addTo(map);
			else layers[key].remove();
		}
		const selectedKey = selected ? selectionKey(selected) : null;
		for (const [key, marker] of layers.markers) {
			setMarkerSelected(marker, key === selectedKey);
		}
	}, [visible, selected]);

	// Draws the route the Decider chose.
	useEffect(() => {
		const layer = planLayerRef.current;
		if (!layer) return;
		layer.clearLayers();
		const route = plan?.route;
		if (!route) return;
		const byCode = new Map(data.stops.map((stop) => [stop.code, stop]));
		const path = route.stopCodes.flatMap((code) => {
			const stop = byCode.get(code);
			return stop ? [[stop.latitude, stop.longitude] as L.LatLngTuple] : [];
		});
		L.polyline(path, { className: "corridor-plan", interactive: false }).addTo(
			layer,
		);
	}, [plan, data.stops]);

	// Paints flood zones activated by city-events (downpour) in pulsing red.
	useEffect(() => {
		const layer = floodLayerRef.current;
		if (!layer) return;
		layer.clearLayers();
		const active = new Set(city.activeFloodZoneIds);
		for (const zone of data.floodZones) {
			if (!active.has(zone.code)) continue;
			L.circle([zone.latitude, zone.longitude], {
				radius: zone.radius_meters,
				className: "corridor-flood corridor-flood--red corridor-flood--live",
				interactive: false,
			}).addTo(layer);
		}
	}, [city.activeFloodZoneIds, data.floodZones]);

	const toggleLayer = (key: LayerKey) => {
		setVisible((current) => ({ ...current, [key]: !current[key] }));
		// A hidden layer cannot keep the selected point.
		if (selected && LAYER_OF[selected.kind] === key && visible[key]) {
			setSelected(null);
		}
	};

	/** Selects a point from the list or the search: shows its layer and flies to it. */
	const focusPoint = (selection: Selection) => {
		setSelected(selection);
		setVisible((current) => ({ ...current, [LAYER_OF[selection.kind]]: true }));
		const map = mapRef.current;
		const marker = layersRef.current?.markers.get(selectionKey(selection));
		if (map && marker) flyToVisible(map, marker.getLatLng(), 16);
	};

	const search = (query: string) => {
		const match = findPoint(data, query);
		if (match) focusPoint(match);
		return match !== null;
	};

	const toggleTheme = () => {
		const next: Theme = theme === "light" ? "dark" : "light";
		document.documentElement.dataset.theme = next;
		try {
			localStorage.setItem(THEME_STORAGE_KEY, next);
		} catch {
			// Private mode or blocked storage: the theme still changes for this visit.
		}
		setTheme(next);
	};

	return (
		<div className="corridor-app">
			<section
				ref={containerRef}
				className="corridor-app__map"
				aria-label="Mapa del corredor piloto"
			/>

			<aside className="corridor-panel">
				<MapHeader
					pointNames={pointNames}
					onSearch={search}
					theme={theme}
					onToggleTheme={toggleTheme}
					visible={visible}
					counts={{
						stops: data.stops.length,
						floodZones: data.floodZones.length,
						businesses: data.businesses.length,
					}}
					onToggle={toggleLayer}
				/>
				<div className="corridor-panel__stops">
					<StopList
						stops={stops}
						selectedCode={selected?.kind === "stop" ? selected.code : null}
						onPick={(stop) => focusPoint({ kind: "stop", code: stop.code })}
					/>
				</div>
			</aside>

			<div className="corridor-controls q-mapctl">
				<button
					type="button"
					className="q-fab"
					aria-label="Centrar el corredor"
					onClick={() => mapRef.current && fitCorridor(mapRef.current, data)}
				>
					<LocateFixed size={22} strokeWidth={1.75} aria-hidden="true" />
				</button>
				<div className="q-zoom">
					<button
						type="button"
						aria-label="Acercar"
						onClick={() => mapRef.current?.zoomIn()}
					>
						<Plus size={20} strokeWidth={1.75} aria-hidden="true" />
					</button>
					<button
						type="button"
						aria-label="Alejar"
						onClick={() => mapRef.current?.zoomOut()}
					>
						<Minus size={20} strokeWidth={1.75} aria-hidden="true" />
					</button>
				</div>
			</div>

			<div className="corridor-app__detail">
				{detail ? (
					<DetailCard
						detail={detail}
						source={source}
						onClose={() => setSelected(null)}
					/>
				) : (
					<RouteCard
						stops={stops}
						query={query}
						onQueryChange={setQuery}
						plan={plan}
						loading={loading}
						error={error}
						floodAlert={city.activeFloodZoneIds.length > 0}
					/>
				)}
			</div>
		</div>
	);
}
