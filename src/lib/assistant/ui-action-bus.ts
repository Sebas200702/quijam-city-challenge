// The browser side of UI actions: screens register a handler per action type
// (the agenda filters itself, the map draws a route), and the dispatcher
// applies Quillart AI's actions to the screen the person is on. When no
// screen here can apply an action that asks for it, the dispatcher opens the
// screen that can, by URL, and leaves the action pending so that screen
// applies it once it is ready. Every change can be undone.
//
// No `window` events: a plain module with subscribers, so it is testable and
// any island (the dock, the map, a list) can join.

import type { UiAction, UiActionOf, UiActionType } from "./ui-action-types";
import { sanitizeUiActions, uiActionHref } from "./ui-actions";

/** What a screen did with an action: chips for the dock and how to undo it. */
export interface UiApplied {
	/** Short words for the change chips ("Música", "Este finde"). */
	labels: string[];
	undo?: () => void;
}

export type UiHandler<T extends UiActionType> = (
	action: UiActionOf<T>,
) => UiApplied | null;

/** One change the person sees, marked as made by the agent. */
export interface UiChange {
	action: UiAction;
	labels: string[];
	undo: () => void;
}

/** A screen to open for the actions this one could not apply. */
export interface UiNavigation {
	href: string;
	/** Applied by the new screen once it is ready. */
	pending: UiAction[];
}

export interface UiDispatchResult {
	changes: UiChange[];
	/** Not followed yet: the caller opens it when its own work is saved. */
	navigation: UiNavigation | null;
}

export interface UiBusEnv {
	pathname: () => string;
	navigate: (href: string) => void;
	back: () => void;
	/** Scrolls to and highlights an element, without stealing the focus. */
	focus: (id: string) => boolean;
	storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null;
	now: () => number;
}

/** Pending actions survive one navigation, for a short while. */
export const PENDING_KEY = "quillart-ui-pending";
export const PENDING_TTL_MS = 60_000;

interface Pending {
	path: string;
	at: number;
	actions: UiAction[];
}

type AnyHandler = (action: UiAction) => UiApplied | null;
type ChangeListener = (changes: UiChange[]) => void;

export interface UiBus {
	register<T extends UiActionType>(type: T, handler: UiHandler<T>): () => void;
	has(type: UiActionType): boolean;
	/** Applies what this screen can; never navigates by itself. */
	dispatch(actions: readonly unknown[]): UiDispatchResult;
	/** Opens the screen of a dispatch, leaving its actions pending there. */
	follow(navigation: UiNavigation): void;
	/** The dock listens to show "acted" chips and the undo button. */
	onChange(listener: ChangeListener): () => void;
}

function pathOf(href: string): string {
	return href.split("?")[0] || "/";
}

export function createUiBus(env: UiBusEnv): UiBus {
	const handlers = new Map<UiActionType, AnyHandler>();
	const listeners = new Set<ChangeListener>();
	let pending: UiAction[] = readPending();

	function readPending(): UiAction[] {
		try {
			const raw = env.storage?.getItem(PENDING_KEY);
			if (!raw) return [];
			env.storage?.removeItem(PENDING_KEY);
			const saved = JSON.parse(raw) as Partial<Pending>;
			const fresh =
				typeof saved.at === "number" &&
				env.now() - saved.at <= PENDING_TTL_MS &&
				saved.path === env.pathname();
			return fresh ? sanitizeUiActions(saved.actions) : [];
		} catch {
			return [];
		}
	}

	function savePending(path: string, actions: UiAction[]) {
		try {
			env.storage?.setItem(
				PENDING_KEY,
				JSON.stringify({ path, at: env.now(), actions } satisfies Pending),
			);
		} catch {
			// Storage blocked: the URL alone still opens the right screen.
		}
	}

	/** The latest changes, for a dock that mounts after a screen applied them. */
	let recent: UiChange[] = [];

	function emit(changes: UiChange[]) {
		if (changes.length === 0) return;
		recent = changes;
		for (const listener of listeners) listener(changes);
	}

	function apply(action: UiAction, afterNavigation: boolean): UiChange | null {
		if (action.type === "ui.focus") {
			env.focus(action.target);
			return null;
		}
		const handler = handlers.get(action.type);
		if (!handler) return null;
		const applied = handler(action);
		if (!applied) return null;
		// After opening another screen, "Deshacer" goes back to where the person was.
		const undo = afterNavigation ? env.back : (applied.undo ?? (() => {}));
		return { action, labels: applied.labels, undo };
	}

	return {
		register(type, handler) {
			handlers.set(type, handler as AnyHandler);
			// An action left for this screen applies as soon as the screen can.
			const ready = pending.filter((action) => action.type === type);
			pending = pending.filter((action) => action.type !== type);
			emit(
				ready
					.map((action) => apply(action, true))
					.filter((change): change is UiChange => change !== null),
			);
			return () => {
				if (handlers.get(type) === handler) handlers.delete(type);
			};
		},
		has: (type) => type === "ui.focus" || handlers.has(type),
		dispatch(input) {
			const actions = sanitizeUiActions(input);
			const changes: UiChange[] = [];
			let href: string | null = null;
			const leftover: UiAction[] = [];
			for (const action of actions) {
				if (href) {
					leftover.push(action);
					continue;
				}
				if (action.type === "ui.open") {
					if (
						pathOf(action.path) !== env.pathname() ||
						action.path.includes("?")
					) {
						href = action.path;
					}
					continue;
				}
				const change = apply(action, false);
				if (change) {
					changes.push(change);
					continue;
				}
				const target = action.navigate ? uiActionHref(action) : null;
				if (target && pathOf(target) !== env.pathname()) {
					href = target;
					leftover.push(action);
				}
			}
			emit(changes);
			if (!href) return { changes, navigation: null };
			const path = pathOf(href);
			// Only what the new screen can apply travels with it.
			const pending = leftover.filter((action) => {
				const own = uiActionHref(action);
				return !own || pathOf(own) === path;
			});
			return { changes, navigation: { href, pending } };
		},
		follow(navigation) {
			if (navigation.pending.length > 0) {
				savePending(pathOf(navigation.href), navigation.pending);
			}
			env.navigate(navigation.href);
		},
		onChange(listener) {
			listeners.add(listener);
			if (recent.length > 0) listener(recent);
			return () => listeners.delete(listener);
		},
	};
}

function browserEnv(): UiBusEnv {
	return {
		pathname: () => window.location.pathname.replace(/\/+$/, "") || "/",
		navigate: (href) => window.location.assign(href),
		back: () => window.history.back(),
		focus: (id) => {
			const element = document.getElementById(id);
			if (!element) return false;
			element.scrollIntoView({ block: "center" });
			element.classList.add("q-agent-highlight");
			window.setTimeout(
				() => element.classList.remove("q-agent-highlight"),
				2400,
			);
			return true;
		},
		storage: (() => {
			try {
				return window.sessionStorage;
			} catch {
				return null;
			}
		})(),
		now: () => Date.now(),
	};
}

let shared: UiBus | null = null;

/** The page's one bus (created on first use, in the browser). */
export function uiBus(): UiBus {
	shared ??= createUiBus(browserEnv());
	return shared;
}
