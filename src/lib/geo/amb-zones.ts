// Coarse zones of the Metropolitan Area a person can give as "their neighborhood"
// (docs/30, U36): the five localities of Barranquilla and the other four
// municipalities. A zone is deliberately wide, so it never says where someone lives.
// Same list as public.is_amb_zone() in the database (20261129000002_community_points).
// The centre is approximate and only good for "near you" sorting, never for a pin.

import type { LatLngPair, MunicipalityKey } from "./amb-boundary";

export type AmbZoneKey =
	| "barranquilla-riomar"
	| "barranquilla-norte-centro"
	| "barranquilla-suroccidente"
	| "barranquilla-suroriente"
	| "barranquilla-metropolitana"
	| "soledad"
	| "malambo"
	| "puerto-colombia"
	| "galapa";

export interface AmbZone {
	key: AmbZoneKey;
	/** Proper name, the same in every language. */
	name: string;
	municipality: MunicipalityKey;
	center: LatLngPair;
}

export const AMB_ZONES: readonly AmbZone[] = [
	{
		key: "barranquilla-riomar",
		name: "Riomar",
		municipality: "barranquilla",
		center: [11.012, -74.823],
	},
	{
		key: "barranquilla-norte-centro",
		name: "Norte-Centro Histórico",
		municipality: "barranquilla",
		center: [10.993, -74.799],
	},
	{
		key: "barranquilla-suroccidente",
		name: "Suroccidente",
		municipality: "barranquilla",
		center: [10.958, -74.822],
	},
	{
		key: "barranquilla-suroriente",
		name: "Suroriente",
		municipality: "barranquilla",
		center: [10.957, -74.79],
	},
	{
		key: "barranquilla-metropolitana",
		name: "Metropolitana",
		municipality: "barranquilla",
		center: [10.935, -74.812],
	},
	{
		key: "soledad",
		name: "Soledad",
		municipality: "soledad",
		center: [10.911, -74.785],
	},
	{
		key: "malambo",
		name: "Malambo",
		municipality: "malambo",
		center: [10.86, -74.775],
	},
	{
		key: "puerto-colombia",
		name: "Puerto Colombia",
		municipality: "puertoColombia",
		center: [10.988, -74.955],
	},
	{
		key: "galapa",
		name: "Galapa",
		municipality: "galapa",
		center: [10.897, -74.884],
	},
];

export function isAmbZone(value: unknown): value is AmbZoneKey {
	return AMB_ZONES.some((zone) => zone.key === value);
}

/** The zone of a stored neighborhood, or null for an old free-text value. */
export function ambZone(value: string | null | undefined): AmbZone | null {
	return AMB_ZONES.find((zone) => zone.key === value) ?? null;
}

/** What to show for a stored neighborhood: the zone name, or the old text as it was. */
export function neighborhoodLabel(value: string | null | undefined): string {
	return ambZone(value)?.name ?? value?.trim() ?? "";
}
