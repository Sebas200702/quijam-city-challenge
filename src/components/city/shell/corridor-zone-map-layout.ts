import type { CorridorZone } from "../../../lib/city-dashboard-types";

// Stylized pilot corridor, not to scale. viewBox 30 30 370 740: Estadio at the
// bottom (south), Gran Malecón at the top next to the Magdalena river (east).
// Codes match supabase/seed.sql.

export const MAP_VIEW_BOX = "30 30 370 740";

export interface MapPoint {
	x: number;
	y: number;
}

export const MAP_STOPS: (MapPoint & {
	code: string;
	name: string;
	side: "l" | "r" | "b";
})[] = [
	{
		code: "STOP-MALECON-NORTE",
		x: 250,
		y: 80,
		name: "Puerta de Oro",
		side: "l",
	},
	{ code: "STOP-MALECON-SUR", x: 300, y: 175, name: "Gran Malecón", side: "b" },
	{
		code: "STOP-BARRIO-ABAJO",
		x: 200,
		y: 250,
		name: "Barrio Abajo",
		side: "l",
	},
	{ code: "STOP-CENTRO", x: 250, y: 340, name: "Centro", side: "r" },
	{ code: "STOP-MURILLO-46", x: 210, y: 450, name: "La Arenosa", side: "l" },
	{
		code: "STOP-MURILLO-SUR",
		x: 170,
		y: 590,
		name: "Joaquín Barrios Polo",
		side: "l",
	},
	{
		code: "STOP-ESTADIO",
		x: 120,
		y: 710,
		name: "Estadio Metropolitano",
		side: "r",
	},
];

export const MAP_FLOODS: Record<string, MapPoint & { r: number }> = {
	"ARR-VIA-40": { x: 276, y: 130, r: 20 },
	"ARR-BARRIO-ABAJO": { x: 228, y: 293, r: 20 },
	"ARR-FELICIDAD": { x: 236, y: 390, r: 24 },
	"ARR-MURILLO-46": { x: 194, y: 495, r: 24 },
};

export const MAP_ZONES: Record<
	CorridorZone,
	MapPoint & { wordDx: number; wordDy: number }
> = {
	gran_malecon: { x: 285, y: 128, wordDx: 22, wordDy: -52 },
	barrio_abajo: { x: 175, y: 232, wordDx: 0, wordDy: -50 },
	centro: { x: 262, y: 330, wordDx: 0, wordDy: 58 },
	troncal_murillo: { x: 200, y: 520, wordDx: 0, wordDy: -50 },
	estadio: { x: 125, y: 700, wordDx: 0, wordDy: -50 },
};

export const MAP_RIVER =
	"M290 -400 L290 0 C 296 50 312 120 330 170 C 348 230 352 290 362 350 C 374 430 392 560 410 650 C 420 720 430 780 440 1200 L 1200 1200 L 1200 -400 Z";

export const MAP_MAJOR_ROADS = [
	"M40 1500 L120 710 L170 590 L210 450 L250 340",
	"M150 -700 L250 80 L300 175 L345 300 L360 470 L380 620 L405 900 L420 1500",
	"M360 470 L170 590",
	"M300 175 L200 250 L250 340",
];

export const MAP_MINOR_ROADS = [
	"M-900 120 L250 80",
	"M-900 230 L200 250",
	"M-900 360 L250 340",
	"M-900 470 L210 450",
	"M-900 600 L170 590",
	"M-900 730 L120 710 L330 760",
	"M20 -700 L120 300 L180 1500",
	"M140 -700 L170 300 L100 1500",
	"M250 340 L330 400",
	"M210 450 L340 520",
	"M170 590 L60 520",
	"M200 250 L120 150",
	"M250 340 L300 260",
];

export const MAP_PARKS = [
	"M70 735 C 70 700 100 680 135 690 C 160 700 165 740 140 760 C 115 780 75 770 70 735 Z",
	"M268 352 C 268 344 276 338 284 340 C 292 343 294 352 288 358 C 280 364 270 360 268 352 Z",
	"M300 205 C 310 196 326 198 330 210 C 334 222 322 232 312 228 C 302 224 296 214 300 205 Z",
];

/** Deterministic pseudo-random sequence so crowd dots do not jump between renders. */
export function seededRandom(seed: number): () => number {
	let state = seed;
	return () => {
		state = (state * 9301 + 49297) % 233280;
		return state / 233280;
	};
}
