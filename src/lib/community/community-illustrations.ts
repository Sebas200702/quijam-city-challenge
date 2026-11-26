// Illustration for each kind of place and event category (unDraw, brand gold).

import type { EventCategory, PlaceKind } from "./community-types";

const path = (name: string) => `/illustrations/${name}.svg`;

export const PLACE_ILLUSTRATIONS: Record<PlaceKind, string> = {
	nature: path("among-nature"),
	park: path("through-the-park"),
	waterfront: path("walking-together"),
	culture: path("celebration"),
	heritage: path("walking"),
	sport: path("match"),
};

export const EVENT_ILLUSTRATIONS: Record<EventCategory, string> = {
	culture: path("celebration"),
	music: path("audio-conversation"),
	nature: path("among-nature"),
	sport: path("match"),
	volunteer: path("walking-together"),
	food: path("food"),
	learning: path("publish-post"),
	community: path("neighbors"),
};
