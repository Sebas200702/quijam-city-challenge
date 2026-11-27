import { describe, expect, it, vi } from "vitest";
import { createScreenContextStore, routePattern } from "./screen-context-store";

describe("screen context store page title", () => {
	it("follows a translated page title while no screen named its own", () => {
		const store = createScreenContextStore({
			route: "/perfil",
			title: "Mi perfil",
		});
		store.setDefaultTitle("My profile");
		expect(store.get().title).toBe("My profile");
		store.reset();
		expect(store.get().title).toBe("My profile");
	});

	it("keeps the title a screen published", () => {
		const store = createScreenContextStore({
			route: "/agenda",
			title: "Agenda",
		});
		store.publish({ title: "Concierto en el Malecón" });
		store.setDefaultTitle("Things to do");
		expect(store.get().title).toBe("Concierto en el Malecón");
		store.reset();
		expect(store.get().title).toBe("Things to do");
	});
});

describe("routePattern", () => {
	it.each([
		["/agenda", "/agenda"],
		["/agenda/", "/agenda"],
		["/agenda/nuevo", "/agenda/nuevo"],
		["/agenda/abc-123", "/agenda/[id]"],
		["/foro/42", "/foro/[id]"],
		["/lugares/gran-malecon", "/lugares/[slug]"],
		["/", "/"],
	])("%s → %s", (path, pattern) => {
		expect(routePattern(path)).toBe(pattern);
	});
});

describe("screen context store", () => {
	it("starts from the page defaults", () => {
		const store = createScreenContextStore({
			route: "/agenda",
			title: "Agenda",
		});
		expect(store.get()).toEqual({
			route: "/agenda",
			title: "Agenda",
			role: "visitor",
		});
	});

	it("publishes a screen over the defaults and notifies listeners", () => {
		const store = createScreenContextStore({
			route: "/agenda",
			title: "Agenda",
		});
		const listener = vi.fn();
		store.subscribe(listener);
		store.publish({ filters: { categoria: "music" } });
		expect(store.get()).toMatchObject({
			route: "/agenda",
			filters: { categoria: "music" },
		});
		expect(listener).toHaveBeenCalledTimes(1);
	});

	it("updates one part and drops empty filters and drafts", () => {
		const store = createScreenContextStore({ route: "/agenda/nuevo" });
		store.publish({
			draft: { form: "event", fields: { title: "Limpieza" } },
		});
		store.update({ filters: { q: "  " } });
		expect(store.get().filters).toBeUndefined();
		expect(store.get().draft?.fields).toEqual({ title: "Limpieza" });
		store.update({ draft: { form: "event", fields: { title: "" } } });
		expect(store.get().draft).toBeUndefined();
	});

	it("resets to the defaults, keeping the surface role", () => {
		const store = createScreenContextStore({ route: "/ciudad" });
		store.setDefaults({ role: "city", title: "Centro de mando" });
		store.publish({
			entity: { kind: "floodZone", id: "ARR-1", name: "Arroyo" },
		});
		store.reset();
		expect(store.get()).toEqual({
			route: "/ciudad",
			title: "Centro de mando",
			role: "city",
		});
	});

	it("stops notifying after unsubscribe", () => {
		const store = createScreenContextStore();
		const listener = vi.fn();
		const off = store.subscribe(listener);
		off();
		store.update({ title: "x" });
		expect(listener).not.toHaveBeenCalled();
	});
});
