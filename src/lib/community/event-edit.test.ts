import { beforeEach, describe, expect, it } from "vitest";
import {
	buildEventUpdateNoticeBody,
	detectEventEditChanges,
	validateEventEditInput,
} from "./community-rules";
import type { NewEventInput } from "./community-types";
import { createDeviceCommunityStore } from "./device-community-store";

function futureIso(hoursAhead: number): string {
	return new Date(Date.now() + hoursAhead * 3_600_000).toISOString();
}

function baseInput(overrides: Partial<NewEventInput> = {}): NewEventInput {
	return {
		title: "Caminata comunitaria al malecón",
		description: "Encuentro abierto para caminar junto al río y conversar.",
		category: "community",
		startsAt: futureIso(48),
		endsAt: null,
		placeId: "place-gran-malecon",
		locationText: null,
		capacity: 10,
		isFree: true,
		priceCop: null,
		...overrides,
	};
}

describe("event edit rules (#92)", () => {
	it("rejects lowering capacity below registered attendees", () => {
		const error = validateEventEditInput(baseInput({ capacity: 4 }), 5);
		expect(error).toContain("5");

		expect(validateEventEditInput(baseInput({ capacity: 5 }), 5)).toBeNull();
		expect(validateEventEditInput(baseInput({ capacity: null }), 5)).toBeNull();
	});

	it("detects text, schedule, place, and paid-status changes accurately", () => {
		const before = {
			title: "Taller de música",
			description: "Aprendemos tambora en Barrio Abajo.",
			startsAt: "2026-11-30T15:00:00.000Z",
			endsAt: null,
			placeId: "place-casa-del-carnaval",
			locationText: null,
			isFree: true,
			priceCop: null,
		};

		const onlyCapacity = detectEventEditChanges(before, {
			...before,
			category: "music",
			capacity: 40,
		});
		expect(onlyCapacity).toEqual({
			textChanged: false,
			dateChanged: false,
			placeChanged: false,
			paidStatusChanged: false,
		});

		const dateAndPlace = detectEventEditChanges(before, {
			...before,
			category: "music",
			startsAt: "2026-12-01T15:00:00.000Z",
			placeId: "place-parque-washington",
			capacity: 40,
		});
		expect(dateAndPlace.dateChanged).toBe(true);
		expect(dateAndPlace.placeChanged).toBe(true);
		expect(dateAndPlace.textChanged).toBe(false);
		expect(
			buildEventUpdateNoticeBody("Taller de música", dateAndPlace),
		).toContain("la fecha y el lugar");
	});

	describe("device store updateEvent flow", () => {
		beforeEach(() => {
			const bag = new Map<string, string>();
			const mockStorage = {
				getItem: (key: string) => bag.get(key) ?? null,
				setItem: (key: string, value: string) => {
					bag.set(key, value);
				},
				removeItem: (key: string) => {
					bag.delete(key);
				},
				clear: () => bag.clear(),
				key: (index: number) => [...bag.keys()][index] ?? null,
				get length() {
					return bag.size;
				},
			};
			Object.defineProperty(globalThis, "localStorage", {
				value: mockStorage,
				configurable: true,
			});
		});

		it("enforces organizer ownership, capacity floor, re-triage on text change, and notifies attendees on date/place change", async () => {
			const store = createDeviceCommunityStore();

			// Organizer creates and gets event approved
			await store.signUp({
				email: "org2@example.com",
				password: "password123",
				displayName: "Organizador Luis",
				neighborhood: "Centro",
				isVisitor: false,
			});
			const initial = baseInput({ capacity: 5 });
			const created = await store.createEvent(initial);
			const eventId = created.record?.id ?? "";
			await store.moderate("event", eventId, "approve");

			// Attendee registers
			await store.signOut();
			await store.signUp({
				email: "vecino@example.com",
				password: "password123",
				displayName: "Marta Vecina",
				neighborhood: "El Prado",
				isVisitor: false,
			});
			await store.register(eventId);

			// Non-organizer cannot edit
			await expect(
				store.updateEvent(eventId, { ...initial, capacity: 8 }),
			).rejects.toThrow("Solo quien organiza");

			// Organizer signs back in
			await store.signOut();
			await store.signIn("org2@example.com", "password123");

			// Cannot lower capacity below registeredCount (1) — wait, min valid capacity is 1; register a 2nd attendee to test 1 < 2
			await store.signOut();
			await store.signUp({
				email: "vecino2@example.com",
				password: "password123",
				displayName: "Pedro Vecino",
				neighborhood: "Centro",
				isVisitor: false,
			});
			await store.register(eventId);

			await store.signOut();
			await store.signIn("org2@example.com", "password123");
			await expect(
				store.updateEvent(eventId, { ...initial, capacity: 1 }),
			).rejects.toThrow("por debajo de los inscritos");

			// Changing place notifies registered attendees
			const moved = await store.updateEvent(eventId, {
				...initial,
				placeId: "place-parque-washington",
			});
			expect(moved.outcome).toBe("published");
			expect(moved.record?.placeId).toBe("place-parque-washington");

			// Attendee received event_updated notification
			await store.signOut();
			await store.signIn("vecino@example.com", "password123");
			const attendeeNotices = await store.listNotifications();
			expect(
				attendeeNotices.some(
					(n) => n.kind === "event_updated" && n.eventId === eventId,
				),
			).toBe(true);

			// Organizer edits description to include an external link -> re-triage holds the event
			await store.signOut();
			await store.signIn("org2@example.com", "password123");
			const heldEdit = await store.updateEvent(eventId, {
				...initial,
				placeId: "place-parque-washington",
				description:
					"Encuentro abierto, revisa más detalles en https://ejemplo-externo.test/evento",
			});
			expect(heldEdit.outcome).toBe("held");
			expect(heldEdit.record?.moderationStatus).toBe("held");
		});
	});
});
