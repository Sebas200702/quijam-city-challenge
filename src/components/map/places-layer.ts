// "Lugares" on /mapa (docs/30, U07): the places catalog, from the same community
// store /lugares reads (Supabase, or this device without it).

import { MapPin } from "lucide-react";
import { PLACE_KIND_LABELS } from "../../lib/community/community-labels";
import { getCommunityStore } from "../../lib/community/community-store";
import type { MapPoint, PointLayer } from "./map-layer-registry";

export const placesLayer: PointLayer = {
	key: "places",
	urlParam: "lugar",
	tone: "green",
	glyph: "place",
	Icon: MapPin,
	label: (t) => t.map.metro.layerPlaces,
	pinTitle: (t, point) => t.map.metro.pinPlace(point.name),
	openLabel: (t) => t.map.metro.openPlace,
	load: async () => {
		const places = await getCommunityStore().listPlaces();
		return places.map(
			(place): MapPoint => ({
				id: place.slug,
				lat: place.latitude,
				lng: place.longitude,
				name: place.name,
				eyebrow: `${PLACE_KIND_LABELS[place.kind]} · ${place.neighborhood}`,
				description: place.description,
				href: `/lugares/${encodeURIComponent(place.slug)}`,
			}),
		);
	},
};
