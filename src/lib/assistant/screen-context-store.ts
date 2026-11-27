// The browser's copy of the screen context: each screen publishes what the
// person is looking at (or updates a part of it, like the map view) and the
// agent dock reads it for the "viendo …" line and sends it with each request.
// Plain module state with subscribers, so it works across React islands.

import type { ScreenContext, ScreenRole } from "./screen-context-types";

type Listener = () => void;

export interface ScreenContextStore {
	get(): ScreenContext;
	/** A screen says what it shows; replaces what the previous screen said. */
	publish(screen: Partial<ScreenContext>): void;
	/** Changes part of the current screen (filters, map view, draft). */
	update(patch: Partial<ScreenContext>): void;
	/** The screen went away: back to the page defaults. */
	reset(): void;
	/** Base values for this page: its route, title and surface role. */
	setDefaults(defaults: Partial<ScreenContext>): void;
	subscribe(listener: Listener): () => void;
}

/** Turns "/agenda/123" into "/agenda/[id]"; the id goes in `entity`. */
export function routePattern(pathname: string): string {
	const path = pathname.replace(/\/+$/, "") || "/";
	const parts = path.split("/");
	if (parts.length !== 3) return path;
	const [, section, item] = parts;
	if (section === "agenda" && item !== "nuevo") return "/agenda/[id]";
	if (section === "foro") return "/foro/[id]";
	if (section === "lugares") return "/lugares/[slug]";
	return path;
}

/** Drops empty values so the context stays small and comparable. */
function compact(screen: ScreenContext): ScreenContext {
	const next: ScreenContext = { ...screen };
	if (next.filters) {
		const filters = Object.fromEntries(
			Object.entries(next.filters).filter(([, value]) => value.trim() !== ""),
		);
		if (Object.keys(filters).length > 0) next.filters = filters;
		else delete next.filters;
	}
	if (next.draft) {
		const fields = Object.fromEntries(
			Object.entries(next.draft.fields).filter(
				([, value]) => typeof value === "string" && value.trim() !== "",
			),
		);
		if (Object.keys(fields).length > 0) next.draft = { ...next.draft, fields };
		else delete next.draft;
	}
	for (const key of ["entity", "map", "zone"] as const) {
		if (next[key] === undefined) delete next[key];
	}
	return next;
}

export function createScreenContextStore(
	initial: { route?: string; title?: string; role?: ScreenRole } = {},
): ScreenContextStore {
	let defaults: ScreenContext = {
		route: initial.route ?? "/",
		title: initial.title ?? "",
		role: initial.role ?? "visitor",
	};
	let current: ScreenContext = defaults;
	const listeners = new Set<Listener>();
	const emit = () => {
		for (const listener of listeners) listener();
	};
	const set = (next: ScreenContext) => {
		current = compact(next);
		emit();
	};
	return {
		get: () => current,
		publish: (screen) => set({ ...defaults, ...screen }),
		update: (patch) => set({ ...current, ...patch }),
		reset: () => set(defaults),
		setDefaults: (values) => {
			defaults = { ...defaults, ...values };
			set({ ...current, ...values });
		},
		subscribe: (listener) => {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
	};
}

function pageDefaults(): Partial<ScreenContext> {
	if (typeof window === "undefined") return {};
	return {
		route: routePattern(window.location.pathname),
		title: document.title.split("·")[0]?.trim() ?? "",
	};
}

/** The one store of this page. */
export const screenContext: ScreenContextStore = createScreenContextStore(
	pageDefaults(),
);

/** Kept for this tab: the person can stop sharing the screen from the dock. */
const SHARE_KEY = "quillart-share-screen";

export function isScreenShared(): boolean {
	try {
		return sessionStorage.getItem(SHARE_KEY) !== "off";
	} catch {
		return true;
	}
}

export function setScreenShared(on: boolean): void {
	try {
		if (on) sessionStorage.removeItem(SHARE_KEY);
		else sessionStorage.setItem(SHARE_KEY, "off");
	} catch {
		// Storage blocked: the choice lasts until the page changes.
	}
}
