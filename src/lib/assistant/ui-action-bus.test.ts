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

	it("changes the language and theme on any screen, with chips and undo", () => {
		let language: "es" | "en" | "pt" | "fr" = "es";
		let theme: "light" | "dark" = "light";
		const e = env({
			pathname: () => "/foro",
			setLanguage: vi.fn((next) => {
				language = next;
			}),
			getLanguage: () => language,
			setTheme: vi.fn((next) => {
				theme = next;
			}),
			getTheme: () => theme,
		});
		const bus = createUiBus(e);
		expect(bus.has("app.language")).toBe(true);
		expect(bus.has("app.theme")).toBe(true);
		expect(bus.has("app.back")).toBe(true);
		const listener = vi.fn();
		bus.onChange(listener);

		const result = bus.dispatch([
			{ type: "app.language", language: "en", fromCall: "c1" },
			{ type: "app.theme", theme: "dark", fromCall: "c2" },
		]);

		expect(result.navigation).toBeNull();
		expect(language).toBe("en");
		expect(theme).toBe("dark");
		// The theme chip speaks the language just chosen.
		expect(result.changes.map((change) => change.labels)).toEqual([
			["English"],
			["Dark mode"],
		]);
		expect(listener).toHaveBeenCalledWith(result.changes);
		for (const change of [...result.changes].reverse()) change.undo();
		expect(language).toBe("es");
		expect(theme).toBe("light");
	});

	it("labels the theme in Spanish by default", () => {
		const e = env({ setTheme: vi.fn(), getTheme: () => "dark" });
		const [change] = createUiBus(e).dispatch([
			{ type: "app.theme", theme: "light" },
		]).changes;
		expect(change.labels).toEqual(["Modo claro"]);
		change.undo();
		expect(e.setTheme).toHaveBeenLastCalledWith("dark");
	});

	it("applies language and theme now even when the turn opens another screen", () => {
		const e = env({
			pathname: () => "/inicio",
			setLanguage: vi.fn(),
			getLanguage: () => "es",
		});
		const bus = createUiBus(e);
		const result = bus.dispatch([
			{ type: "ui.open", path: "/mapa" },
			{ type: "app.language", language: "fr" },
			{ type: "map.showRoute", destino: "centro", navigate: true },
		]);
		expect(e.setLanguage).toHaveBeenCalledWith("fr");
		expect(result.changes.map((change) => change.labels)).toEqual([
			["Français"],
		]);
		expect(result.navigation?.href).toBe("/mapa");
		// Never pending: the next screen must not replay it.
		expect(result.navigation?.pending.map((action) => action.type)).toEqual([
			"map.showRoute",
		]);
	});

	it("goes back as a navigation the caller follows, dropping what came after", () => {
		const e = env({ pathname: () => "/lugares" });
		const bus = createUiBus(e);
		const handler = vi.fn(() => ({ labels: ["Parques"] }));
		bus.register("places.filter", handler);

		const result = bus.dispatch([
			{ type: "places.filter", tipo: "park" },
			{ type: "app.back" },
			{ type: "places.filter", tipo: "waterfront" },
		]);

		expect(handler).toHaveBeenCalledTimes(1);
		expect(result.changes).toHaveLength(1);
		expect(result.navigation).toEqual({
			href: "/lugares",
			pending: [],
			back: true,
		});
		expect(e.back).not.toHaveBeenCalled();
		if (!result.navigation) throw new Error("expected a navigation");
		bus.follow(result.navigation);
		expect(e.back).toHaveBeenCalledTimes(1);
		expect(e.navigate).not.toHaveBeenCalled();
		expect(e.storage.data.has(PENDING_KEY)).toBe(false);
	});

	it("lets a screen opened earlier in the turn win over a later back", () => {
		const e = env({ pathname: () => "/inicio" });
		const bus = createUiBus(e);
		const result = bus.dispatch([
			{ type: "ui.open", path: "/agenda" },
			{ type: "app.back" },
		]);
		expect(result.navigation).toEqual({ href: "/agenda", pending: [] });
		if (!result.navigation) throw new Error("expected a navigation");
		bus.follow(result.navigation);
		expect(e.navigate).toHaveBeenCalledWith("/agenda");
		expect(e.back).not.toHaveBeenCalled();
	});

	it("never replays whole-app controls left in storage", () => {
		const storage = memoryStorage();
		storage.setItem(
			PENDING_KEY,
			JSON.stringify({
				path: "/mapa",
				at: 1_000,
				actions: [
					{ type: "app.theme", theme: "dark" },
					{ type: "map.showRoute", destino: "centro" },
				],
			}),
		);
		const e = env({ pathname: () => "/mapa", storage, setTheme: vi.fn() });
		const bus = createUiBus(e);
		const handler = vi.fn(() => ({ labels: [] }));
		bus.register("map.showRoute", handler);
		expect(handler).toHaveBeenCalledTimes(1);
		expect(e.setTheme).not.toHaveBeenCalled();
	});
});
