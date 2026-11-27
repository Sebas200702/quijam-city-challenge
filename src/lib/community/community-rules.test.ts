import { describe, expect, it } from "vitest";
import {
	bogotaLocalToIso,
	eventInputIssue,
	filterEvents,
	isoToBogotaLocal,
	isReservedDisplayName,
	registrationBlocker,
	spotsLeft,
	validateEventInput,
	validateProfilePatch,
	validateSignUp,
} from "./community-rules";
import type { CommunityEvent, NewEventInput } from "./community-types";

const NOW = new Date("2026-11-27T15:00:00Z");

function event(overrides: Partial<CommunityEvent> = {}): CommunityEvent {
	return {
		id: "e1",
		title: "Limpieza del Malecón",
		description: "Recogemos residuos en la orilla del río.",
		category: "volunteer",
		startsAt: "2026-11-29T12:00:00Z",
		endsAt: "2026-11-29T15:00:00Z",
		placeId: "place-gran-malecon",
		locationText: null,
		capacity: 2,
		registeredCount: 0,
		isFree: true,
		priceCop: null,
		organizerId: "u1",
		organizerName: "Ana",
		organizerVerified: false,
		status: "published",
		moderationStatus: "published",
		triagePriority: "none",
		createdAt: NOW.toISOString(),
		...overrides,
	};
}

const validInput: NewEventInput = {
	title: "Taller de millo",
	description: "Aprende los ritmos del Carnaval.",
	category: "music",
	startsAt: "2026-11-30T21:00:00Z",
	endsAt: null,
	placeId: "place-casa-del-carnaval",
	locationText: null,
	capacity: 20,
	isFree: true,
	priceCop: null,
};

describe("Barranquilla time", () => {
	it("reads a datetime-local value as UTC-5 and back", () => {
		const iso = bogotaLocalToIso("2026-12-05T06:00");
		expect(iso).toBe("2026-12-05T11:00:00.000Z");
		expect(isoToBogotaLocal(iso ?? "")).toBe("2026-12-05T06:00");
	});

	it("rejects malformed values", () => {
		expect(bogotaLocalToIso("mañana")).toBeNull();
	});
});

describe("validateEventInput", () => {
	it("accepts a complete event", () => {
		expect(validateEventInput(validInput, NOW)).toBeNull();
	});

	it("requires a future start, a place and a price when paid", () => {
		expect(
			validateEventInput(
				{ ...validInput, startsAt: "2026-11-01T10:00:00Z" },
				NOW,
			),
		).toMatch(/ya pasó/);
		expect(
			validateEventInput(
				{ ...validInput, placeId: null, locationText: " " },
				NOW,
			),
		).toMatch(/lugar/);
		expect(
			validateEventInput({ ...validInput, isFree: false, priceCop: null }, NOW),
		).toMatch(/valor/);
	});

	it("rejects an end before the start and non-integer capacity", () => {
		expect(
			validateEventInput(
				{ ...validInput, endsAt: "2026-11-30T20:00:00Z" },
				NOW,
			),
		).toMatch(/cierre/);
		expect(validateEventInput({ ...validInput, capacity: 0 }, NOW)).toMatch(
			/cupos/,
		);
	});
});

describe("eventInputIssue", () => {
	it("names the field the message belongs to", () => {
		expect(eventInputIssue(validInput, NOW)).toBeNull();
		expect(eventInputIssue({ ...validInput, title: "a" }, NOW)?.field).toBe(
			"title",
		);
		expect(eventInputIssue({ ...validInput, startsAt: "" }, NOW)?.field).toBe(
			"start",
		);
		expect(
			eventInputIssue({ ...validInput, isFree: false, priceCop: null }, NOW),
		).toEqual({
			field: "price",
			message: "Indica el valor de la entrada en pesos.",
		});
	});
});

describe("registrationBlocker", () => {
	it("allows registering while there are spots", () => {
		expect(registrationBlocker(event({ registeredCount: 1 }), NOW)).toBeNull();
		expect(spotsLeft(event({ registeredCount: 1 }))).toBe(1);
	});

	it("blocks full, cancelled and past events", () => {
		expect(registrationBlocker(event({ registeredCount: 2 }), NOW)).toMatch(
			/cupos/,
		);
		expect(registrationBlocker(event({ status: "cancelled" }), NOW)).toMatch(
			/cancelado/,
		);
		expect(
			registrationBlocker(
				event({
					startsAt: "2026-11-20T10:00:00Z",
					endsAt: "2026-11-20T12:00:00Z",
				}),
				NOW,
			),
		).toMatch(/pasó/);
	});

	it("never limits events without capacity", () => {
		expect(
			spotsLeft(event({ capacity: null, registeredCount: 500 })),
		).toBeNull();
	});
});

describe("filterEvents", () => {
	const events = [
		event({ id: "late", startsAt: "2026-12-10T12:00:00Z", endsAt: null }),
		event({
			id: "past",
			startsAt: "2026-11-01T12:00:00Z",
			endsAt: null,
			title: "Ya fue",
		}),
		event({
			id: "soon",
			category: "nature",
			title: "Avistamiento de aves",
			endsAt: null,
		}),
	];

	it("hides past events and sorts by start", () => {
		expect(filterEvents(events, {}, NOW).map((item) => item.id)).toEqual([
			"soon",
			"late",
		]);
	});

	it("searches without accents and filters by category", () => {
		expect(
			filterEvents(events, { search: "AVISTAMIENTO" }, NOW).map((e) => e.id),
		).toEqual(["soon"]);
		expect(
			filterEvents(events, { category: "nature" }, NOW).map((e) => e.id),
		).toEqual(["soon"]);
	});
});

describe("validateSignUp", () => {
	it("checks name, e-mail and password length", () => {
		const base = {
			email: "ana@example.com",
			password: "secreto123",
			displayName: "Ana",
			neighborhood: null,
			isVisitor: false,
		};
		expect(validateSignUp(base)).toBeNull();
		expect(validateSignUp({ ...base, email: "ana" })).toMatch(/correo/);
		expect(validateSignUp({ ...base, password: "corta" })).toMatch(/8/);
	});
});

describe("reserved display names", () => {
	it("blocks names that pass for an authority or the platform", () => {
		expect(isReservedDisplayName("Alcaldía de Barranquilla")).toBe(true);
		expect(isReservedDisplayName("POLICÍA nacional")).toBe(true);
		expect(isReservedDisplayName("Equipo Quillart")).toBe(true);
	});

	it("allows ordinary names that only contain the letters", () => {
		expect(isReservedDisplayName("Ana Policarpa")).toBe(false);
		expect(isReservedDisplayName("Adminta Rojas")).toBe(false);
	});

	it("is enforced in sign-up and profile edits", () => {
		expect(
			validateSignUp({
				email: "a@b.co",
				password: "secreto123",
				displayName: "Bomberos",
				neighborhood: null,
				isVisitor: false,
			}),
		).toMatch(/reservado/);
		expect(
			validateProfilePatch({
				displayName: "Ana",
				neighborhood: null,
				isVisitor: false,
			}),
		).toBeNull();
	});
});
