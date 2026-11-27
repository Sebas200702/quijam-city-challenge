// Projected editions of recurring events (docs/32-simulacion.md). SYNTHETIC: each one is
// an estimate for Dec 2026 – Feb 2027 built from a past edition verified in a public source.
// The description shown in the app always says "Proyección basada en la edición <year>
// (fuente: <url>)". Dates and hours are estimates, not announcements.

export const PROJECTION_ORGANIZER = "Agenda proyectada (simulado)";

export interface ProjectedEvent {
	title: string;
	description: string;
	category: "culture" | "sport" | "nature" | "volunteer" | "food" | "music" | "learning" | "community";
	/** Bogotá local time, "YYYY-MM-DDTHH:MM". */
	startsAt: string;
	endsAt?: string;
	place?: string; // places.slug
	locationText?: string;
	capacity?: number;
	isFree: boolean;
	priceCop?: number;
	pastEdition: string;
	sourceUrl: string;
}

export const PROJECTED_EVENTS: ProjectedEvent[] = [];
