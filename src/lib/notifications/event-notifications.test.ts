import { beforeEach, describe, expect, it } from "vitest";
import type { CommunityEvent } from "../community/community-types";
import { createDeviceCommunityStore } from "../community/device-community-store";
import {
	buildUpcomingEventReminders,
	mergeUserNotifications,
	toQuietWebNotification,
} from "./event-notifications";
import type { UserNotification } from "./event-notifications-types";

function makeEvent(overrides: Partial<CommunityEvent> = {}): CommunityEvent {
	return {
		id: "ev-1",
		title: "Caminata por la ciénaga",
		description: "Recorrido guiado al amanecer por el manglar.",
		category: "nature",
		startsAt: "2026-11-28T12:00:00.000Z", // 07:00 Bogota
		endsAt: "2026-11-28T14:00:00.000Z",
		placeId: "place-cienaga-de-mallorquin",
		locationText: null,
		capacity: 20,
		registeredCount: 3,
		isFree: true,
		priceCop: null,
		organizerId: "org-1",
		organizerName: "Ana",
		organizerVerified: true,
		status: "published",
		moderationStatus: "published",
		triagePriority: "none",
		createdAt: "2026-11-26T12:00:00.000Z",
		...overrides,
	};
}

describe("event-notifications", () => {
	it("creates reminders only for registered published events within 24 hours", () => {
		const now = new Date("2026-11-27T15:00:00.000Z"); // 10:00 Bogota
		const events: CommunityEvent[] = [
			makeEvent({ id: "tomorrow", startsAt: "2026-11-28T12:00:00.000Z" }),
			makeEvent({ id: "today-soon", startsAt: "2026-11-27T18:00:00.000Z" }),
			makeEvent({ id: "too-far", startsAt: "2026-11-30T12:00:00.000Z" }),
			makeEvent({ id: "cancelled", status: "cancelled" }),
			makeEvent({ id: "held", moderationStatus: "held" }),
			makeEvent({ id: "not-registered" }),
		];

		const reminders = buildUpcomingEventReminders(
			events,
			["tomorrow", "today-soon", "too-far", "cancelled", "held"],
			now,
		);

		expect(reminders.map((item) => item.eventId)).toEqual([
			"today-soon",
			"tomorrow",
		]);
		expect(reminders[0]?.body).toContain("Es hoy");
		expect(reminders[1]?.body).toContain("Es mañana");
	});

	it("never sets requireInteraction on quiet PWA notifications (epic #57 rule 4)", () => {
		const notice: UserNotification = {
			id: "n-1",
			kind: "event_cancelled",
			title: "Evento cancelado: Taller",
			body: "El organizador canceló el evento.",
			href: "/agenda/ev-1",
			eventId: "ev-1",
			readAt: null,
			createdAt: "2026-11-27T12:00:00.000Z",
		};

		const appNotice = toQuietWebNotification(notice);
		expect(appNotice.requireInteraction).toBe(false);
		expect(appNotice.url).toBe("/agenda/ev-1");
		expect(appNotice.dedupeKey).toBe("user-notice:n-1");
	});

	it("merges stored notices and reminders with unread first and dismissed reminders marked read", () => {
		const stored: UserNotification[] = [
			{
				id: "s-read",
				kind: "moderation_approved",
				title: "Aprobada",
				body: "Visible",
				href: "/agenda/1",
				eventId: "1",
				readAt: "2026-11-27T10:00:00.000Z",
				createdAt: "2026-11-27T09:00:00.000Z",
			},
			{
				id: "s-unread",
				kind: "event_cancelled",
				title: "Cancelado",
				body: "Se canceló",
				href: "/agenda/2",
				eventId: "2",
				readAt: null,
				createdAt: "2026-11-27T11:00:00.000Z",
			},
		];
		const reminders: UserNotification[] = [
			{
				id: "reminder:ev-1:2026-11-28",
				kind: "event_reminder",
				title: "Recordatorio",
				body: "Es mañana",
				href: "/agenda/ev-1",
				eventId: "ev-1",
				readAt: null,
				createdAt: "2026-11-27T12:00:00.000Z",
			},
		];

		const merged = mergeUserNotifications(
			stored,
			reminders,
			new Set(["reminder:ev-1:2026-11-28"]),
		);
		expect(merged[0]?.id).toBe("s-unread");
		expect(
			merged.find((item) => item.id === "reminder:ev-1:2026-11-28")?.readAt,
		).not.toBeNull();
	});

	describe("device store notifications integration", () => {
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

		it("notifies registered attendees on event cancellation and authors on moderation decisions", async () => {
			const store = createDeviceCommunityStore();

			// Organizer creates an event (first event from new account is held for review)
			await store.signUp({
				email: "org@example.com",
				password: "password123",
				displayName: "Organizadora Ana",
				neighborhood: "El Prado",
				isVisitor: false,
			});
			const created = await store.createEvent({
				title: "Taller comunitario de lectura",
				description:
					"Encuentro abierto para leer historias del Caribe en el parque.",
				category: "culture",
				startsAt: new Date(Date.now() + 48 * 3_600_000).toISOString(),
				endsAt: null,
				placeId: "place-parque-washington",
				locationText: null,
				capacity: 10,
				isFree: true,
				priceCop: null,
			});
			expect(created.record).not.toBeNull();
			const eventId = created.record?.id ?? "";

			// Moderator approves the held event -> author gets moderation_approved notice
			await store.moderate("event", eventId, "approve");
			const orgNotices = await store.listNotifications();
			expect(orgNotices.some((n) => n.kind === "moderation_approved")).toBe(
				true,
			);
			await store.markAllNotificationsRead();
			expect(
				(await store.listNotifications()).every((n) => n.readAt !== null),
			).toBe(true);

			// Attendee signs up and registers
			await store.signOut();
			await store.signUp({
				email: "asistente@example.com",
				password: "password123",
				displayName: "Carlos Vecino",
				neighborhood: "Centro",
				isVisitor: false,
			});
			await store.register(eventId);

			// Organizer signs back in and cancels the event
			await store.signOut();
			await store.signIn("org@example.com", "password123");
			await store.cancelEvent(eventId);

			// Attendee sees the event_cancelled notification
			await store.signOut();
			await store.signIn("asistente@example.com", "password123");
			const attendeeNotices = await store.listNotifications();
			expect(
				attendeeNotices.some(
					(n) => n.kind === "event_cancelled" && n.eventId === eventId,
				),
			).toBe(true);
		});
	});
});
