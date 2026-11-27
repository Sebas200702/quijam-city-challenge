import { describe, expect, it, vi } from "vitest";
import {
	createUiBus,
	PENDING_KEY,
	PENDING_TTL_MS,
	type UiBusEnv,
} from "./ui-action-bus";

function memoryStorage() {
	const data = new Map<string, string>();
	return {
		getItem: (key: string) => data.get(key) ?? null,
		setItem: (key: string, value: string) => void data.set(key, value),
		removeItem: (key: string) => void data.delete(key),
		data,
	};
}

function env(overrides: Partial<UiBusEnv> = {}) {
	const storage = memoryStorage();
	const value: UiBusEnv & { storage: ReturnType<typeof memoryStorage> } = {
		pathname: () => "/agenda",
		navigate: vi.fn(),
		back: vi.fn(),
		focus: vi.fn(() => true),
		storage,
		now: () => 1_000,
		...overrides,
	} as UiBusEnv & { storage: ReturnType<typeof memoryStorage> };
	return value;
}

describe("UI action dispatcher", () => {
	it("applies an action the screen registered, with chips and undo", () => {
		const bus = createUiBus(env());
		const undo = vi.fn();
		const handler = vi.fn(() => ({ labels: ["Música"], undo }));
		bus.register("agenda.filter", handler);
		const listener = vi.fn();
		bus.onChange(listener);

		const result = bus.dispatch([
			{ type: "agenda.filter", categoria: "music" },
		]);

		expect(handler).toHaveBeenCalledWith({
			type: "agenda.filter",
			categoria: "music",
		});
		expect(result.navigation).toBeNull();
		expect(result.changes[0].labels).toEqual(["Música"]);
		expect(listener).toHaveBeenCalledWith(result.changes);
		result.changes[0].undo();
		expect(undo).toHaveBeenCalled();
	});

	it("validates again in the browser: a forged action never reaches a handler", () => {
		const bus = createUiBus(env());
		const handler = vi.fn(() => ({ labels: [] }));
		bus.register("ui.open", handler);
		const result = bus.dispatch([
			{ type: "ui.open", path: "https://evil.example" },
			{ type: "agenda.filter", categoria: "<script>" },
		]);
		expect(handler).not.toHaveBeenCalled();
		expect(result).toEqual({ changes: [], navigation: null });
	});

	it("leaves an action to the conversation when no screen applies it and it does not ask to navigate", () => {
		const bus = createUiBus(env({ pathname: () => "/inicio" }));
		const result = bus.dispatch([
			{ type: "agenda.filter", categoria: "music" },
		]);
		expect(result).toEqual({ changes: [], navigation: null });
	});

	it("opens the right screen by URL and leaves the action pending there", () => {
		const e = env({ pathname: () => "/inicio" });
		const bus = createUiBus(e);
		const result = bus.dispatch([
			{ type: "map.showRoute", destino: "estadio", navigate: true },
			{
				type: "map.drop",
				pins: [{ lat: 11, lng: -74.8, label: "Malecón", kind: "place" }],
			},
			{ type: "agenda.filter", categoria: "music" },
		]);
		expect(result.navigation?.href).toBe("/mapa?destino=estadio");
		// Only what the map can apply travels with it.
		expect(result.navigation?.pending.map((action) => action.type)).toEqual([
			"map.showRoute",
			"map.drop",
		]);
		expect(e.navigate).not.toHaveBeenCalled();
		if (!result.navigation) throw new Error("expected a navigation");
		bus.follow(result.navigation);
		expect(e.navigate).toHaveBeenCalledWith("/mapa?destino=estadio");
		expect(JSON.parse(e.storage.data.get(PENDING_KEY) ?? "{}").path).toBe(
			"/mapa",
		);
	});

	it("applies pending actions when the new screen registers, and undo goes back", () => {
		const storage = memoryStorage();
		storage.setItem(
			PENDING_KEY,
			JSON.stringify({
				path: "/mapa",
				at: 1_000,
				actions: [{ type: "map.showRoute", destino: "centro", navigate: true }],
			}),
		);
		const e = env({ pathname: () => "/mapa", storage });
		const bus = createUiBus(e);
		const listener = vi.fn();
		bus.onChange(listener);
		const handler = vi.fn(() => ({ labels: ["Ruta a Centro"] }));
		bus.register("map.showRoute", handler);

		expect(handler).toHaveBeenCalledTimes(1);
		const [changes] = listener.mock.calls[0];
		changes[0].undo();
		expect(e.back).toHaveBeenCalled();
		expect(storage.getItem(PENDING_KEY)).toBeNull();
	});

	it("ignores stale or foreign pending actions", () => {
		const storage = memoryStorage();
		storage.setItem(
			PENDING_KEY,
			JSON.stringify({
				path: "/mapa",
				at: 0,
				actions: [{ type: "map.showRoute", destino: "centro" }],
			}),
		);
		const bus = createUiBus(
			env({ pathname: () => "/mapa", storage, now: () => PENDING_TTL_MS + 1 }),
		);
		const handler = vi.fn(() => ({ labels: [] }));
		bus.register("map.showRoute", handler);
		expect(handler).not.toHaveBeenCalled();
	});

	it("focuses without a handler and stops listening on unregister", () => {
		const e = env();
		const bus = createUiBus(e);
		bus.dispatch([{ type: "ui.focus", target: "agenda-results" }]);
		expect(e.focus).toHaveBeenCalledWith("agenda-results");

		const handler = vi.fn(() => ({ labels: [] }));
		const off = bus.register("places.filter", handler);
		off();
		expect(bus.has("places.filter")).toBe(false);
	});
});
