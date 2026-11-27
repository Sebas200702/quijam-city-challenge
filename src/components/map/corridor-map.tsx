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
import { useEffect, useMemo, useRef, useState } from "react";
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
import { coolPoints } from "../../lib/corridor/heat-reference";
import { useT } from "../../lib/i18n/use-language";
import type { VisitorContext } from "../../lib/notices/notice-types";
import { prefersReducedMotion } from "../../lib/reduced-motion";
import { DESTINATIONS, type DestinationKey } from "../../lib/trip/trip-planner";
import { GuidePanel } from "../guide/guide-panel";
import { NoticeSlot } from "../notices/notice-slot";
import "./corridor-map.css";
import { HostArrivalNotice } from "../host/host-arrival-notice";
import { BusinessExtras } from "./business-extras";
import { DetailCard } from "./detail-card";
import { useHeatLayer } from "./heat-layer";
import { HeatChip, HeatLegend, HeatNote } from "./heat-ui";
import { MapHeader, type Theme } from "./map-header";
import {
	buildCorridorLayers,
	type CorridorLayers,
	FLOOD_HATCH_ID,
	floodCircle,
	type LayerKey,
	relabelPins,
	routeLine,
} from "./map-layers";
import { pinIcon, setMarkerSelected, userIcon } from "./map-markers";
import { createMetroMap, metroTileLayer } from "./metro-frame";
import { RouteCard } from "./route-card";
import { StopList } from "./stop-list";
import { useFloodCountdown } from "./use-flood-countdown";
import { useFloodNotice } from "./use-flood-notice";
import { useLiveBusinesses } from "./use-live-businesses";
import { type RouteQuery, useRoutePlan } from "./use-route-plan";

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

interface CorridorMapProps {
	data: CorridorData;
	source: CorridorDataSource;
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
	const t = useT().map;
	// The map's effects read the language through a ref, so a change relabels the pins
	// without building the map again.
	const tRef = useRef(t);
	tRef.current = t;
	const containerRef = useRef<HTMLElement>(null);
	const mapRef = useRef<L.Map | null>(null);
	const layersRef = useRef<CorridorLayers | null>(null);
	const [selected, setSelected] = useState<Selection | null>(null);
	const [guideOpen, setGuideOpen] = useState(false);
	const guideRef = useRef<HTMLDivElement>(null);
	/** What had focus when the Guide opened, to give it back on close. */
	const guideOpenerRef = useRef<HTMLElement | null>(null);
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
		() => searchablePoints(data).map((point) => point.name),
		[data],
	);
	const [visible, setVisible] = useState<Record<LayerKey, boolean>>({
		stops: true,
		floodZones: true,
		businesses: true,
	});
	/** "Calor y sombra" (#46): off until the visitor turns it on. */
	const [heatOn, setHeatOn] = useState(false);
	const coolCount = useMemo(() => coolPoints(data.stops).length, [data.stops]);

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
	// "You are here": the trip's origin stands in for the visitor's position (no GPS in the pilot).
	const origin = data.stops.find((stop) => stop.code === query.origin) ?? null;
	const destination =
		data.stops.find((stop) => stop.code === query.destination) ?? null;
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

	// /mapa?negocio=<code> (the vendor's "Cómo te ven") opens that business's card.
	useEffect(() => {
		const code = new URLSearchParams(window.location.search).get("negocio");
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
				setSelected(selection);
				const marker = layersRef.current?.markers.get(selectionKey(selection));
				if (marker) map.panInside(marker.getLatLng(), overlayPadding(map));
			},
			tRef.current,
		);
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

	// Show or hide each layer, then mark the selected marker again: Leaflet
	// rebuilds a marker's element when its layer comes back (and when a new language relabels it).
	// biome-ignore lint/correctness/useExhaustiveDependencies: `t` re-marks the pin after relabelPins replaced its icon.
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
	}, [visible, selected, t, live]);

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

	// Focus follows the Guide: into its heading on open, back to what opened it on close
	// (or to a visible "Ask" button when that one is gone), unless something else took it.
	const guideWasOpen = useRef(false);
	useEffect(() => {
		const guide = guideRef.current;
		if (guideOpen) {
			guide?.querySelector<HTMLElement>("h2[tabindex]")?.focus();
		} else if (guideWasOpen.current) {
			const active = document.activeElement;
			const lost =
				!active || active === document.body || guide?.contains(active);
			if (lost) {
				const visible = (el: HTMLElement | null | undefined) =>
					el?.isConnected && el.getClientRects().length > 0 ? el : null;
				const root = guide?.closest(".corridor-app");
				(
					visible(guideOpenerRef.current) ??
					visible(root?.querySelector<HTMLElement>(".corridor-guide-button")) ??
					visible(root?.querySelector<HTMLElement>(".route-card__guide button"))
				)?.focus();
			}
		}
		guideWasOpen.current = guideOpen;
	}, [guideOpen]);

	const openGuide = () => {
		guideOpenerRef.current =
			document.activeElement instanceof HTMLElement
				? document.activeElement
				: null;
		setGuideOpen(true);
	};

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
					}}
					onToggle={toggleLayer}
					source={source}
				>
					<HeatChip
						on={heatOn}
						count={coolCount}
						onToggle={() => setHeatOn((on) => !on)}
					/>
				</MapHeader>
				<button
					type="button"
					className="q-btn q-btn--primary corridor-guide-button"
					aria-expanded={guideOpen}
					onClick={openGuide}
				>
					<MessageCircle size={20} strokeWidth={1.75} aria-hidden="true" />
					{t.askGuide}
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
				{/* Hidden, not unmounted, so the conversation survives "Ver en el mapa". */}
				<div ref={guideRef} hidden={!guideOpen}>
					<GuidePanel
						onShowOnMap={showDestination}
						onClose={() => setGuideOpen(false)}
						routeQuestion={
							origin && destination
								? t.askRoutePrompt(origin.name, destination.name)
								: undefined
						}
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
							onOpenGuide={openGuide}
						>
							{selectedBusiness && (
								<BusinessExtras
									code={selectedBusiness.code}
									isOpen={selectedBusiness.is_open}
								/>
							)}
						</DetailCard>
					) : (
						<RouteCard
							stops={stops}
							query={query}
							onQueryChange={setQuery}
							plan={plan}
							loading={loading}
							error={error}
							alert={floodNotice.band}
							onOpenGuide={openGuide}
						/>
					))}
			</div>

			{/* Notices and the arroyo modal live at the root, above the card, the Guide and the
			    detail, so a safety alert is never hidden (epic #57, rules 3 and 4). */}
			<div className="corridor-app__notices">
				<NoticeSlot
					queue={floodNotice.queue}
					onAction={(_notice, actionId) => {
						// "Cambiar ruta": the Decider already re-planned without the arroyo; show it.
						if (actionId !== "change-route") return;
						setGuideOpen(false);
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
