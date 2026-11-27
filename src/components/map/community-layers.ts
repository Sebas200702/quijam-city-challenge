// "Eventos" and "Comunidad" on /mapa (docs/30, U08 and §6.4): upcoming published
// events and forum conversations that carry a point (their own, or their catalog
// place's). Points are always public places, never where a person is.

import { CalendarDays, MessageCircle } from "lucide-react";
import { pointOf } from "../../lib/community/community-geo";
import {
	EVENT_CATEGORY_LABELS,
	FORUM_CATEGORY_LABELS,
	formatEventDay,
	formatTime,
} from "../../lib/community/community-labels";
import { getCommunityStore } from "../../lib/community/community-store";
import type { Place } from "../../lib/community/community-types";
import type { MapPoint, PointLayer } from "./map-layer-registry";

async function placesById(): Promise<Map<string, Place>> {
	const places = await getCommunityStore()
		.listPlaces()
		.catch(() => []);
	return new Map(places.map((place) => [place.id, place]));
}

export const eventsLayer: PointLayer = {
	key: "events",
	urlParam: "evento",
	tone: "gold",
	glyph: "event",
	Icon: CalendarDays,
	label: (t) => t.geo.layers.events,
	pinTitle: (t, point) => t.geo.layers.pinEvent(point.name),
	openLabel: (t) => t.geo.layers.openEvent,
	load: async () => {
		const [events, places] = await Promise.all([
			getCommunityStore().listEvents(),
			placesById(),
		]);
		const points: MapPoint[] = [];
		for (const event of events) {
			if (event.status !== "published") continue;
			if (event.moderationStatus !== "published") continue;
			const place = event.placeId ? places.get(event.placeId) : undefined;
			const point = pointOf(event, place);
			if (!point) continue;
			points.push({
				id: event.id,
				lat: point.latitude,
				lng: point.longitude,
				name: event.title,
				eyebrow: `${EVENT_CATEGORY_LABELS[event.category]} · ${formatEventDay(event.startsAt)} ${formatTime(event.startsAt)}`,
				description: place?.name ?? event.locationText ?? undefined,
				href: `/agenda/${encodeURIComponent(event.id)}`,
			});
		}
		return points;
	},
};

export const communityLayer: PointLayer = {
	key: "threads",
	urlParam: "conversacion",
	tone: "neutral",
	glyph: "chat",
	Icon: MessageCircle,
	label: (t) => t.geo.layers.community,
	pinTitle: (t, point) => t.geo.layers.pinThread(point.name),
	openLabel: (t) => t.geo.layers.openThread,
	load: async (t) => {
		const [threads, places] = await Promise.all([
			getCommunityStore().listThreads({ limit: 200 }),
			placesById(),
		]);
		const points: MapPoint[] = [];
		for (const thread of threads) {
			if (thread.moderationStatus !== "published") continue;
			const place = thread.placeId ? places.get(thread.placeId) : undefined;
			const point = pointOf(thread, place);
			if (!point) continue;
			// A citizen report the city has not confirmed says so (docs/30, U16).
			const status =
				thread.category === "safety"
					? thread.cityVerified
						? t.geo.layers.confirmed
						: t.geo.layers.unconfirmed
					: null;
			points.push({
				id: thread.id,
				lat: point.latitude,
				lng: point.longitude,
				name: thread.title,
				eyebrow: [FORUM_CATEGORY_LABELS[thread.category], status]
					.filter(Boolean)
					.join(" · "),
				description: place?.name,
				href: `/foro/${encodeURIComponent(thread.id)}`,
			});
		}
		return points;
	},
};
