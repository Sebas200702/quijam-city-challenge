import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
	Accessibility,
	BusFront,
	Droplet,
	LocateFixed,
	MapPinned,
	MessageCircle,
	Minus,
	Plus,
	RefreshCw,
	Scan,
	TriangleAlert,
	WifiOff,
	X,
} from "lucide-react";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { crowdByZoneFrom } from "../../lib/city-events/city-state";
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
import { DESTINATIONS, type DestinationKey } from "../../lib/trip/trip-planner";
import { GuidePanel } from "../guide/guide-panel";
import "./corridor-map.css";
import { DetailCard } from "./detail-card";
import { FloodAlertBanner } from "./flood-alert-banner";
import { MapHeader, type Theme } from "./map-header";
import {
	buildCorridorLayers,
	type CorridorLayers,
	FLOOD_HATCH_ID,
	floodCircle,
	type LayerKey,
	routeLine,
} from "./map-layers";
import { pinIcon, setMarkerSelected, userIcon } from "./map-markers";
import { RouteCard } from "./route-card";
import { StopList } from "./stop-list";
import { useFloodCountdown } from "./use-flood-countdown";
import { type RouteQuery, useRoutePlan } from "./use-route-plan";

// Standard OpenStreetMap tiles: no API key. The dark theme darkens them in CSS.
const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION =
	'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const FALLBACK_CENTER: L.LatLngTuple = [10.97, -74.79];
const WIDE_SCREEN_PX = 640;
/** From this zoom on, every pin shows its name and status word, not only the selected one. */
const NEAR_ZOOM = 16;
/** Same key the layout's inline script reads to apply the theme before paint. */
const THEME_STORAGE_KEY = "quillart-theme";

const LAYER_OF: Record<SelectionKind, LayerKey> = {
	stop: "stops",
	floodZone: "floodZones",
	business: "businesses",
};

/** What the base map is doing: the pins and lines come with the page, the tiles from the network. */
type TileStatus = "loading" | "ready" | "error";

/**
 * Window event that opens the Guide from outside the map (the visitor home's Guide bar).
 * The listener calls preventDefault() so the sender knows it was handled.
 */
export const OPEN_GUIDE_EVENT = "quillart:open-guide";

interface CorridorMapProps {
	data: CorridorData;
	source: CorridorDataSource;
	/**
	 * "full" (default): the map brings its own chrome, including the "Datos simulados 2034" tag.
	 * "embedded": a page shell around the map already shows the logo and the one sim tag.
	 */
	chrome?: "full" | "embedded";
	/**
	 * Contextual notices and the arroyo modal (epic #57, rules 2 to 4). Rendered at the map
	 * root, above the card, the Guide and the detail, so a safety alert is never hidden.
	 */
	notices?: ReactNode;
}

/** Room the floating UI takes: the panel on top (phones) or left (wide), the sheet at the bottom. */
function overlayPadding(map: L.Map) {
	const size = map.getSize();
	const wide = size.x >= WIDE_SCREEN_PX;
	// Phones: search, chips and tags on top; the card takes up to half the height at the bottom.
	return {
		paddingTopLeft: L.point(wide ? [430, 24] : [24, 180]),
		paddingBottomRight: L.point(
			wide ? [80, 24] : [72, Math.round(size.y / 2) + 32],
		),
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

export default function CorridorMap({
	data,
	source,
	chrome = "full",
	notices,
}: CorridorMapProps) {
	const containerRef = useRef<HTMLElement>(null);
	const mapRef = useRef<L.Map | null>(null);
	const layersRef = useRef<CorridorLayers | null>(null);
	const [selected, setSelected] = useState<Selection | null>(null);
	const [guideOpen, setGuideOpen] = useState(false);
	const [legendOpen, setLegendOpen] = useState(false);
	const [near, setNear] = useState(false);
	const [tiles, setTiles] = useState<TileStatus>("loading");
	const [online, setOnline] = useState(() => navigator.onLine);
	const tileLayerRef = useRef<L.TileLayer | null>(null);
	const userLayerRef = useRef<L.LayerGroup | null>(null);
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
	const { state: city, lastEvent, publish } = useCityState();
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
		// Tiles that load at least once mean the map works; errors alone mean it did not.
		let anyTile = false;
		const tileLayer = L.tileLayer(TILE_URL, {
			attribution: TILE_ATTRIBUTION,
			maxZoom: 19,
		})
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
		userLayerRef.current = L.layerGroup().addTo(map);
		setNear(map.getZoom() >= NEAR_ZOOM);
		return () => {
			map.remove();
			mapRef.current = null;
			layersRef.current = null;
			tileLayerRef.current = null;
		};
	}, [data]);

	// The page shell (visitor home) opens the Guide with a window event.
	useEffect(() => {
		const open = (event: Event) => {
			event.preventDefault();
			setGuideOpen(true);
		};
		window.addEventListener(OPEN_GUIDE_EVENT, open);
		return () => window.removeEventListener(OPEN_GUIDE_EVENT, open);
	}, []);

	useEffect(() => {
		const update = () => setOnline(navigator.onLine);
		window.addEventListener("online", update);
		window.addEventListener("offline", update);
		return () => {
			window.removeEventListener("online", update);
			window.removeEventListener("offline", update);
		};
	}, []);

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

	// Draws the route the Decider chose: gold on a dark edge (green edge when it is the accessible one).
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
		const variant =
			query.accessibleMode && route.accessible ? "accessible" : "active";
		for (const line of routeLine(path, variant)) line.addTo(layer);
	}, [plan, data.stops, query.accessibleMode]);

	// "You are here": the trip's origin stands in for the visitor's position (no GPS in the pilot).
	const origin = data.stops.find((stop) => stop.code === query.origin) ?? null;
	useEffect(() => {
		const layer = userLayerRef.current;
		if (!layer) return;
		layer.clearLayers();
		if (!origin) return;
		const label = `Estás aquí: ${origin.name}`;
		const marker = L.marker([origin.latitude, origin.longitude], {
			icon: userIcon({ accessible: query.accessibleMode, label: "Estás aquí" }),
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
	}, [origin, query.accessibleMode]);

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
					status: "Arroyo activo",
					labeled: true,
				}),
				interactive: false,
				keyboard: false,
				zIndexOffset: 800,
			}).addTo(layer);
		}
	}, [flood.blocked, data.floodZones]);

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

	/** From the Guide's trip card: hide the Guide (it keeps its conversation) and show the destination. */
	const showDestination = (destination: DestinationKey) => {
		setGuideOpen(false);
		focusPoint({ kind: "stop", code: DESTINATIONS[destination].stopCode });
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
		<div
			className={`corridor-app corridor-app--${chrome}${near ? " corridor-app--near" : ""}`}
		>
			<MapPatterns />
			<section
				ref={containerRef}
				className="corridor-app__map"
				aria-label="Mapa del corredor"
			/>
			<MapStatusOverlay
				tiles={tiles}
				online={online}
				onRetry={retryTiles}
				onOpenGuide={() => setGuideOpen(true)}
			/>

			<div className="corridor-maptags">
				{chrome === "full" && (
					<span className="q-sim-tag">Datos simulados 2034</span>
				)}
				{query.accessibleMode && (
					<span className="q-badge q-badge--optimal corridor-maptags__badge">
						<Accessibility size={14} strokeWidth={1.75} aria-hidden="true" />
						Modo accesible
					</span>
				)}
			</div>

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
				<button
					type="button"
					className="q-btn q-btn--primary corridor-guide-button"
					aria-expanded={guideOpen}
					onClick={() => setGuideOpen(true)}
				>
					<MessageCircle size={20} strokeWidth={1.75} aria-hidden="true" />
					Pregúntale al Guía · Ask the Guide
				</button>
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
					aria-label="Ir a donde estás"
					title="Ir a donde estás"
					onClick={locate}
				>
					<LocateFixed size={22} strokeWidth={1.75} aria-hidden="true" />
				</button>
				<button
					type="button"
					className="q-fab corridor-controls__overview"
					aria-label="Ver todo el corredor"
					title="Ver todo el corredor"
					onClick={() => mapRef.current && fitCorridor(mapRef.current, data)}
				>
					<Scan size={22} strokeWidth={1.75} aria-hidden="true" />
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
				<button
					type="button"
					className="q-fab"
					aria-label="Leyenda del mapa"
					title="Leyenda del mapa"
					aria-expanded={legendOpen}
					aria-controls="corridor-legend"
					onClick={() => setLegendOpen((open) => !open)}
				>
					<MapPinned size={22} strokeWidth={1.75} aria-hidden="true" />
				</button>
				<MapLegend open={legendOpen} onClose={() => setLegendOpen(false)} />
			</div>

			<div className="corridor-app__detail">
				{/* Hidden, not unmounted, so the conversation survives "Ver en el mapa". */}
				<div hidden={!guideOpen}>
					<GuidePanel
						onShowOnMap={showDestination}
						onClose={() => setGuideOpen(false)}
						onReportSaved={(reportId) =>
							void publish({ type: "cobro_abusivo", reportId })
						}
					/>
				</div>
				{!guideOpen &&
					(detail ? (
						<DetailCard
							detail={detail}
							source={source}
							onClose={() => setSelected(null)}
							onOpenGuide={() => setGuideOpen(true)}
						/>
					) : (
						<RouteCard
							stops={stops}
							query={query}
							onQueryChange={setQuery}
							plan={plan}
							loading={loading}
							error={error}
							alert={<FloodAlertBanner alert={flood.alert} />}
							onOpenGuide={() => setGuideOpen(true)}
						/>
					))}
			</div>

			{/* Mount point for NoticeSlot and ArroyoModal: at the root, above card, Guide and detail. */}
			{notices && <div className="corridor-app__notices">{notices}</div>}
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
	{ key: "route", swatch: "route", label: "Ruta recomendada" },
	{ key: "corridor", swatch: "corridor", label: "Corredor piloto" },
	{ key: "stop", swatch: "stop", label: "Paradero", Icon: BusFront },
	{
		key: "arroyo",
		swatch: "arroyo",
		label: "Arroyo activo",
		Icon: TriangleAlert,
	},
	{ key: "risk", swatch: "risk", label: "Arroyo con riesgo", Icon: Droplet },
	{ key: "business", swatch: "business", label: "Negocio abierto" },
	{ key: "user", swatch: "user", label: "Estás aquí" },
] as const;

/** What each line, colour and pin means, always with a word next to it. */
function MapLegend({ open, onClose }: { open: boolean; onClose: () => void }) {
	return (
		<section
			id="corridor-legend"
			className="q-card q-card--raised corridor-legend"
			aria-labelledby="corridor-legend-title"
			hidden={!open}
		>
			<div className="corridor-legend__head">
				<h2 id="corridor-legend-title" className="corridor-legend__title">
					Qué ves en el mapa
				</h2>
				<button
					type="button"
					className="q-btn q-btn--ghost q-btn--icon"
					aria-label="Cerrar la leyenda"
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
						{item.label}
					</li>
				))}
			</ul>
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
	if (!online) {
		return (
			<div className="corridor-status corridor-status--note">
				<div className="q-state q-state--offline" role="status">
					<span className="q-state__glyph">
						<WifiOff size={22} strokeWidth={1.75} aria-hidden="true" />
					</span>
					<div>
						<p className="q-state__title">Sin conexión</p>
						<p className="q-state__text">
							Paraderos y arroyos siguen a la vista. El fondo del mapa puede
							verse incompleto.
						</p>
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
						<p className="q-state__title">No pudimos cargar el mapa</p>
						<p className="q-state__text">
							Revisa tu señal e inténtalo otra vez. El Guía sigue disponible.
						</p>
						<div className="corridor-status__actions">
							<button
								type="button"
								className="q-btn q-btn--primary"
								onClick={onRetry}
							>
								<RefreshCw size={18} strokeWidth={1.75} aria-hidden="true" />
								Reintentar
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
								Pregúntale al Guía
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
						<p className="q-state__title">Cargando el mapa</p>
						<p className="q-state__text">Revisamos rutas, tarifas y arroyos.</p>
					</div>
				</div>
			</div>
		);
	}
	return null;
}
