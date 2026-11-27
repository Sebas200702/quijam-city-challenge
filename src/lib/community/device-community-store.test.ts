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

describe("device store appeals", () => {
	async function removedThread() {
		await signUp(store, "Ana");
		const { record } = await store.createThread({
			title: "Venta de garaje",
			body: "Este sábado en mi cuadra",
			category: "neighborhood",
			placeId: null,
			eventId: null,
		});
		const id = record?.id ?? "";
		await store.moderate("thread", id, "remove");
		return id;
	}

	it("lets the author appeal removed content once, and puts it in the queue", async () => {
		const id = await removedThread();
		expect(await store.listMyRemoved()).toMatchObject([
			{ kind: "thread", id, appealStatus: null },
		]);
		await expect(store.appeal("thread", id, "corto")).rejects.toThrow(/10/);

		await store.appeal("thread", id, "Era un aviso del barrio, no spam.");
		await expect(
			store.appeal("thread", id, "Otra vez, por favor revisen."),
		).rejects.toThrow(/Ya pediste/);

		const queue = await store.listModerationQueue();
		expect(queue.find((item) => item.id === id)?.appeal?.message).toMatch(
			/aviso del barrio/,
		);
	});

	it("closes the appeal when the city decides", async () => {
		const id = await removedThread();
		await store.appeal("thread", id, "Era un aviso del barrio, no spam.");
		await store.moderate("thread", id, "approve");
		expect((await store.listMyRemoved()).length).toBe(0);
		expect((await store.listModerationQueue()).some((i) => i.id === id)).toBe(
			false,
		);
	});

	it("keeps it final when the city upholds the removal", async () => {
		const id = await removedThread();
		await store.appeal("thread", id, "Era un aviso del barrio, no spam.");
		await store.moderate("thread", id, "remove");
		expect(await store.listMyRemoved()).toMatchObject([
			{ appealStatus: "upheld" },
		]);
		expect((await store.listModerationQueue()).some((i) => i.id === id)).toBe(
			false,
		);
	});

	it("does not let someone else appeal", async () => {
		const id = await removedThread();
		await signUp(store, "Beto");
		await expect(
			store.appeal("thread", id, "Quiero apelar lo de otra persona."),
		).rejects.toThrow(/quien lo publicó/);
	});
});

describe("device store corroboration", () => {
	const hueco = (placeId: string | null) => ({
		title: "Hueco grande en la calle",
		body: "Hay un hueco peligroso y los carros frenan de golpe.",
		category: "mobility" as const,
		placeId,
		eventId: null,
	});

	it("raises risk reports to emergency when three different people report the same place", async () => {
		const ids: string[] = [];
		for (const name of ["Ana", "Beto"]) {
			await signUp(store, name);
			const { record } = await store.createThread(
				hueco("place-gran-malecon"),
			);
			ids.push(record?.id ?? "");
		}
		let queue = await store.listModerationQueue();
		expect(queue.every((item) => item.priority === "city_attention")).toBe(
			true,
		);

		await signUp(store, "Caro");
		const { record } = await store.createThread(hueco("place-gran-malecon"));
		ids.push(record?.id ?? "");
		queue = await store.listModerationQueue();
		for (const id of ids) {
			expect(queue.find((item) => item.id === id)?.priority).toBe("emergency");
		}
	});

	it("does not corroborate reports at different places", async () => {
		for (const [name, place] of [
			["Ana", "place-gran-malecon"],
			["Beto", "place-bocas-de-ceniza"],
			["Caro", null],
		] as const) {
			await signUp(store, name);
			await store.createThread(hueco(place));
		}
		const queue = await store.listModerationQueue();
		expect(queue.some((item) => item.priority === "emergency")).toBe(false);
	});
});
