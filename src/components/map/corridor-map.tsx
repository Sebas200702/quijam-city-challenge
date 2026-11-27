import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
	Accessibility,
	BusFront,
	Droplet,
	LocateFixed,
	MapPinned,
	MapPinOff,
	MessageCircle,
	Minus,
	Plus,
	RefreshCw,
	Scan,
	TriangleAlert,
	WifiOff,
	X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { crowdByZoneFrom } from "../../lib/city-events/city-state";
import { useCityState } from "../../lib/city-events/use-city-state";
import { boundsOf, corridorLine } from "../../lib/corridor/corridor-geometry";
import {
	describeSelection,
	findPoint,
	orderedStops,
	type Selection,
	searchablePoints,
	selectionKey,
} from "../../lib/corridor/corridor-selection";
import type {
	CorridorData,
	CorridorDataSource,
} from "../../lib/corridor/corridor-types";
import { coolPoints } from "../../lib/corridor/heat-reference";
import { useT } from "../../lib/i18n/use-language";
import { onMapFocus } from "../../lib/map/map-focus";
import { parseMapUrl } from "../../lib/map/map-url";
import type { VisitorContext } from "../../lib/notices/notice-types";
import { prefersReducedMotion } from "../../lib/reduced-motion";
import { openDock } from "../agent-dock/dock-control";
import { NoticeSlot } from "../notices/notice-slot";
import "./corridor-map.css";
import { HostArrivalNotice } from "../host/host-arrival-notice";
import { BusinessExtras } from "./business-extras";
import { DetailCard } from "./detail-card";
import { useHeatLayer } from "./heat-layer";
import { HeatChip, HeatLegend, HeatNote } from "./heat-ui";
import { MapHeader, type Theme } from "./map-header";
import { pointKey } from "./map-layer-registry";
import {
	buildCorridorLayers,
	type CorridorLayers,
	FLOOD_HATCH_ID,
	floodCircle,
	LAYER_OF,
	type LayerKey,
	relabelPins,
	routeLine,
} from "./map-layers";
import { pinIcon, setMarkerSelected, userIcon } from "./map-markers";
import { createMetroMap, metroTileLayer } from "./metro-frame";
import { type ClusterEntry, PinClusterer } from "./pin-clusterer";
import { PointCard } from "./point-card";
import { RouteCard } from "./route-card";
import { StopList } from "./stop-list";
import { useFloodCountdown } from "./use-flood-countdown";
import { useFloodNotice } from "./use-flood-notice";
import { useLiveBusinesses } from "./use-live-businesses";
import { useMapUiActions } from "./use-map-ui-actions";
import { usePointLayers } from "./use-point-layers";
import { type RouteQuery, useRoutePlan } from "./use-route-plan";

const FALLBACK_CENTER: L.LatLngTuple = [10.97, -74.79];
const WIDE_SCREEN_PX = 640;
/** From this zoom on, every pin shows its name and status word, not only the selected one. */
const NEAR_ZOOM = 16;
/** Same key the layout's inline script reads to apply the theme before paint. */
const THEME_STORAGE_KEY = "quillart-theme";

/** A point of a registered layer (places…), by layer key and point id. */
interface PointSelection {
	layer: string;
	id: string;
}

/** Same rule as findPoint: lower case, no accents, so "malecon" finds "Malecón". */
const normalize = (text: string) =>
	text
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase()
		.trim();

/** The corridor layers, in chip order. */
const LAYER_OF_KEYS: Record<LayerKey, true> = {
	stops: true,
	floodZones: true,
	businesses: true,
};

/** What the base map is doing: the pins and lines come with the page, the tiles from the network. */
type TileStatus = "loading" | "ready" | "error";

interface CorridorMapProps {
	data: CorridorData;
	source: CorridorDataSource;
}

/** Room the floating UI takes: the panel on top (phones) or left (wide), the sheet at the bottom. */
function overlayPadding(map: L.Map) {
	const size = map.getSize();
	const wide = size.x >= WIDE_SCREEN_PX;
	// Phones: one row of chips on top; at the bottom, the open sheet (if any).
	const sheet = map
		.getContainer()
		.parentElement?.querySelector<HTMLElement>(".corridor-app__detail");
	const sheetHeight = sheet?.offsetHeight ?? 0;
	return {
		paddingTopLeft: L.point(wide ? [430, 24] : [16, 72]),
		paddingBottomRight: L.point(
			wide ? [80, 24] : [72, sheetHeight > 0 ? sheetHeight + 32 : 24],
		),
	};
}

/** Flies to a point and leaves it in the part of the map the floating UI does not cover. */
function flyToVisible(map: L.Map, latLng: L.LatLng, zoom: number) {
	const { paddingTopLeft, paddingBottomRight } = overlayPadding(map);
	const offset = paddingBottomRight.subtract(paddingTopLeft).divideBy(2);
	const center = map.unproject(map.project(latLng, zoom).add(offset), zoom);
	// "Reduce motion": jump straight there instead of flying.
	if (prefersReducedMotion()) map.setView(center, zoom, { animate: false });
	else map.flyTo(center, zoom, { duration: 0.6 });
}

function fitCorridor(map: L.Map, data: CorridorData) {
	// The container may have been resized since the last layout (rotation, devtools).
	map.invalidateSize();
	const bounds = boundsOf(corridorLine(data.stops));
	if (bounds) map.fitBounds(bounds, overlayPadding(map));
	else map.setView(FALLBACK_CENTER, 13);
}

export default function CorridorMap({ data, source }: CorridorMapProps) {
	const messages = useT();
	const t = messages.map;
	// The map's effects read the language through a ref, so a change relabels the pins
	// without building the map again.
	const tRef = useRef(t);
	tRef.current = t;
	const containerRef = useRef<HTMLElement>(null);
	const mapRef = useRef<L.Map | null>(null);
	const layersRef = useRef<CorridorLayers | null>(null);
	const clustererRef = useRef<PinClusterer | null>(null);
	const [selected, setSelected] = useState<Selection | null>(null);
	/** A place (or another registered point) instead of a corridor point. */
	const [pointSelected, setPointSelected] = useState<PointSelection | null>(
		null,
	);
	/** Why a link could not show its point (outside the AMB, or unknown). */
	const [mapNote, setMapNote] = useState<string | null>(null);
	const pointLayers = usePointLayers(messages);
	const layerLabelRef = useRef((group: string) => group);
	layerLabelRef.current = (group: string) => {
		const point = pointLayers.find(({ layer }) => layer.key === group);
		if (point) return point.layer.label(messages);
		const labels: Record<string, string> = {
			stops: t.layerStops,
			floodZones: t.layerFlood,
			businesses: t.layerBusinesses,
		};
		return labels[group] ?? group;
	};
	const [legendOpen, setLegendOpen] = useState(false);
	const [near, setNear] = useState(false);
	const [tiles, setTiles] = useState<TileStatus>("loading");
	const [online, setOnline] = useState(() => navigator.onLine);
	const tileLayerRef = useRef<L.TileLayer | null>(null);
	const userLayerRef = useRef<L.LayerGroup | null>(null);
	const [theme, setTheme] = useState<Theme>(() =>
		document.documentElement.dataset.theme === "dark" ? "dark" : "light",
	);
	// The theme can also change from the secondary menu: follow the page attribute.
	useEffect(() => {
		const root = document.documentElement;
		const observer = new MutationObserver(() =>
			setTheme(root.dataset.theme === "dark" ? "dark" : "light"),
		);
		observer.observe(root, {
			attributes: true,
			attributeFilter: ["data-theme"],
		});
		return () => observer.disconnect();
	}, []);
	const pointNames = useMemo(
		() => [
			...searchablePoints(data).map((point) => point.name),
			...pointLayers.flatMap(({ points }) => points.map((point) => point.name)),
		],
		[data, pointLayers],
	);
	/** Layers by key; point layers that are missing here are on. */
	const [visible, setVisible] = useState<Record<string, boolean>>({
		stops: true,
		floodZones: true,
		businesses: true,
	});
	/** "Calor y sombra" (#46): off until the visitor turns it on. */
	const [heatOn, setHeatOn] = useState(false);
	const coolCount = useMemo(() => coolPoints(data.stops).length, [data.stops]);

	const stops = useMemo(() => orderedStops(data.stops), [data.stops]);
	const { state: city, lastEvent } = useCityState();
	const flood = useFloodCountdown(lastEvent, data.floodZones);
	const crowdByZone = useMemo(() => crowdByZoneFrom(city), [city]);
	const [query, setQuery] = useState<RouteQuery>({
		origin: "STOP-MALECON-SUR",
		destination: "STOP-ESTADIO",
		accessibleMode: false,
	});
	const { plan, loading, error } = useRoutePlan(
		query,
		flood.blocked,
		crowdByZone,
	);
	// The route sheet opens only when the visitor asks for a route (the stop list, the
	// agent's `map.showRoute` or `/mapa?destino=`), on phones and desktop alike.
	const [routeOpen, setRouteOpen] = useState(false);
	// "You are here": the trip's origin stands in for the visitor's position (no GPS in the pilot).
	const origin = data.stops.find((stop) => stop.code === query.origin) ?? null;
	// The arroyo modal only opens when it touches this route or the visitor's zone (docs/20, 3.1).
	const route = plan?.route ?? null;
	const visitor = useMemo<VisitorContext | undefined>(() => {
		if (!route && !origin) return undefined;
		const zoneOf = new Map(data.stops.map((stop) => [stop.code, stop.zone]));
		return {
			routeFloodZoneCodes: route?.floodZoneIds ?? [],
			routeZones: (route?.stopCodes ?? []).flatMap((code) => {
				const zone = zoneOf.get(code);
				return zone ? [zone] : [];
			}),
			currentZone: origin?.zone ?? null,
		};
	}, [route, origin, data.stops]);
	const floodNotice = useFloodNotice(flood.alert, visitor);
	const planLayerRef = useRef<L.LayerGroup | null>(null);
	const floodLayerRef = useRef<L.LayerGroup | null>(null);
	// Businesses opened or closed by their vendors arrive by Realtime (#49).
	const live = useLiveBusinesses(data);
	const detail = useMemo(
		() => describeSelection(live, selected),
		[live, selected],
	);
	const selectedBusiness =
		selected?.kind === "business"
			? (live.businesses.find((business) => business.code === selected.code) ??
				null)
			: null;

	const selectedPoint = useMemo(() => {
		if (!pointSelected) return null;
		const loaded = pointLayers.find(
			(item) => item.layer.key === pointSelected.layer,
		);
		const point = loaded?.points.find((item) => item.id === pointSelected.id);
		return loaded && point ? { layer: loaded.layer, point } : null;
	}, [pointLayers, pointSelected]);
	const selectedKey = selected
		? selectionKey(selected)
		: pointSelected
			? pointKey(pointSelected.layer, pointSelected.id)
			: null;
	const selectedKeyRef = useRef(selectedKey);
	selectedKeyRef.current = selectedKey;

	// /mapa?negocio=<code> (the vendor's "Cómo te ven") opens that business's card.
	useEffect(() => {
		const code = parseMapUrl(window.location.search).negocio;
		if (code && data.businesses.some((business) => business.code === code)) {
			setSelected({ kind: "business", code });
		}
	}, [data]);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;
		// Only the Metropolitan Area shows: the rest is masked and out of reach (U09).
		const map = createMetroMap(container, { zoomControl: false });
		// Tiles that load at least once mean the map works; errors alone mean it did not.
		let anyTile = false;
		// CORS tiles, so the service worker can keep them for offline use (#47).
		const tileLayer = metroTileLayer({ crossOrigin: true })
			.on("tileload", () => {
				anyTile = true;
			})
			// Leaflet also fires "load" when every tile failed: only a real tile means ready.
			.on("load", () => setTiles(anyTile ? "ready" : "error"))
			.on("tileerror", () => {
				if (!anyTile) setTiles("error");
			})
			.addTo(map);
		tileLayerRef.current = tileLayer;
		map.on("zoomend", () => setNear(map.getZoom() >= NEAR_ZOOM));
		const layers = buildCorridorLayers(
			data,
			(selection) => {
				setPointSelected(null);
				setSelected(selection);
				const marker = layersRef.current?.markers.get(
					selectionKey(selection),
				)?.marker;
				if (marker) map.panInside(marker.getLatLng(), overlayPadding(map));
			},
			tRef.current,
		);
		layers.corridor.addTo(map);
		fitCorridor(map, data);
		// Pins that would cover each other become one numbered circle (U32).
		const clusterer = new PinClusterer(map, {
			toneOf: (group) =>
				group === "businesses"
					? "gold"
					: group === "floodZones"
						? "gold"
						: "green",
			describe: (count, groups) => {
				const copy = tRef.current;
				const parts = Object.entries(groups)
					.map(([group, n]) =>
						copy.metro.clusterPart(layerLabelRef.current(group), n),
					)
					.join(", ");
				return copy.metro.cluster(count, parts);
			},
			zoomTo: (center, zoom) => flyToVisible(map, center, zoom),
			// Leaflet rebuilds a pin's element when it comes back: mark the selection again.
			onRender: () => {
				for (const [key, entry] of clusterer.keys()) {
					setMarkerSelected(entry.marker, key === selectedKeyRef.current);
				}
			},
		});
		clusterer.set(layers.markers);
		mapRef.current = map;
		layersRef.current = layers;
		clustererRef.current = clusterer;
		planLayerRef.current = L.layerGroup().addTo(map);
		floodLayerRef.current = L.layerGroup().addTo(map);
		userLayerRef.current = L.layerGroup().addTo(map);
		setNear(map.getZoom() >= NEAR_ZOOM);
		return () => {
			clusterer.destroy();
			map.remove();
			mapRef.current = null;
			layersRef.current = null;
			clustererRef.current = null;
			tileLayerRef.current = null;
		};
	}, [data]);

	// The registered point layers (places…): one pin per point, through the clusterer.
	useEffect(() => {
		const clusterer = clustererRef.current;
		if (!clusterer) return;
		const entries = pointLayers.flatMap(({ layer, points }) =>
			points.map((point) => {
				const title = layer.pinTitle(messages, point);
				const select = () => {
					setSelected(null);
					setPointSelected({ layer: layer.key, id: point.id });
				};
				const marker = L.marker([point.lat, point.lng], {
					icon: pinIcon({
						tone: layer.tone,
						glyph: layer.glyph,
						label: point.name,
					}),
					title,
				})
					.on("add", () =>
						marker.getElement()?.setAttribute("aria-label", title),
					)
					.on("click", select)
					.on("keydown", (event) => {
						const { originalEvent } = event as L.LeafletKeyboardEvent;
						if (originalEvent.key !== "Enter" && originalEvent.key !== " ")
							return;
						originalEvent.preventDefault();
						select();
					});
				return [
					pointKey(layer.key, point.id),
					{ marker, group: layer.key },
				] satisfies [string, ClusterEntry];
			}),
		);
		clusterer.set(entries);
	}, [pointLayers, messages]);

	// Links into the map: /mapa?lugar=<slug> (and any layer's own parameter) selects and
	// centres the point; ?lat=&lng=&zoom= centres a spot. Each one is handled once.
	const handledLinkRef = useRef(new Set<string>());
	useEffect(() => {
		const map = mapRef.current;
		if (!map) return;
		const url = parseMapUrl(window.location.search);
		const handled = handledLinkRef.current;
		if (url.camera && !handled.has("camera")) {
			handled.add("camera");
			const { lat, lng, zoom } = url.camera;
			flyToVisible(map, L.latLng(lat, lng), zoom ?? 16);
		}
		for (const { layer, points, outside, status } of pointLayers) {
			const id = layer.urlParam ? url[layer.urlParam] : undefined;
			if (!id || handled.has(layer.key) || status === "loading") continue;
			handled.add(layer.key);
			const point = points.find((item) => item.id === id);
			if (point) {
				setSelected(null);
				setPointSelected({ layer: layer.key, id });
				flyToVisible(map, L.latLng(point.lat, point.lng), 16);
			} else {
				setMapNote(
					outside.has(id) ? t.metro.focusOutside : t.metro.focusMissing,
				);
			}
		}
	}, [pointLayers, t]);

	// focusMap() from anywhere on the page (the agent dock, a list) moves this map.
	useEffect(
		() =>
			onMapFocus((request) => {
				const map = mapRef.current;
				if (!map) return;
				if (request.select) {
					setSelected(null);
					setPointSelected(request.select);
				}
				flyToVisible(
					map,
					L.latLng(request.lat, request.lng),
					request.zoom ?? 16,
				);
			}),
		[],
	);

	// Quillart AI: what the map shows, and the agent's map actions (audit v2, U05).
	useMapUiActions({
		mapRef,
		query,
		setQuery: (next) => {
			setQuery(next);
			setRouteOpen(true);
		},
		selected: selected?.code ?? null,
		stops: data.stops,
		segments: data.segments,
	});

	useHeatLayer(mapRef, data, heatOn, t);

	useEffect(() => {
		const update = () => setOnline(navigator.onLine);
		window.addEventListener("online", update);
		window.addEventListener("offline", update);
		return () => {
			window.removeEventListener("online", update);
			window.removeEventListener("offline", update);
		};
	}, []);

	// A new language relabels every pin (title and visible name/status).
	// biome-ignore lint/correctness/useExhaustiveDependencies: `t` is the trigger; the pins come from `tRef`.
	useEffect(() => {
		const layers = layersRef.current;
		if (layers) relabelPins(layers, live, tRef.current);
	}, [t, live]);

	// Show or hide each layer, then let the clusterer redraw and mark the selected pin
	// again: Leaflet rebuilds a marker's element when it comes back (and when a new
	// language relabels it).
	// biome-ignore lint/correctness/useExhaustiveDependencies: `t` and `live` re-mark the pin after relabelPins replaced its icon.
	useEffect(() => {
		const map = mapRef.current;
		const layers = layersRef.current;
		const clusterer = clustererRef.current;
		if (!map || !layers || !clusterer) return;
		if (visible.floodZones) layers.floodAreas.addTo(map);
		else layers.floodAreas.remove();
		const groups = [
			...(Object.keys(LAYER_OF_KEYS) as LayerKey[]),
			...pointLayers.map(({ layer }) => layer.key),
		].filter((key) => visible[key] !== false);
		clusterer.setPinned(selectedKey);
		clusterer.setVisibleGroups(groups);
	}, [visible, selectedKey, pointLayers, t, live]);

	// Draws the route the Decider chose: gold on a dark edge (green edge when it is the accessible one).
	useEffect(() => {
		const layer = planLayerRef.current;
		if (!layer) return;
		layer.clearLayers();
		const route = plan?.route;
		if (!route || !routeOpen) return;
		const byCode = new Map(data.stops.map((stop) => [stop.code, stop]));
		const path = route.stopCodes.flatMap((code) => {
			const stop = byCode.get(code);
			return stop ? [[stop.latitude, stop.longitude] as L.LatLngTuple] : [];
		});
		const variant =
			query.accessibleMode && route.accessible ? "accessible" : "active";
		for (const line of routeLine(path, variant)) line.addTo(layer);
	}, [plan, data.stops, query.accessibleMode, routeOpen]);

	useEffect(() => {
		const layer = userLayerRef.current;
		if (!layer) return;
		layer.clearLayers();
		if (!origin) return;
		const label = t.userHereAt(origin.name);
		const marker = L.marker([origin.latitude, origin.longitude], {
			icon: userIcon({ accessible: query.accessibleMode, label: t.userHere }),
			interactive: false,
			keyboard: false,
			zIndexOffset: 500,
		});
		marker.on("add", () => {
			const element = marker.getElement();
			element?.setAttribute("role", "img");
			element?.setAttribute("aria-label", label);
		});
		marker.addTo(layer);
	}, [origin, query.accessibleMode, t]);

	// Paints flood zones activated by city-events (downpour) in pulsing, hatched red.
	useEffect(() => {
		const layer = floodLayerRef.current;
		if (!layer) return;
		layer.clearLayers();
		const active = new Set(flood.blocked);
		for (const zone of data.floodZones) {
			if (!active.has(zone.code)) continue;
			const center: L.LatLngTuple = [zone.latitude, zone.longitude];
			floodCircle(center, zone.radius_meters, "red", true).addTo(layer);
			// A red pin with its name and "Arroyo activo": never colour alone, readable at any zoom.
			L.marker(center, {
				icon: pinIcon({
					tone: "red",
					glyph: "alert",
					label: zone.name,
					status: t.activeFlood,
					labeled: true,
				}),
				interactive: false,
				keyboard: false,
				zIndexOffset: 800,
			}).addTo(layer);
		}
	}, [flood.blocked, data.floodZones, t]);

	// One assistant (U04): the map's "ask" buttons open the Quillart AI dock,
	// whose Mobility agent replaced the map Guide.
	const openGuide = () => {
		openDock();
	};

	const toggleLayer = (key: string) => {
		const on = visible[key] !== false;
		setVisible((current) => ({ ...current, [key]: !on }));
		// A hidden layer cannot keep the selected point.
		if (on && selected && LAYER_OF[selected.kind] === key) setSelected(null);
		if (on && pointSelected?.layer === key) setPointSelected(null);
	};

	/** Selects a point from the list or the search: shows its layer and flies to it. */
	const focusPoint = (selection: Selection) => {
		setPointSelected(null);
		setSelected(selection);
		setVisible((current) => ({ ...current, [LAYER_OF[selection.kind]]: true }));
		const map = mapRef.current;
		const marker = layersRef.current?.markers.get(
			selectionKey(selection),
		)?.marker;
		if (map && marker) flyToVisible(map, marker.getLatLng(), 16);
	};

	const search = (query: string) => {
		const match = findPoint(data, query);
		if (match) {
			focusPoint(match);
			return true;
		}
		// Then the point layers (places…), with the same accent-free match.
		const wanted = normalize(query);
		if (!wanted) return false;
		for (const { layer, points } of pointLayers) {
			const point = points.find((item) =>
				normalize(item.name).includes(wanted),
			);
			if (!point) continue;
			setSelected(null);
			setPointSelected({ layer: layer.key, id: point.id });
			setVisible((current) => ({ ...current, [layer.key]: true }));
			const map = mapRef.current;
			if (map) flyToVisible(map, L.latLng(point.lat, point.lng), 16);
			return true;
		}
		return false;
	};

	/** Centres the map on the visitor; without a position, on the whole corridor. */
	const locate = () => {
		const map = mapRef.current;
		if (!map) return;
		if (origin)
			flyToVisible(map, L.latLng(origin.latitude, origin.longitude), 16);
		else fitCorridor(map, data);
	};

	const retryTiles = () => {
		setTiles("loading");
		tileLayerRef.current?.redraw();
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
		<div className={`corridor-app${near ? " corridor-app--near" : ""}`}>
			<h1 className="q-sr">{t.mapAria}</h1>
			{/* The map and its pins come first in the tab order: let keyboards skip them. */}
			<a className="corridor-skip" href="#corridor-panel">
				{t.skipToPanel}
			</a>
			<MapPatterns />
			<section
				ref={containerRef}
				className="corridor-app__map"
				aria-label={t.mapAria}
			/>
			<MapStatusOverlay
				tiles={tiles}
				online={online}
				onRetry={retryTiles}
				onOpenGuide={openGuide}
			/>

			{/* The header carries the one "Datos de referencia" tag of the screen (rule 9). */}
			{(query.accessibleMode || heatOn) && (
				<div className="corridor-maptags">
					{query.accessibleMode && (
						<span className="q-badge q-badge--optimal corridor-maptags__badge">
							<Accessibility size={14} strokeWidth={1.75} aria-hidden="true" />
							{t.accessibleMode}
						</span>
					)}
					{heatOn && <HeatNote />}
				</div>
			)}

			<aside id="corridor-panel" className="corridor-panel" tabIndex={-1}>
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
						...Object.fromEntries(
							pointLayers.map(({ layer, points }) => [
								layer.key,
								points.length,
							]),
						),
					}}
					onToggle={toggleLayer}
					pointLayers={pointLayers.map(({ layer }) => ({
						key: layer.key,
						label: layer.label(messages),
						tone: layer.tone,
						Icon: layer.Icon,
					}))}
					source={source}
				>
					<HeatChip
						on={heatOn}
						count={coolCount}
						onToggle={() => setHeatOn((on) => !on)}
					/>
				</MapHeader>
				{/* Always mounted, so screen readers hear why a link showed nothing. */}
				<div className="corridor-note-region" role="status">
					{mapNote && (
						<p className="corridor-note">
							<MapPinOff size={18} strokeWidth={1.75} aria-hidden="true" />
							<span className="corridor-note__text">{mapNote}</span>
							<button
								type="button"
								className="corridor-note__close"
								aria-label={t.metro.dismissNote}
								onClick={() => setMapNote(null)}
							>
								<X size={18} strokeWidth={1.75} aria-hidden="true" />
							</button>
						</p>
					)}
				</div>
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
					aria-label={t.locate}
					title={t.locate}
					onClick={locate}
				>
					<LocateFixed size={22} strokeWidth={1.75} aria-hidden="true" />
				</button>
				<button
					type="button"
					className="q-fab corridor-controls__overview"
					aria-label={t.overview}
					title={t.overview}
					onClick={() => mapRef.current && fitCorridor(mapRef.current, data)}
				>
					<Scan size={22} strokeWidth={1.75} aria-hidden="true" />
				</button>
				<div className="q-zoom">
					<button
						type="button"
						aria-label={t.zoomIn}
						onClick={() => mapRef.current?.zoomIn()}
					>
						<Plus size={20} strokeWidth={1.75} aria-hidden="true" />
					</button>
					<button
						type="button"
						aria-label={t.zoomOut}
						onClick={() => mapRef.current?.zoomOut()}
					>
						<Minus size={20} strokeWidth={1.75} aria-hidden="true" />
					</button>
				</div>
				<button
					type="button"
					className="q-fab"
					aria-label={t.legend}
					title={t.legend}
					aria-expanded={legendOpen}
					aria-controls="corridor-legend"
					onClick={() => setLegendOpen((open) => !open)}
				>
					<MapPinned size={22} strokeWidth={1.75} aria-hidden="true" />
				</button>
				<MapLegend open={legendOpen} onClose={() => setLegendOpen(false)} />
			</div>

			<div className="corridor-app__detail">
				{selectedPoint ? (
					<PointCard
						layer={selectedPoint.layer}
						point={selectedPoint.point}
						onClose={() => setPointSelected(null)}
					/>
				) : detail ? (
					<DetailCard
						detail={detail}
						source={source}
						onClose={() => setSelected(null)}
						onOpenGuide={openGuide}
					>
						{selectedBusiness && (
							<BusinessExtras
								code={selectedBusiness.code}
								isOpen={selectedBusiness.is_open}
							/>
						)}
					</DetailCard>
				) : routeOpen ? (
					<RouteCard
						stops={stops}
						query={query}
						onQueryChange={setQuery}
						plan={plan}
						loading={loading}
						error={error}
						alert={floodNotice.band}
						onOpenGuide={openGuide}
						onClose={() => setRouteOpen(false)}
					/>
				) : (
					floodNotice.band
				)}
			</div>

			{/* Notices and the arroyo modal live at the root, above the card, the Guide and the
			    detail, so a safety alert is never hidden (epic #57, rules 3 and 4). */}
			<div className="corridor-app__notices">
				<NoticeSlot
					queue={floodNotice.queue}
					onAction={(_notice, actionId) => {
						// "Cambiar ruta": the Decider already re-planned without the arroyo; show it.
						if (actionId !== "change-route") return;
						setSelected(null);
					}}
				/>
			</div>
			<HostArrivalNotice assignment={city.hostAssignment} />
		</div>
	);
}

/** SVG patterns the Leaflet shapes reference by id (the arroyo hatch). Same document, so url(#id) works. */
function MapPatterns() {
	return (
		<svg className="corridor-patterns" aria-hidden="true" focusable="false">
			<defs>
				<pattern
					id={FLOOD_HATCH_ID}
					width="10"
					height="10"
					patternUnits="userSpaceOnUse"
					patternTransform="rotate(45)"
				>
					<rect className="corridor-patterns__base" width="10" height="10" />
					<line
						className="corridor-patterns__line"
						x1="0"
						y1="0"
						x2="0"
						y2="10"
					/>
				</pattern>
			</defs>
		</svg>
	);
}

const LEGEND_ITEMS = [
	{ key: "route", swatch: "route" },
	{ key: "corridor", swatch: "corridor" },
	{ key: "stop", swatch: "stop", Icon: BusFront },
	{ key: "arroyo", swatch: "arroyo", Icon: TriangleAlert },
	{ key: "risk", swatch: "risk", Icon: Droplet },
	{ key: "business", swatch: "business" },
	{ key: "user", swatch: "user" },
	{ key: "outside", swatch: "outside" },
] as const;

/** What each line, colour and pin means, always with a word next to it. */
function MapLegend({ open, onClose }: { open: boolean; onClose: () => void }) {
	const t = useT().map;
	return (
		<section
			id="corridor-legend"
			className="q-card q-card--raised corridor-legend"
			aria-labelledby="corridor-legend-title"
			hidden={!open}
		>
			<div className="corridor-legend__head">
				<h2 id="corridor-legend-title" className="corridor-legend__title">
					{t.legendTitle}
				</h2>
				<button
					type="button"
					className="q-btn q-btn--ghost q-btn--icon"
					aria-label={t.legendClose}
					onClick={onClose}
				>
					<X size={20} strokeWidth={1.75} aria-hidden="true" />
				</button>
			</div>
			<ul className="corridor-legend__list">
				{LEGEND_ITEMS.map((item) => (
					<li key={item.key} className="corridor-legend__item">
						<span
							className={`corridor-legend__swatch corridor-legend__swatch--${item.swatch}`}
							aria-hidden="true"
						>
							{"Icon" in item ? (
								<item.Icon size={14} strokeWidth={2} />
							) : item.swatch === "business" || item.swatch === "user" ? (
								<span className="q-star" />
							) : null}
						</span>
						{t.legendItems[item.key]}
					</li>
				))}
			</ul>
			<HeatLegend />
		</section>
	);
}

interface MapStatusOverlayProps {
	tiles: TileStatus;
	online: boolean;
	onRetry: () => void;
	onOpenGuide: () => void;
}

/** Loading, error and offline states of the base map: never a blank map (epic #57, rule 8). */
function MapStatusOverlay({
	tiles,
	online,
	onRetry,
	onOpenGuide,
}: MapStatusOverlayProps) {
	const t = useT().map;
	if (!online) {
		return (
			<div className="corridor-status corridor-status--note">
				<div className="q-state q-state--offline" role="status">
					<span className="q-state__glyph">
						<WifiOff size={22} strokeWidth={1.75} aria-hidden="true" />
					</span>
					<div>
						<p className="q-state__title">{t.statusOfflineTitle}</p>
						<p className="q-state__text">{t.statusOfflineText}</p>
					</div>
				</div>
			</div>
		);
	}
	if (tiles === "error") {
		return (
			// The pins, the route and the arroyos come with the page, so they stay usable.
			<div className="corridor-status corridor-status--note">
				<div className="q-state q-state--error" role="alert">
					<span className="q-state__glyph" aria-hidden="true">
						!
					</span>
					<div>
						<p className="q-state__title">{t.statusErrorTitle}</p>
						<p className="q-state__text">{t.statusErrorText}</p>
						<div className="corridor-status__actions">
							<button
								type="button"
								className="q-btn q-btn--primary"
								onClick={onRetry}
							>
								<RefreshCw size={18} strokeWidth={1.75} aria-hidden="true" />
								{t.retry}
							</button>
							<button
								type="button"
								className="q-btn q-btn--ghost"
								onClick={onOpenGuide}
							>
								<MessageCircle
									size={18}
									strokeWidth={1.75}
									aria-hidden="true"
								/>
								{t.askGuide}
							</button>
						</div>
					</div>
				</div>
			</div>
		);
	}
	if (tiles === "loading") {
		return (
			<div className="corridor-status corridor-status--note">
				<div className="q-state q-state--loading" role="status">
					<span className="q-state__glyph">
						<span className="q-star q-star--think" aria-hidden="true" />
					</span>
					<div>
						<p className="q-state__title">{t.statusLoadingTitle}</p>
						<p className="q-state__text">{t.statusLoadingText}</p>
					</div>
				</div>
			</div>
		);
	}
	return null;
}
