// Shows the map's pins through clusterPins (src/lib/map/pin-clusters.ts): below
// CLUSTER_MAX_ZOOM, pins that would overlap become one numbered circle; tapping it
// zooms in. Our own few dozen lines instead of Leaflet.markercluster: no extra CSS or
// animation to undo, and the circles follow the QUILLART tokens and labels (U32).

import L from "leaflet";
import type { StatusTone } from "../../lib/corridor/corridor-types";
import { clusterPins } from "../../lib/map/pin-clusters";
import { clusterIcon } from "./map-markers";

/** From this zoom on every pin stands alone (docs/30, U32: "por debajo del zoom 15"). */
export const CLUSTER_MAX_ZOOM = 15;
/** Two 44 px pins closer than this would cover each other. */
const CLUSTER_RADIUS_PX = 40;

export interface ClusterEntry {
	marker: L.Marker;
	/** Layer key ("stops", "places"…): hidden layers leave the clustering. */
	group: string;
}

export interface PinClustererOptions {
	/** Colour of a group's ring when all its pins are of one layer. */
	toneOf: (group: string) => StatusTone;
	/** Accessible name of a group, e.g. "4 puntos: Paraderos 3, Lugares 1. Acercar". */
	describe: (count: number, groups: Record<string, number>) => string;
	/** Moves the camera; the map keeps the point clear of its floating cards. */
	zoomTo: (center: L.LatLng, zoom: number) => void;
	/** After every redraw: Leaflet rebuilds a marker's element when it comes back. */
	onRender?: () => void;
}

export class PinClusterer {
	private readonly pins = L.layerGroup();
	private readonly groups = L.layerGroup();
	private shown = new Set<L.Marker>();
	private entries = new Map<string, ClusterEntry>();
	private visible = new Set<string>();
	private pinned: string | null = null;

	constructor(
		private readonly map: L.Map,
		private readonly options: PinClustererOptions,
	) {
		this.pins.addTo(map);
		this.groups.addTo(map);
		map.on("zoomend", this.refresh);
	}

	/** Adds or replaces pins; pins of the same key are swapped in place. */
	set(entries: Iterable<[string, ClusterEntry]>): void {
		for (const [key, entry] of entries) {
			const previous = this.entries.get(key);
			if (previous && previous.marker !== entry.marker) {
				this.pins.removeLayer(previous.marker);
				this.shown.delete(previous.marker);
			}
			this.entries.set(key, entry);
		}
		this.refresh();
	}

	get(key: string): L.Marker | undefined {
		return this.entries.get(key)?.marker;
	}

	keys(): IterableIterator<[string, ClusterEntry]> {
		return this.entries.entries();
	}

	setVisibleGroups(groups: Iterable<string>): void {
		this.visible = new Set(groups);
		this.refresh();
	}

	/** The selected pin never hides inside a group. */
	setPinned(key: string | null): void {
		if (key === this.pinned) return;
		this.pinned = key;
		this.refresh();
	}

	destroy(): void {
		this.map.off("zoomend", this.refresh);
		this.pins.remove();
		this.groups.remove();
	}

	readonly refresh = (): void => {
		const candidates = [...this.entries].filter(([, entry]) =>
			this.visible.has(entry.group),
		);
		const zoom = this.map.getZoom();
		const items = candidates.map(([key, entry]) => {
			const point = this.map.latLngToLayerPoint(entry.marker.getLatLng());
			return { key, x: point.x, y: point.y, group: entry.group };
		});
		const clusters =
			zoom >= CLUSTER_MAX_ZOOM
				? items.map((item) => ({
						keys: [item.key],
						x: item.x,
						y: item.y,
						groups: { [item.group]: 1 },
					}))
				: clusterPins(
						items,
						CLUSTER_RADIUS_PX,
						this.pinned ? new Set([this.pinned]) : undefined,
					);

		const next = new Set<L.Marker>();
		this.groups.clearLayers();
		for (const cluster of clusters) {
			if (cluster.keys.length === 1) {
				const marker = this.entries.get(cluster.keys[0])?.marker;
				if (marker) next.add(marker);
				continue;
			}
			this.groups.addLayer(this.groupMarker(cluster.keys, cluster.groups));
		}
		for (const marker of this.shown) {
			if (!next.has(marker)) this.pins.removeLayer(marker);
		}
		for (const marker of next) {
			if (!this.shown.has(marker)) this.pins.addLayer(marker);
		}
		this.shown = next;
		this.options.onRender?.();
	};

	private groupMarker(
		keys: string[],
		groups: Record<string, number>,
	): L.Marker {
		const members = keys.flatMap((key) => {
			const marker = this.entries.get(key)?.marker;
			return marker ? [marker.getLatLng()] : [];
		});
		const bounds = L.latLngBounds(members);
		const kinds = Object.keys(groups);
		const tone = kinds.length === 1 ? this.options.toneOf(kinds[0]) : "neutral";
		const title = this.options.describe(keys.length, groups);
		const zoomIn = () => this.zoomInto(bounds);
		const marker = L.marker(bounds.getCenter(), {
			icon: clusterIcon({ count: keys.length, tone }),
			title,
			// Above the single pins next to it, so the number is never covered.
			zIndexOffset: 400,
		})
			.on("add", () => marker.getElement()?.setAttribute("aria-label", title))
			.on("click", zoomIn)
			.on("keydown", (event) => {
				const { originalEvent } = event as L.LeafletKeyboardEvent;
				if (originalEvent.key !== "Enter" && originalEvent.key !== " ") return;
				originalEvent.preventDefault();
				zoomIn();
			});
		return marker;
	}

	/** Zooms until the group opens up: two steps, or straight to where pins stand alone. */
	private zoomInto(bounds: L.LatLngBounds): void {
		const fit = this.map.getBoundsZoom(bounds.pad(0.5), false);
		const zoom = Math.min(
			CLUSTER_MAX_ZOOM,
			Math.max(fit, this.map.getZoom() + 2),
		);
		this.options.zoomTo(bounds.getCenter(), zoom);
	}
}
