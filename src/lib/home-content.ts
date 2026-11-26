import type { FeatureItem } from "../components/home/feature-grid";

/**
 * Simulated content for the home view (Barranquilla 2034 scenario).
 * Replace with data from Supabase once the corridor data is wired in.
 */
export const homeContent = {
	weatherLabel: "31° soleado",
	greeting: "¡Ajá, llegaste!",
	tagline: "Barranquilla te espera",
	match: {
		timeLabel: "Hoy 19:30",
		title: "Partido inaugural",
		venue: "Estadio Metropolitano",
		illustration: "/illustrations/match.svg",
	},
	features: [
		{
			id: "live-map",
			title: "Mapa en vivo",
			subtitle: "Ocupación al instante",
			illustration: "/illustrations/live-map.svg",
		},
		{
			id: "transport",
			title: "Transporte",
			subtitle: "Tarifa justa",
			illustration: "/illustrations/transport.svg",
		},
		{
			id: "walking",
			title: "Planes a pie",
			subtitle: "Malecón, sin trancón",
			illustration: "/illustrations/walking.svg",
		},
		{
			id: "food",
			title: "Comer cerca",
			subtitle: "Sabores del Caribe",
			illustration: "/illustrations/food.svg",
		},
	] satisfies FeatureItem[],
	aiHref: "/prueba-guia",
};
