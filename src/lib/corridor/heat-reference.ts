// Heat layer data for "Rutas frescas" (#46): the cited figure, the relative heat
// level of each corridor zone and the stops where a visitor can cool down.

import type { CorridorStop, CorridorZone } from "./corridor-types";

/**
 * Verified figure (docs/04-cifras-verificadas.md): the south (strata 1 to 3) registers
 * up to 5 °C more surface temperature than the north (strata 4 to 6).
 */
export const HEAT_FIGURE = {
	maxDeltaCelsius: 5,
	citation: "Núñez, Hoyos y Arellana, Urban Climate, vol. 52 (2023)",
	shortCitation: "Urban Climate, 2023",
	url: "https://doi.org/10.1016/j.uclim.2023.101757",
} as const;

export type HeatLevel = "hotter" | "middle" | "cooler";

/**
 * Reference data, not a measurement per zone: the study's south-north contrast laid
 * over the corridor, from the stadium (far south) to the Gran Malecón (north).
 */
export const ZONE_HEAT: Record<CorridorZone, HeatLevel> = {
	estadio: "hotter",
	troncal_murillo: "hotter",
	centro: "middle",
	barrio_abajo: "middle",
	gran_malecon: "cooler",
};

export interface CoolPoint {
	code: string;
	name: string;
	latitude: number;
	longitude: number;
	shade: boolean;
	water: boolean;
}

/** Stops with shade or a water point (stops.has_shade, stops.has_hydration). */
export function coolPoints(stops: CorridorStop[]): CoolPoint[] {
	return stops
		.filter((stop) => stop.has_shade || stop.has_hydration)
		.map((stop) => ({
			code: stop.code,
			name: stop.name,
			latitude: stop.latitude,
			longitude: stop.longitude,
			shade: stop.has_shade,
			water: stop.has_hydration,
		}));
}
