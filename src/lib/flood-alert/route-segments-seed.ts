// Local copy of the route_segments rows in supabase/seed.sql (simulated 2034 data).
// Keep it in sync with the seed file.

export type SegmentMode =
	| "walk"
	| "bus"
	| "transmetro"
	| "taxi_verified"
	| "bike";

export interface RouteSegment {
	code: string;
	from: string;
	to: string;
	mode: SegmentMode;
	minutes: number;
	fareCop: number;
	accessible: boolean;
	/** Flood zone ("arroyo") the segment crosses, if any. */
	floodZoneCode: string | null;
}

export const ROUTE_SEGMENTS: RouteSegment[] = [
	{
		code: "SEG-MAL-BAR-WALK",
		from: "STOP-MALECON-SUR",
		to: "STOP-BARRIO-ABAJO",
		mode: "walk",
		minutes: 20,
		fareCop: 0,
		accessible: true,
		floodZoneCode: null,
	},
	{
		code: "SEG-MAL-CEN-TAXI",
		from: "STOP-MALECON-SUR",
		to: "STOP-CENTRO",
		mode: "taxi_verified",
		minutes: 12,
		fareCop: 12000,
		accessible: true,
		floodZoneCode: "ARR-VIA-40",
	},
	{
		code: "SEG-BAR-CEN-WALK",
		from: "STOP-BARRIO-ABAJO",
		to: "STOP-CENTRO",
		mode: "walk",
		minutes: 11,
		fareCop: 0,
		accessible: true,
		floodZoneCode: "ARR-BARRIO-ABAJO",
	},
	{
		code: "SEG-CEN-MUR46-BUS",
		from: "STOP-CENTRO",
		to: "STOP-MURILLO-46",
		mode: "bus",
		minutes: 10,
		fareCop: 3500,
		accessible: false,
		floodZoneCode: "ARR-FELICIDAD",
	},
	{
		code: "SEG-MUR46-EST-TM",
		from: "STOP-MURILLO-46",
		to: "STOP-ESTADIO",
		mode: "transmetro",
		minutes: 22,
		fareCop: 3500,
		accessible: true,
		floodZoneCode: null,
	},
	{
		code: "SEG-MAL-EST-TM-GREEN",
		from: "STOP-MALECON-SUR",
		to: "STOP-ESTADIO",
		mode: "transmetro",
		minutes: 38,
		fareCop: 3500,
		accessible: true,
		floodZoneCode: null,
	},
	{
		code: "SEG-MAL-EST-TAXI",
		from: "STOP-MALECON-SUR",
		to: "STOP-ESTADIO",
		mode: "taxi_verified",
		minutes: 28,
		fareCop: 24000,
		accessible: true,
		floodZoneCode: "ARR-MURILLO-46",
	},
	{
		code: "SEG-MURSUR-EST-BIKE",
		from: "STOP-MURILLO-SUR",
		to: "STOP-ESTADIO",
		mode: "bike",
		minutes: 9,
		fareCop: 0,
		accessible: false,
		floodZoneCode: null,
	},
];
