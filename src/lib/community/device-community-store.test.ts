import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CommunityStore, NewEventInput } from "./community-types";
import { createDeviceCommunityStore } from "./device-community-store";

function memoryStorage(): Storage {
	const data = new Map<string, string>();
	return {
		get length() {
			return data.size;
		},
		clear: () => data.clear(),
		getItem: (key) => data.get(key) ?? null,
		key: (index) => [...data.keys()][index] ?? null,
		removeItem: (key) => data.delete(key),
		setItem: (key, value) => data.set(key, value),
	};
}

const inThreeDays = () =>
	new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

function eventInput(overrides: Partial<NewEventInput> = {}): NewEventInput {
	return {
		title: "Taller de millo",
		description: "Aprende los ritmos del Carnaval con maestros del barrio.",
		category: "music",
		startsAt: inThreeDays(),
		endsAt: null,
		placeId: "place-casa-del-carnaval",
		locationText: null,
		capacity: 20,
		isFree: true,
		priceCop: null,
		...overrides,
	};
}

async function signUp(store: CommunityStore, name: string) {
	await store.signOut();
	await store.signUp({
		email: `${name.toLowerCase()}@example.com`,
		password: "secreto123",
		displayName: name,
		neighborhood: null,
		isVisitor: false,
	});
}

let store: CommunityStore;

beforeEach(() => {
	vi.stubGlobal("localStorage", memoryStorage());
	// Offline: the store falls back to the hard rules in the browser.
	vi.stubGlobal(
		"fetch",
		vi.fn(async () => {
			throw new Error("offline");
		}),
	);
	store = createDeviceCommunityStore();
});

describe("device store trust and safety", () => {
	it("holds the first event of a brand-new account for review", async () => {
		await signUp(store, "Ana");
		const result = await store.createEvent(eventInput());
		expect(result.outcome).toBe("held");
		expect(result.message).toMatch(/primer evento/);
	});

	it("rejects reserved display names", async () => {
		await expect(signUp(store, "Alcaldía de Barranquilla")).rejects.toThrow(
			/reservado/,
		);
	});

	it("holds a thread after three different people report it", async () => {
		await signUp(store, "Ana");
		const { record } = await store.createThread({
			title: "Venta de garaje",
			body: "Este sábado en mi cuadra",
			category: "neighborhood",
			placeId: null,
			eventId: null,
		});
		const id = record?.id ?? "";
		await expect(store.reportContent("thread", id, "spam")).rejects.toThrow(
			/propia/,
		);
		for (const name of ["Beto", "Caro", "Dani"]) {
			await signUp(store, name);
			await store.reportContent("thread", id, "spam");
			await store.reportContent("thread", id, "spam");
		}
		await signUp(store, "Eva");
		expect(await store.getThread(id)).toBeNull();
		const queue = await store.listModerationQueue();
		expect(queue.find((item) => item.id === id)).toMatchObject({
			status: "held",
			communityReports: 3,
		});
	});

	it("lets the city confirm a citizen report", async () => {
		await signUp(store, "Ana");
		const { record } = await store.createThread({
			title: "Arroyo en la 46",
			body: "El arroyo está crecido, no pasen por la 46.",
			category: "safety",
			placeId: null,
			eventId: null,
		});
		const id = record?.id ?? "";
		expect((await store.getThread(id))?.cityVerified).toBe(false);
		await store.moderate("thread", id, "verify");
		expect((await store.getThread(id))?.cityVerified).toBe(true);
	});

	it("exports and then deletes everything the person wrote", async () => {
		await signUp(store, "Ana");
		const { record } = await store.createThread({
			title: "Huertas urbanas",
			body: "¿Quién se apunta a una huerta en el barrio?",
			category: "neighborhood",
			placeId: null,
			eventId: null,
		});
		await store.register("starter-limpieza-malecon");
		const exported = await store.exportMyData();
		expect(exported.profile.displayName).toBe("Ana");
		expect(exported.threads).toHaveLength(1);
		expect(exported.registrations.map((event) => event.id)).toContain(
			"starter-limpieza-malecon",
		);

		await store.deleteAccount();
		expect(await store.getSession()).toBeNull();
		expect(await store.getThread(record?.id ?? "")).toBeNull();
		expect(
			(await store.getEvent("starter-limpieza-malecon"))?.registeredCount,
		).toBe(0);
		await expect(
			store.signIn("ana@example.com", "secreto123"),
		).rejects.toThrow();
	});
});
