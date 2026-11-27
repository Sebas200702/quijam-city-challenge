import { describe, expect, it } from "vitest";
import {
	cacheNameFor,
	cacheRouteFor,
	OFFLINE_FALLBACK_PAGE,
	OFFLINE_PAGES,
	precacheName,
	precacheUrls,
	staleCacheNames,
} from "./offline-cache";

const ORIGIN = "https://quillart.example";
const get = (path: string, mode?: string) => ({
	method: "GET",
	url: path.startsWith("http") ? path : `${ORIGIN}${path}`,
	mode,
});

describe("cacheRouteFor", () => {
	it("never touches a POST, even to a cached page", () => {
		expect(
			cacheRouteFor({ method: "POST", url: `${ORIGIN}/api/assistant` }, ORIGIN),
		).toBe("bypass");
		expect(
			cacheRouteFor(
				{ method: "POST", url: `${ORIGIN}/inicio`, mode: "navigate" },
				ORIGIN,
			),
		).toBe("bypass");
	});

	it("leaves every API call and the worker itself to the network", () => {
		expect(cacheRouteFor(get("/api/datos"), ORIGIN)).toBe("bypass");
		expect(cacheRouteFor(get("/sw.js"), ORIGIN)).toBe("bypass");
	});

	it("serves pages network first and hashed build files cache first", () => {
		expect(cacheRouteFor(get("/mapa", "navigate"), ORIGIN)).toBe("page");
		expect(cacheRouteFor(get("/inicio?q=hola", "navigate"), ORIGIN)).toBe(
			"page",
		);
		expect(cacheRouteFor(get("/_astro/client.CupJWFfv.js"), ORIGIN)).toBe(
			"asset",
		);
	});

	it("revalidates icons, illustrations, the manifest and fonts", () => {
		for (const path of [
			"/icons/icon-192.png",
			"/illustrations/the-search.svg",
			"/favicon.svg",
			"/manifest.webmanifest",
			"https://fonts.gstatic.com/s/inter/v1/font.woff2",
		]) {
			expect(cacheRouteFor(get(path), ORIGIN)).toBe("static");
		}
	});

	it("keeps map tiles and the places catalog, nothing else from other sites", () => {
		expect(
			cacheRouteFor(get("https://tile.openstreetmap.org/15/1/2.png"), ORIGIN),
		).toBe("tile");
		expect(
			cacheRouteFor(
				get("https://abc.supabase.co/rest/v1/places?select=*"),
				ORIGIN,
			),
		).toBe("data");
		expect(
			cacheRouteFor(
				get("https://abc.supabase.co/rest/v1/profiles?select=*"),
				ORIGIN,
			),
		).toBe("bypass");
		expect(
			cacheRouteFor(get("https://abc.supabase.co/auth/v1/user"), ORIGIN),
		).toBe("bypass");
	});

	it("ignores unknown same-origin files and non-http schemes", () => {
		expect(cacheRouteFor(get("/robots.txt"), ORIGIN)).toBe("bypass");
		expect(
			cacheRouteFor({ method: "GET", url: "chrome-extension://x/y" }, ORIGIN),
		).toBe("bypass");
	});
});

describe("precacheUrls", () => {
	it("saves the offline pages and the build files, without the worker or maps", () => {
		const urls = precacheUrls([
			"_astro\\client.abc.js",
			"icons/icon-192.png",
			"sw.js",
			"_astro/client.abc.js.map",
			"_astro/client.abc.js",
		]);
		expect(urls).toEqual([
			...OFFLINE_PAGES,
			OFFLINE_FALLBACK_PAGE,
			"/_astro/client.abc.js",
			"/icons/icon-192.png",
		]);
	});
});

describe("staleCacheNames", () => {
	it("deletes only QUILLART caches from another build", () => {
		const existing = [
			precacheName("old"),
			cacheNameFor("page", "old"),
			precacheName("new"),
			cacheNameFor("page", "new"),
			cacheNameFor("tile", "new"),
			"someone-else",
		];
		expect(staleCacheNames(existing, "new")).toEqual([
			precacheName("old"),
			cacheNameFor("page", "old"),
		]);
	});
});
