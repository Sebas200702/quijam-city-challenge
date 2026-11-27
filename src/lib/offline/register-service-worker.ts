// Registers /sw.js in production builds only. In `astro dev` there is no
// worker file, and one left over from `astro preview` on the same port would
// serve stale files, so it is removed instead.

export function registerServiceWorker(): void {
	if (!("serviceWorker" in navigator)) return;
	if (!import.meta.env.PROD) {
		void navigator.serviceWorker
			.getRegistrations()
			.then((registrations) =>
				Promise.all(registrations.map((item) => item.unregister())),
			);
		return;
	}
	const register = () => {
		navigator.serviceWorker.register("/sw.js").catch((error: unknown) => {
			console.warn("[offline] service worker not registered", error);
		});
	};
	// After the page has loaded, so saving files never competes with the first paint.
	if (document.readyState === "complete") register();
	else window.addEventListener("load", register, { once: true });
}
