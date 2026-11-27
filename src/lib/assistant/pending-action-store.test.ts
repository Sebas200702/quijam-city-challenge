import { describe, expect, it } from "vitest";
import { answer } from "./assistant-server";
import {
	clearPendingAction,
	loadPendingAction,
	PENDING_ACTION_KEY,
	PENDING_ACTION_TTL_MS,
	savePendingAction,
} from "./pending-action-store";

function memoryStorage() {
	const data = new Map<string, string>();
	return {
		getItem: (key: string) => data.get(key) ?? null,
		setItem: (key: string, value: string) => void data.set(key, value),
		removeItem: (key: string) => void data.delete(key),
		data,
	};
}

const draft = {
	messages: [{ role: "user", text: "Publica la limpieza del sábado" }],
	batch: { remaining: [{ id: "c1", name: "create_event", args: {} }] },
};

describe("pending action kept across signing in (U02)", () => {
	it("comes back after signing in, even in another tab", () => {
		const storage = memoryStorage();
		savePendingAction(storage, draft, 1_000);
		expect(loadPendingAction(storage, 1_000 + 60_000)).toEqual(draft);
	});

	it("is dropped when too old, from the future or broken", () => {
		const storage = memoryStorage();
		savePendingAction(storage, draft, 1_000);
		expect(
			loadPendingAction(storage, 1_000 + PENDING_ACTION_TTL_MS + 1),
		).toBeNull();
		expect(storage.data.has(PENDING_ACTION_KEY)).toBe(false);

		savePendingAction(storage, draft, 5_000);
		expect(loadPendingAction(storage, 1_000)).toBeNull();

		storage.setItem(PENDING_ACTION_KEY, "{not json");
		expect(loadPendingAction(storage, 1_000)).toBeNull();
	});

	it("is cleared once the action is confirmed or cancelled", () => {
		const storage = memoryStorage();
		savePendingAction(storage, draft, 1_000);
		clearPendingAction(storage);
		expect(loadPendingAction(storage, 1_000)).toBeNull();
	});

	it("works without storage at all", () => {
		expect(() => savePendingAction(null, draft)).not.toThrow();
		expect(loadPendingAction(null)).toBeNull();
	});

	it("the server keeps the drafted action for a signed-out person", async () => {
		let id = 0;
		const response = await answer(
			{
				messages: [
					{
						role: "user",
						text: "Quiero publicar un evento: limpieza del arroyo en Rebolo el sábado a las 8 am",
					},
				],
				context: {
					now: "2026-11-26T15:00:00.000Z",
					signedIn: false,
					displayName: null,
					isVisitor: null,
					fromPath: null,
				},
			},
			{ openJev: null, gemini: null, newId: () => `id-${++id}` },
		);
		expect(response.toolCalls).toEqual([
			expect.objectContaining({
				name: "create_event",
				args: expect.objectContaining({
					title: "Limpieza del arroyo en Rebolo",
					starts_at_local: "2026-11-28T08:00",
				}),
			}),
		]);
		expect(response.text).toMatch(/Entra a tu cuenta/);
	});
});
