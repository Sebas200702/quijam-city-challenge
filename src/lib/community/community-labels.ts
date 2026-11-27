// Spanish labels and formatters for the community screens.

import { type Language, VOICE_LOCALES } from "../i18n/languages";
import { messages } from "../i18n/messages";
import { getLanguage } from "../i18n/use-language";
import type {
	EventCategory,
	ForumCategory,
	PlaceKind,
} from "./community-types";

type LabelGroup = "eventCategories" | "forumCategories" | "placeKinds";

/**
 * A Record whose values are read in the current interface language each time
 * (the keys are the same in every language, so they come from Spanish).
 */
function labelMap<K extends string>(group: LabelGroup): Record<K, string> {
	const keys = () => Object.keys(messages.es.shared[group]);
	return new Proxy({} as Record<K, string>, {
		get: (_target, key) =>
			typeof key === "string"
				? (messages[getLanguage()].shared[group] as Record<string, string>)[key]
				: undefined,
		has: (_target, key) => typeof key === "string" && keys().includes(key),
		ownKeys: () => keys(),
		getOwnPropertyDescriptor: (_target, key) =>
			typeof key === "string" && keys().includes(key)
				? { enumerable: true, configurable: true }
				: undefined,
	});
}

export const EVENT_CATEGORY_LABELS = labelMap<EventCategory>("eventCategories");

export const FORUM_CATEGORY_LABELS = labelMap<ForumCategory>("forumCategories");

export const PLACE_KIND_LABELS = labelMap<PlaceKind>("placeKinds");

const TIME_ZONE = "America/Bogota";

/** Dates and times follow the interface language (Bogotá time zone). */
interface DateFormats {
	day: Intl.DateTimeFormat;
	longDay: Intl.DateTimeFormat;
	time: Intl.DateTimeFormat;
}

const formatsByLanguage = new Map<Language, DateFormats>();

function formatsFor(language: Language): DateFormats {
	let formats = formatsByLanguage.get(language);
	if (!formats) {
		const locale = VOICE_LOCALES[language];
		formats = {
			day: new Intl.DateTimeFormat(locale, {
				timeZone: TIME_ZONE,
				weekday: "short",
				day: "numeric",
				month: "short",
			}),
			longDay: new Intl.DateTimeFormat(locale, {
				timeZone: TIME_ZONE,
				weekday: "long",
				day: "numeric",
				month: "long",
				year: "numeric",
			}),
			// Spanish and English use a.m./p.m.; Portuguese and French use 24 h.
			time: new Intl.DateTimeFormat(locale, {
				timeZone: TIME_ZONE,
				hour: language === "es" || language === "en" ? "numeric" : "2-digit",
				minute: "2-digit",
				...(language === "es" || language === "en" ? { hour12: true } : {}),
			}),
		};
		formatsByLanguage.set(language, formats);
	}
	return formats;
}

export function formatEventDay(iso: string): string {
	return formatsFor(getLanguage()).day.format(new Date(iso)).replace(/\./g, "");
}

export function formatEventLongDay(iso: string): string {
	const text = formatsFor(getLanguage()).longDay.format(new Date(iso));
	return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatTime(iso: string): string {
	return formatsFor(getLanguage())
		.time.format(new Date(iso))
		.replace(/\s/g, " ");
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

/** "hace 5 min", "hace 2 h", "ayer", or a date; other languages use Intl. */
export function formatRelative(iso: string, now: Date = new Date()): string {
	const language = getLanguage();
	const minutes = Math.round((now.getTime() - new Date(iso).getTime()) / 60000);
	if (language !== "es") {
		const rtf = new Intl.RelativeTimeFormat(VOICE_LOCALES[language], {
			numeric: "auto",
			style: "short",
		});
		if (minutes < 1) return rtf.format(0, "second");
		if (minutes < 60) return rtf.format(-minutes, "minute");
		const hours = Math.round(minutes / 60);
		if (hours < 24) return rtf.format(-hours, "hour");
		const days = Math.round(hours / 24);
		if (days < 7) return rtf.format(-days, "day");
		return formatEventDay(iso);
	}
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
