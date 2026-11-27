// Spanish labels that src/lib/corridor builds (statuses, stop types, zones,
// categories), read back by their text to pick the translated word. The lib
// stays as it is; the components show the translation.

import {
	STOP_TYPE_LABELS,
	ZONE_LABELS,
} from "../../lib/corridor/corridor-selection";
import type {
	BusinessCategory,
	CorridorZone,
	StopType,
} from "../../lib/corridor/corridor-types";
import type { MapMessages } from "../../lib/i18n/dictionaries/map";

/** Spanish business-category labels from corridor-selection, to their keys. */
export const CATEGORY_BY_LABEL: Record<string, BusinessCategory> = {
	"Comida popular": "food_popular",
	Artesanías: "crafts",
	Cultura: "culture",
	"Evento ambiental": "eco_event",
	Café: "coffee",
};

export const STOP_TYPE_BY_LABEL = Object.fromEntries(
	Object.entries(STOP_TYPE_LABELS).map(([key, label]) => [label, key]),
) as Record<string, StopType>;

export const ZONE_BY_LABEL = Object.fromEntries(
	Object.entries(ZONE_LABELS).map(([key, label]) => [label, key]),
) as Record<string, CorridorZone>;

/** Translates a Spanish status word ("Accesible", "Riesgo alto", "Abierto"...). */
export function statusWord(t: MapMessages, label: string): string {
	return (t.statusWords as Record<string, string>)[label] ?? label;
}

/** Translates a Spanish fact label ("Tipo", "Zona", "Categoría", "Radio"). */
export function factLabel(t: MapMessages, label: string): string {
	return (t.factLabels as Record<string, string>)[label] ?? label;
}
