// The visitor's "reduce motion" setting, for motion started from code
// (map fly-to, smooth scrolling). CSS animations follow the same setting in
// design-system/quillart.css.

/** True when the visitor asked the system to reduce motion. */
export function prefersReducedMotion(): boolean {
	return (
		typeof window !== "undefined" &&
		typeof window.matchMedia === "function" &&
		window.matchMedia("(prefers-reduced-motion: reduce)").matches
	);
}

/** Scroll behaviour that respects the setting: smooth, or an instant jump. */
export function scrollBehavior(): ScrollBehavior {
	return prefersReducedMotion() ? "auto" : "smooth";
}
