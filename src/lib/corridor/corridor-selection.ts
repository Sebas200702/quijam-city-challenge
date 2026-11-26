// What the detail card shows for the point selected on the map.

import {
	businessStatus,
	CORRIDOR_STOP_ORDER,
	floodZoneStatus,
	type ServiceKey,
	stopServices,
} from "./corridor-geometry";
import type {
	BusinessCategory,
	CorridorData,
	CorridorStop,
	CorridorZone,
	MapStatus,
	StopType,
} from "./corridor-types";

export type SelectionKind = "stop" | "floodZone" | "business";

export interface Selection {
	kind: SelectionKind;
	code: string;
}

export interface SelectionDetail {
	kind: SelectionKind;
	title: string;
	/** Short context line: type and zone. */
	eyebrow: string;
	status: MapStatus;
	description: string | null;
	facts: { label: string; value: string }[];
	services: ServiceKey[];
	simulated: boolean;
}

export const ZONE_LABELS: Record<CorridorZone, string> = {
	estadio: "Estadio",
	troncal_murillo: "Troncal Murillo",
	centro: "Centro",
	barrio_abajo: "Barrio Abajo",
	gran_malecon: "Gran Malecón",
};

export const STOP_TYPE_LABELS: Record<StopType, string> = {
	transmetro: "Transmetro",
	bus_stop: "Paradero de bus",
	qr_point: "Punto QR",
	host_hub: "Punto de anfitriones",
};

const CATEGORY_LABELS: Record<BusinessCategory, string> = {
	food_popular: "Comida popular",
	crafts: "Artesanías",
	culture: "Cultura",
	eco_event: "Evento ambiental",
	coffee: "Café",
};

export function selectionKey(selection: Selection): string {
	return `${selection.kind}:${selection.code}`;
}

/** Stops in corridor order (Estadio first); stops outside the corridor order go last. */
export function orderedStops(stops: CorridorStop[]): CorridorStop[] {
	const rank = (code: string) => {
		const index = (CORRIDOR_STOP_ORDER as readonly string[]).indexOf(code);
		return index === -1 ? Number.MAX_SAFE_INTEGER : index;
	};
	return [...stops].sort((a, b) => rank(a.code) - rank(b.code));
}

/** Lower case without accents, so "malecon" finds "Gran Malecón". */
function normalize(text: string): string {
	return text
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase()
		.trim();
}

/** Every point a visitor can search for, with its selection. */
export function searchablePoints(
	data: CorridorData,
): { name: string; selection: Selection }[] {
	return [
		...data.stops.map((item) => ({
			name: item.name,
			selection: { kind: "stop" as const, code: item.code },
		})),
		...data.businesses.map((item) => ({
			name: item.name,
			selection: { kind: "business" as const, code: item.code },
		})),
		...data.floodZones.map((item) => ({
			name: item.name,
			selection: { kind: "floodZone" as const, code: item.code },
		})),
	];
}

/** First point whose name contains the query, ignoring case and accents. */
export function findPoint(data: CorridorData, query: string): Selection | null {
	const wanted = normalize(query);
	if (!wanted) return null;
	const match = searchablePoints(data).find((point) =>
		normalize(point.name).includes(wanted),
	);
	return match?.selection ?? null;
}

export function describeSelection(
	data: CorridorData,
	selection: Selection | null,
): SelectionDetail | null {
	if (!selection) return null;
	const { kind, code } = selection;

	if (kind === "stop") {
		const stop = data.stops.find((item) => item.code === code);
		if (!stop) return null;
		return {
			kind,
			title: stop.name,
			eyebrow: "Paradero",
			status: stop.is_accessible
				? { tone: "green", label: "Accesible" }
				: { tone: "neutral", label: "Acceso limitado" },
			description: null,
			facts: [
				{ label: "Tipo", value: STOP_TYPE_LABELS[stop.stop_type] },
				{ label: "Zona", value: ZONE_LABELS[stop.zone] },
			],
			services: stopServices(stop),
			simulated: stop.is_simulated,
		};
	}

	if (kind === "floodZone") {
		const zone = data.floodZones.find((item) => item.code === code);
		if (!zone) return null;
		return {
			kind,
			title: zone.name,
			eyebrow: "Arroyo",
			status: floodZoneStatus(zone),
			description: zone.advisory_es,
			facts: [
				{ label: "Radio", value: `${zone.radius_meters} m` },
				{ label: "Zona", value: ZONE_LABELS[zone.zone] },
			],
			services: [],
			simulated: zone.is_simulated,
		};
	}

	const business = data.businesses.find((item) => item.code === code);
	if (!business) return null;
	const services: ServiceKey[] = [];
	if (business.is_verified) services.push("verified");
	if (business.commission_free) services.push("commissionFree");
	return {
		kind,
		title: business.name,
		eyebrow: "Negocio del barrio",
		status: businessStatus(business),
		description: business.description_es,
		facts: [
			{ label: "Categoría", value: CATEGORY_LABELS[business.category] },
			{ label: "Zona", value: ZONE_LABELS[business.zone] },
		],
		services,
		simulated: business.is_simulated,
	};
}
