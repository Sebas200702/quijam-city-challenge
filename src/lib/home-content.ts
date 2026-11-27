import type { FeatureItem } from "../components/home/feature-grid";
import type { MapNextStep, VisitorMenuItemId } from "./home-content-types";

/** Secondary menu routes (rule 2). "language" opens a sheet and "theme" toggles, instead of a page. */
export const SECONDARY_MENU_HREFS: Record<
	Exclude<VisitorMenuItemId, "language" | "theme">,
	string
> = {
	passport: "/pasaporte",
	slang: "/jerga",
	data: "/datos",
};

/**
 * First trip the map section suggests. Keep it equal to the default query of the map's
 * route card (src/components/map/corridor-map.tsx) so "Ver la ruta" shows the same route.
 */
export const MAP_NEXT_STEP: MapNextStep = {
	origin: "STOP-MALECON-SUR",
	destination: "STOP-ESTADIO",
	destinationName: "Estadio Metropolitano",
};

/**
 * Static content for the home view. The home itself is the Quillart AI
 * conversation; events come from the community store.
 */
export const homeContent = {
	greeting: "¡Ajá, llegaste!",
	tagline: "Barranquilla te espera",
	features: [
		{
			id: "live-map",
			href: "/mapa",
			title: "Mapa en vivo",
			subtitle: "Ocupación al instante",
			illustration: "/illustrations/live-map.svg",
		},
		{
			id: "transport",
			href: "/mapa",
			title: "Transporte",
			subtitle: "Tarifa justa",
			illustration: "/illustrations/transport.svg",
		},
		{
			id: "walking",
			href: "/mapa",
			title: "Planes a pie",
			subtitle: "Malecón, sin trancón",
			illustration: "/illustrations/walking.svg",
		},
		{
			id: "food",
			href: "/mapa",
			title: "Comer cerca",
			subtitle: "Sabores del Caribe",
			illustration: "/illustrations/food.svg",
		},
	] satisfies FeatureItem[],
	/** Quillart AI is the home: the conversation lives at /inicio. */
	aiHref: "/inicio",
};
