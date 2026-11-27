// What the service worker (src/lib/offline/service-worker.ts) does with each
// request, and what it saves on install. Pure: no Cache API, no DOM, so the
// same rules run in the worker and in the tests.

/** Screens that must open without network (#47): Quillart AI, agenda, places and map. */
export const OFFLINE_PAGES = [
	"/inicio",
	"/agenda",
	"/lugares",
	"/mapa",
] as const;

/** Shown for a page that was never saved on the phone. Never a blank screen (rule 8). */
export const OFFLINE_FALLBACK_PAGE = "/offline";

/** A page waits this long for the network before the saved copy answers. */
export const PAGE_NETWORK_TIMEOUT_MS = 4_000;

/** Map tiles kept on the phone (about 15 kB each). The oldest go first. */
export const TILE_CACHE_LIMIT = 400;
/** Other runtime caches: pages, fonts and the places catalog. */
export const RUNTIME_CACHE_LIMIT = 60;

/**
 * - `bypass`: the worker does not answer; the browser goes to the network as
 *   usual. Every non-GET request (the /api POSTs) and every API call.
 * - `page`: network first, then the saved page, then the offline page.
 * - `asset`: cache first. Hashed build files never change.
 * - `static`: stale while revalidate. Icons, illustrations and fonts.
 * - `tile`: cache first with a size limit. Without it the map shows its
 *   own "no map background" state.
 * - `data`: network first, then the saved copy. The public places catalog.
 */
export type CacheRoute =
	| "bypass"
	| "page"
	| "asset"
	| "static"
	| "tile"
	| "data";

/** The parts of a Request the decision needs. */
export interface RequestFacts {
	method: string;
	url: string;
	/** `Request.mode`: "navigate" for a page load. */
	mode?: string;
}

const TILE_HOSTS = /(^|\.)tile\.openstreetmap\.org$/;
const FONT_HOSTS = new Set(["fonts.googleapis.com", "fonts.gstatic.com"]);
const STATIC_PATHS =
	/^\/(icons\/|illustrations\/|favicon\.|manifest\.webmanifest$)/;
/** Supabase REST path of the places catalog (public data). */
const PLACES_REST_PATH = "/rest/v1/places";

export function cacheRouteFor(
	request: RequestFacts,
	origin: string,
): CacheRoute {
	if (request.method !== "GET") return "bypass";
	let url: URL;
	try {
		url = new URL(request.url);
	} catch {
		return "bypass";
	}
	if (url.protocol !== "https:" && url.protocol !== "http:") return "bypass";

	if (url.origin === origin) {
		const path = url.pathname;
		if (path.startsWith("/api/") || path === "/sw.js") return "bypass";
		if (path.startsWith("/_astro/")) return "asset";
		if (request.mode === "navigate") return "page";
		if (STATIC_PATHS.test(path)) return "static";
		return "bypass";
	}

	if (TILE_HOSTS.test(url.hostname)) return "tile";
	if (FONT_HOSTS.has(url.hostname)) return "static";
	if (url.pathname === PLACES_REST_PATH) return "data";
	return "bypass";
}

/** Runtime cache for each route that stores responses. */
export function cacheNameFor(
	route: Exclude<CacheRoute, "bypass">,
	version: string,
): string {
	switch (route) {
		case "page":
			// Versioned: an old page points at build files that are gone.
			return `quillart-pages-${version}`;
		case "asset":
			return precacheName(version);
		case "static":
			return "quillart-static";
		case "tile":
			return "quillart-tiles";
		case "data":
			return "quillart-data";
	}
}

export function precacheName(version: string): string {
	return `quillart-precache-${version}`;
}

/** Caches from another build, to delete when this worker activates. */
export function staleCacheNames(
	existing: readonly string[],
	version: string,
): string[] {
	const keep = new Set([
		precacheName(version),
		cacheNameFor("page", version),
		cacheNameFor("static", version),
		cacheNameFor("tile", version),
		cacheNameFor("data", version),
	]);
	return existing.filter(
		(name) => name.startsWith("quillart-") && !keep.has(name),
	);
}

/**
 * URLs saved on install: the offline pages plus every file of the client
 * build (paths relative to dist/client, any separator). The worker itself and
 * source maps are left out.
 */
export function precacheUrls(buildFiles: readonly string[]): string[] {
	const files = buildFiles
		.map((file) => `/${file.replaceAll("\\", "/").replace(/^\/+/, "")}`)
		.filter((path) => path !== "/sw.js" && !path.endsWith(".map"))
		.sort();
	return [...OFFLINE_PAGES, OFFLINE_FALLBACK_PAGE, ...new Set(files)];
}
