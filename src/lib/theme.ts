// The page theme (light by default, dark optional), outside React: the theme
// toggle and Quillart AI's `app.theme` action both change it through here, so
// every island that follows the change event (or `data-theme`) stays in step.

export type Theme = "light" | "dark";

/** Same key the base layout's inline script reads to apply it before paint. */
export const THEME_STORAGE_KEY = "quillart-theme";

/** Fired on `window` after the theme changes, with `{ theme }` as detail. */
export const THEME_CHANGE_EVENT = "quillart-theme-change";

export function isTheme(value: unknown): value is Theme {
	return value === "light" || value === "dark";
}

/** The theme on screen now (light on the server). */
export function readTheme(): Theme {
	if (typeof document === "undefined") return "light";
	return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

/** Applies the theme to the page, keeps it on this device and announces it. */
export function applyTheme(next: Theme): void {
	if (typeof document === "undefined") return;
	document.documentElement.dataset.theme = next;
	try {
		localStorage.setItem(THEME_STORAGE_KEY, next);
	} catch {
		// Storage can be blocked (private mode); the theme still applies to this visit.
	}
	window.dispatchEvent(
		new CustomEvent(THEME_CHANGE_EVENT, { detail: { theme: next } }),
	);
}
