// Visitor-facing copy for the map chrome (header, stop list, detail card), in
// Spanish (es-CO, default) and English. One term for one thing (UX rule 10);
// only corridor-seed data carries the "datos de referencia" tag (rule 9).

import type { ServiceKey } from "../../lib/corridor/corridor-geometry";
import type {
	BusinessCategory,
	CorridorZone,
	StopType,
} from "../../lib/corridor/corridor-types";

export type MapLang = "es" | "en";

export const SERVICE_LABELS_EN: Record<ServiceKey, string> = {
	accessible: "Accessible",
	shade: "Shade",
	hydration: "Water",
	recycling: "Recycling",
	hosts: "Hosts",
	verified: "Verified",
	commissionFree: "No commission",
};

/** One short line per service, shown in the stop's "what each service means". */
export const SERVICE_HINTS: Record<MapLang, Record<ServiceKey, string>> = {
	es: {
		accessible: "Entrada sin escalones para silla de ruedas y coches.",
		shade: "Techo o árboles para esperar sin sol directo.",
		hydration: "Punto de agua para llenar tu botella.",
		recycling: "Canecas para separar residuos.",
		hosts: "Una dupla de anfitriones te orienta en este paradero.",
		verified: "La ciudad revisó este negocio.",
		commissionFree: "Pagas directo al negocio, sin intermediarios.",
	},
	en: {
		accessible: "Step-free entrance for wheelchairs and strollers.",
		shade: "Roof or trees to wait out of direct sun.",
		hydration: "Water point to refill your bottle.",
		recycling: "Bins to sort your waste.",
		hosts: "A host pair helps you at this stop.",
		verified: "The city checked this business.",
		commissionFree: "You pay the business directly, no middlemen.",
	},
};

export const STOP_TYPE_LABELS_EN: Record<StopType, string> = {
	transmetro: "Transmetro",
	bus_stop: "Bus stop",
	qr_point: "QR point",
	host_hub: "Host point",
};

export const ZONE_LABELS_EN: Record<CorridorZone, string> = {
	estadio: "Stadium",
	troncal_murillo: "Troncal Murillo",
	centro: "Downtown",
	barrio_abajo: "Barrio Abajo",
	gran_malecon: "Gran Malecón",
};

export const CATEGORY_LABELS_EN: Record<BusinessCategory, string> = {
	food_popular: "Local food",
	crafts: "Crafts",
	culture: "Culture",
	eco_event: "Green event",
	coffee: "Coffee",
};

export const MAP_COPY = {
	es: {
		searchForm: "Buscar en el corredor",
		searchLabel: "Buscar un paradero, arroyo o negocio",
		searchPlaceholder: "¿Para dónde vas?",
		searchButton: "Buscar",
		clearSearch: "Borrar búsqueda",
		themeToDark: "Usar tema oscuro",
		themeToLight: "Usar tema claro",
		langButton: "Idioma: español. Cambiar a inglés",
		searchMiss: (query: string) => `No encontramos «${query}» en el corredor.`,
		searchTry: "Prueba con Estadio, Malecón o Barrio Abajo.",
		layers: "Capas del mapa",
		layerStops: "Paraderos",
		layerFlood: "Arroyos",
		layerBusinesses: "Negocios",
		layerCount: (label: string, count: number, on: boolean) =>
			`${label}: ${count}. ${on ? "Visibles" : "Ocultos"}`,
		referenceTag: "Datos de referencia",
		offline: "Sin conexión",
		stopsTitle: "Paradas del corredor",
		stopsOrder: "De sur a norte",
		stopsCount: (count: number) =>
			count === 1 ? "1 parada" : `${count} paradas`,
		stopsEmptyTitle: "Aún no hay paradas",
		stopsEmptyText: "Cuando carguen las paradas del corredor, las verás aquí.",
		stopHosts: "Dupla de anfitriones",
		stopNumber: (n: number) => `Parada ${n}`,
		detailEmptyTitle: "Toca un punto del mapa",
		detailEmptyWhy: "Verás sus servicios, alertas y cómo moverte sin trancón.",
		detailEmptyHintStops: "Paraderos con sombra, agua y anfitriones",
		detailEmptyHintFlood: "Arroyos que se activan cuando llueve",
		detailEmptyHintBusinesses: "Negocios del barrio verificados",
		offlineNote:
			"Sin conexión: usamos datos guardados. El mapa sigue funcionando.",
		askGuide: "Pregúntale a Quillart AI",
		getThere: "Cómo llegar",
		safeRoute: "Buscar una ruta segura",
		commission: "Comisión",
		close: "Cerrar detalle",
		open: "Abierto ahora",
		closed: "Cerrado",
		closedWhy:
			"Cerró por hoy. Pregúntale a Quillart AI por otro negocio abierto cerca.",
		verified: "Negocio verificado",
		services: "Servicios",
		servicesMeaning: "Qué significa cada servicio",
		hostsTitle: "Aquí te recibe una dupla de anfitriones",
		hostsWhy: "Pídeles ayuda para ubicarte o para seguir tu ruta.",
		floodActiveWhy: "No cruces por aquí mientras dure la alerta.",
		eyebrow: {
			stop: "Paradero",
			floodZone: "Arroyo",
			business: "Negocio del barrio",
		},
	},
	en: {
		searchForm: "Search the corridor",
		searchLabel: "Search for a stop, arroyo or business",
		searchPlaceholder: "Where are you going?",
		searchButton: "Search",
		clearSearch: "Clear search",
		themeToDark: "Use dark theme",
		themeToLight: "Use light theme",
		langButton: "Language: English. Switch to Spanish",
		searchMiss: (query: string) =>
			`We could not find “${query}” on the corridor.`,
		searchTry: "Try Estadio, Malecón or Barrio Abajo.",
		layers: "Map layers",
		layerStops: "Stops",
		layerFlood: "Arroyos",
		layerBusinesses: "Businesses",
		layerCount: (label: string, count: number, on: boolean) =>
			`${label}: ${count}. ${on ? "Shown" : "Hidden"}`,
		referenceTag: "Reference data",
		offline: "Offline",
		stopsTitle: "Corridor stops",
		stopsOrder: "South to north",
		stopsCount: (count: number) => (count === 1 ? "1 stop" : `${count} stops`),
		stopsEmptyTitle: "No stops yet",
		stopsEmptyText: "When the corridor stops load, you will see them here.",
		stopHosts: "Host pair",
		stopNumber: (n: number) => `Stop ${n}`,
		detailEmptyTitle: "Tap a point on the map",
		detailEmptyWhy:
			"You will see its services, alerts and how to move without traffic.",
		detailEmptyHintStops: "Stops with shade, water and hosts",
		detailEmptyHintFlood: "Arroyos that flood when it rains",
		detailEmptyHintBusinesses: "Verified neighbourhood businesses",
		offlineNote: "Offline: we use saved data. The map still works.",
		askGuide: "Ask Quillart AI",
		getThere: "Get directions",
		safeRoute: "Find a safe route",
		commission: "Commission",
		close: "Close details",
		open: "Open now",
		closed: "Closed",
		closedWhy:
			"Closed for today. Ask Quillart AI for another open business nearby.",
		verified: "Verified business",
		services: "Services",
		servicesMeaning: "What each service means",
		hostsTitle: "A host pair welcomes you here",
		hostsWhy: "Ask them for help finding your way or following your route.",
		floodActiveWhy: "Do not cross here while the alert lasts.",
		eyebrow: {
			stop: "Stop",
			floodZone: "Arroyo",
			business: "Neighbourhood business",
		},
	},
} as const;

export type MapCopy = (typeof MAP_COPY)[MapLang];
