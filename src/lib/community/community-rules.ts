// Pure rules shared by both stores and the forms: validation, filters and limits.

import { messages } from "../i18n/messages";
import { getLanguage } from "../i18n/use-language";
import { validatePoint } from "./community-geo";
import type {
	CommunityEvent,
	EventQuery,
	ForumThread,
	NewEventInput,
	NewThreadInput,
	ProfilePatch,
	SignUpInput,
	ThreadQuery,
} from "./community-types";

/** Validation messages in the chosen language (Spanish on the server). */
const validation = () => messages[getLanguage()].shared.validation;

/** Barranquilla is UTC-5 all year (no daylight saving time). */
const BOGOTA_OFFSET = "-05:00";

/** Converts a `datetime-local` value typed in Barranquilla time to an ISO timestamp. */
export function bogotaLocalToIso(value: string): string | null {
	if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
	const date = new Date(`${value}:00${BOGOTA_OFFSET}`);
	return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Converts an ISO timestamp to a `datetime-local` value in Barranquilla time. */
export function isoToBogotaLocal(iso: string): string {
	const shifted = new Date(new Date(iso).getTime() - 5 * 60 * 60 * 1000);
	return shifted.toISOString().slice(0, 16);
}

/** The event field a validation message is about, so a form can point at it. */
export type EventInputField =
	| "title"
	| "description"
	| "start"
	| "end"
	| "place"
	| "point"
	| "capacity"
	| "price";

export interface EventInputIssue {
	field: EventInputField;
	message: string;
}

/** First problem of an event draft and the field it belongs to, or null. */
export function eventInputIssue(
	input: NewEventInput,
	now: Date = new Date(),
): EventInputIssue | null {
	const v = validation();
	const issue = (field: EventInputField, message: string) => ({
		field,
		message,
	});
	if (input.title.trim().length < 4) return issue("title", v.titleMin4);
	if (input.title.trim().length > 120) return issue("title", v.titleMax120);
	if (input.description.trim().length < 10)
		return issue("description", v.eventBodyMin);
	const start = new Date(input.startsAt);
	if (Number.isNaN(start.getTime())) return issue("start", v.eventStartMissing);
	if (start.getTime() < now.getTime()) return issue("start", v.eventStartPast);
	if (input.endsAt) {
		const end = new Date(input.endsAt);
		if (Number.isNaN(end.getTime()) || end <= start)
			return issue("end", v.eventEndAfterStart);
	}
	if (!input.placeId && !input.locationText?.trim())
		return issue("place", v.eventPlaceMissing);
	const pointError = validatePoint(input.latitude, input.longitude);
	if (pointError) return issue("point", pointError);
	if (
		input.capacity !== null &&
		(!Number.isInteger(input.capacity) || input.capacity < 1)
	)
		return issue("capacity", v.capacityInteger);
	if (!input.isFree && (input.priceCop === null || input.priceCop <= 0))
		return issue("price", v.eventPriceMissing);
	return null;
}

export function validateEventInput(
	input: NewEventInput,
	now: Date = new Date(),
): string | null {
	return eventInputIssue(input, now)?.message ?? null;
}

export function validateThreadInput(input: NewThreadInput): string | null {
	if (input.title.trim().length < 4) return validation().titleMin4;
	if (input.title.trim().length > 140) return validation().titleMax140;
	if (input.body.trim().length < 2) return "Escribe tu mensaje.";
	// A safety report must say where it happens (audit v2, U16).
	if (
		input.category === "safety" &&
		(input.latitude == null || input.longitude == null)
	)
		return messages[getLanguage()].geo.picker.safetyPointRequired;
	return validatePoint(input.latitude, input.longitude);
}

export function validatePostBody(body: string): string | null {
	if (!body.trim()) return "Escribe tu respuesta.";
	if (body.length > 5000)
		return "La respuesta no puede pasar de 5000 caracteres.";
	return null;
}

/**
 * Names nobody may use, so no account can pass for an authority or the
 * platform. Same list as public.is_reserved_display_name() in the database.
 */
export const RESERVED_NAME_TERMS = [
	"alcaldia",
	"alcalde",
	"gobernacion",
	"gobierno",
	"policia",
	"bomberos",
	"defensa civil",
	"cruz roja",
	"ejercito",
	"armada",
	"fiscalia",
	"quillart",
	"moderador",
	"moderacion",
	"administrador",
	"admin",
	"oficial",
	"soporte",
];

export function isReservedDisplayName(name: string): boolean {
	const normalized = name
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, " ")
		.trim();
	return RESERVED_NAME_TERMS.some((term) =>
		new RegExp(`(^|\\s)${term}(\\s|$)`).test(normalized),
	);
}

function validateDisplayName(name: string): string | null {
	const trimmed = name.trim();
	if (trimmed.length < 2) return validation().displayNameMin;
	if (trimmed.length > 60) return "Tu nombre no puede pasar de 60 caracteres.";
	if (isReservedDisplayName(trimmed)) return validation().reservedName;
	return null;
}

export function validateSignUp(input: SignUpInput): string | null {
	const nameError = validateDisplayName(input.displayName);
	if (nameError) return nameError;
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim()))
		return validation().invalidEmail;
	if (input.password.length < 8) return validation().passwordMin;
	return null;
}

export function validateProfilePatch(patch: ProfilePatch): string | null {
	return validateDisplayName(patch.displayName);
}

/** Why a person cannot register right now, or null when they can. */
export function registrationBlocker(
	event: CommunityEvent,
	now: Date = new Date(),
): string | null {
	if (event.status === "cancelled") return "Este evento fue cancelado.";
	if (isPastEvent(event, now)) return validation().eventPassed;
	if (event.capacity !== null && event.registeredCount >= event.capacity)
		return "No quedan cupos para este evento.";
	return null;
}

/** A capped event with no spots left. */
export function isEventFull(event: CommunityEvent): boolean {
	return event.capacity !== null && event.registeredCount >= event.capacity;
}

/** The waiting list (#126) is for full events that are still going to happen. */
export function canJoinWaitlist(
	event: CommunityEvent,
	now: Date = new Date(),
): boolean {
	return (
		event.status === "published" &&
		event.moderationStatus === "published" &&
		!isPastEvent(event, now) &&
		isEventFull(event)
	);
}

export function spotsLeft(event: CommunityEvent): number | null {
	if (event.capacity === null) return null;
	return Math.max(event.capacity - event.registeredCount, 0);
}

export function isPastEvent(
	event: CommunityEvent,
	now: Date = new Date(),
): boolean {
	const end = event.endsAt ?? event.startsAt;
	return new Date(end).getTime() < now.getTime() - 60 * 60 * 1000;
}

function normalize(text: string): string {
	return text
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase();
}

export function filterEvents(
	events: CommunityEvent[],
	query: EventQuery = {},
	now: Date = new Date(),
): CommunityEvent[] {
	const search = query.search ? normalize(query.search.trim()) : "";
	const result = events
		.filter((event) => query.includePast || !isPastEvent(event, now))
		.filter((event) => !query.category || event.category === query.category)
		.filter((event) => !query.placeId || event.placeId === query.placeId)
		.filter(
			(event) => !query.organizerId || event.organizerId === query.organizerId,
		)
		.filter((event) => !query.ids || query.ids.includes(event.id))
		.filter(
			(event) =>
				!search ||
				normalize(`${event.title} ${event.description}`).includes(search),
		)
		.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
	return query.limit ? result.slice(0, query.limit) : result;
}

export function filterThreads(
	threads: ForumThread[],
	query: ThreadQuery = {},
): ForumThread[] {
	const result = threads
		.filter((thread) => !query.category || thread.category === query.category)
		.filter((thread) => !query.placeId || thread.placeId === query.placeId)
		.filter((thread) => !query.eventId || thread.eventId === query.eventId)
		.filter((thread) => !query.authorId || thread.authorId === query.authorId)
		.sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
	return query.limit ? result.slice(0, query.limit) : result;
}
