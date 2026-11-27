// A small, still map of one public point (an event, a place, a conversation) with a
// way into /mapa (docs/30, U08 and U37). Same AMB frame as every other map; it does
// not move under the finger, so it never traps a scroll on a phone.
// Load it with React.lazy: it brings Leaflet with it.

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Map as MapIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import type { StatusTone } from "../../lib/corridor/corridor-types";
import { ambAnchor } from "../../lib/geo/amb-boundary";
import { useT } from "../../lib/i18n/use-language";
import { type PinGlyph, pinIcon } from "./map-markers";
import { createMetroMap, metroTileLayer } from "./metro-frame";
import "./point-picker.css";

export interface MiniMapProps {
	latitude: number;
	longitude: number;
	/** Name of what the point is; also the pin's label. */
	name: string;
	/** /mapa link that selects the point ("Ver en el mapa"). */
	href: string;
	tone?: StatusTone;
	glyph?: PinGlyph;
}

const ZOOM = 15;

export default function MiniMap({
	latitude,
	longitude,
	name,
	href,
	tone = "gold",
	glyph = "place",
}: MiniMapProps) {
	const t = useT();
	const containerRef = useRef<HTMLDivElement>(null);
	// A pier or a lagoon sits on the water: its pin goes to the nearest shore.
	const anchor = ambAnchor(latitude, longitude);
	const lat = anchor?.[0];
	const lng = anchor?.[1];

	useEffect(() => {
		const container = containerRef.current;
		if (!container || lat === undefined || lng === undefined) return;
		const map = createMetroMap(container, {
			zoomControl: false,
			attributionControl: true,
			dragging: false,
			touchZoom: false,
			scrollWheelZoom: false,
			doubleClickZoom: false,
			boxZoom: false,
			keyboard: false,
		});
		metroTileLayer({ crossOrigin: true }).addTo(map);
		map.setView([lat, lng], ZOOM, { animate: false });
		L.marker([lat, lng], {
			icon: pinIcon({ tone, glyph, label: name }),
			interactive: false,
			keyboard: false,
		}).addTo(map);
		return () => {
			map.remove();
		};
	}, [lat, lng, name, tone, glyph]);

	if (!anchor) return null;
	return (
		<figure className="mini-map">
			<div
				ref={containerRef}
				className="mini-map__map"
				role="img"
				aria-label={t.geo.minimap.label(name)}
			/>
			<figcaption className="mini-map__foot">
				<a href={href} className="q-btn q-btn--secondary q-btn--sm min-h-11!">
					<MapIcon size={16} aria-hidden="true" />
					{t.geo.minimap.viewOnMap}
				</a>
			</figcaption>
		</figure>
	);
}
