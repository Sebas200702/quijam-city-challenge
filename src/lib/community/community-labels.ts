// Spanish labels and formatters for the community screens.

import type {
	EventCategory,
	ForumCategory,
	PlaceKind,
} from "./community-types";

export const EVENT_CATEGORY_LABELS: Record<EventCategory, string> = {
	culture: "Cultura",
	music: "Música y baile",
	nature: "Naturaleza",
	sport: "Deporte",
	volunteer: "Voluntariado",
	food: "Gastronomía",
	learning: "Talleres",
	community: "Encuentro vecinal",
};

export const FORUM_CATEGORY_LABELS: Record<ForumCategory, string> = {
	general: "General",
	visitors: "Visitantes",
	neighborhood: "Mi barrio",
	nature: "Naturaleza",
	mobility: "Movilidad",
	culture: "Cultura",
	safety: "Seguridad",
};

export const PLACE_KIND_LABELS: Record<PlaceKind, string> = {
	nature: "Naturaleza",
	park: "Parque",
	waterfront: "Río y mar",
	culture: "Cultura",
	heritage: "Patrimonio",
	sport: "Deporte",
};

const TIME_ZONE = "America/Bogota";

const dayFormat = new Intl.DateTimeFormat("es-CO", {
	timeZone: TIME_ZONE,
	weekday: "short",
	day: "numeric",
	month: "short",
});
const longDayFormat = new Intl.DateTimeFormat("es-CO", {
	timeZone: TIME_ZONE,
	weekday: "long",
	day: "numeric",
	month: "long",
	year: "numeric",
});
const timeFormat = new Intl.DateTimeFormat("es-CO", {
	timeZone: TIME_ZONE,
	hour: "numeric",
	minute: "2-digit",
	hour12: true,
});

export function formatEventDay(iso: string): string {
	return dayFormat.format(new Date(iso)).replace(/\./g, "");
}

export function formatEventLongDay(iso: string): string {
	const text = longDayFormat.format(new Date(iso));
	return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatTime(iso: string): string {
	return timeFormat.format(new Date(iso)).replace(/\s/g, " ");
}

export function formatTimeRange(startsAt: string, endsAt: string | null) {
	return endsAt
		? `${formatTime(startsAt)} – ${formatTime(endsAt)}`
		: formatTime(startsAt);
}

const copFormat = new Intl.NumberFormat("es-CO", {
	style: "currency",
	currency: "COP",
	maximumFractionDigits: 0,
});

export function formatCop(value: number): string {
	return copFormat.format(value);
}

/** "hace 5 min", "hace 2 h", "ayer", or a date. */
export function formatRelative(iso: string, now: Date = new Date()): string {
	const minutes = Math.round((now.getTime() - new Date(iso).getTime()) / 60000);
	if (minutes < 1) return "ahora";
	if (minutes < 60) return `hace ${minutes} min`;
	const hours = Math.round(minutes / 60);
	if (hours < 24) return `hace ${hours} h`;
	const days = Math.round(hours / 24);
	if (days === 1) return "ayer";
	if (days < 7) return `hace ${days} días`;
	return formatEventDay(iso);
}

export function directionsUrl(name: string, lat: number, lng: number): string {
	const query = encodeURIComponent(`${name}, Barranquilla`);
	return `https://www.google.com/maps/search/?api=1&query=${query}&center=${lat},${lng}`;
}

export function initials(name: string): string {
	return name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part.charAt(0).toUpperCase())
		.join("");
}
