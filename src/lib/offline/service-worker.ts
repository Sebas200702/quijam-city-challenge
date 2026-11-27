// The QUILLART service worker, served at /sw.js. Bundled on its own by
// src/lib/offline/service-worker-integration.ts after `astro build`, which
// also fills in the build version and the list of files to save. Production
// only: `astro dev` never registers it.

import { notificationTarget } from "../notifications/app-notification";
import {
	type CacheRoute,
	cacheNameFor,
	cacheRouteFor,
	OFFLINE_FALLBACK_PAGE,
	PAGE_NETWORK_TIMEOUT_MS,
	precacheName,
	RUNTIME_CACHE_LIMIT,
	staleCacheNames,
	TILE_CACHE_LIMIT,
} from "./offline-cache";

declare const __SW_VERSION__: string;
declare const __PRECACHE__: string[];

// The DOM library has no service worker types, and adding the WebWorker one
// clashes with it in the same program: only what this file uses.
interface ExtendableEvent extends Event {
	waitUntil(promise: Promise<unknown>): void;
}
interface FetchEvent extends ExtendableEvent {
	request: Request;
	respondWith(response: Response | Promise<Response>): void;
}
interface NotificationEvent extends ExtendableEvent {
	notification: Notification;
}
interface WindowClient {
	url: string;
	focus(): Promise<WindowClient>;
	navigate(url: string): Promise<WindowClient | null>;
}
interface WorkerScope {
	location: Location;
	skipWaiting(): Promise<void>;
	clients: {
		claim(): Promise<void>;
		matchAll(options: {
			type: "window";
			includeUncontrolled: boolean;
		}): Promise<WindowClient[]>;
		openWindow(url: string): Promise<WindowClient | null>;
	};
	addEventListener(
		type: "install" | "activate",
		listener: (event: ExtendableEvent) => void,
	): void;
	addEventListener(type: "fetch", listener: (event: FetchEvent) => void): void;
	addEventListener(
		type: "notificationclick",
		listener: (event: NotificationEvent) => void,
	): void;
}

const worker = self as unknown as WorkerScope;
const VERSION = __SW_VERSION__;

worker.addEventListener("install", (event) => {
	event.waitUntil(
		(async () => {
			const cache = await caches.open(precacheName(VERSION));
			// One failed file must not block the rest: the app still opens.
			await Promise.allSettled(
				__PRECACHE__.map((url) =>
					cache.add(new Request(url, { cache: "reload" })),
				),
			);
			await worker.skipWaiting();
		})(),
	);
});

worker.addEventListener("activate", (event) => {
	event.waitUntil(
		(async () => {
			const stale = staleCacheNames(await caches.keys(), VERSION);
			await Promise.all(stale.map((name) => caches.delete(name)));
			await worker.clients.claim();
		})(),
	);
});

worker.addEventListener("fetch", (event) => {
	const { request } = event;
	const route = cacheRouteFor(request, worker.location.origin);
	if (route === "bypass") return;
	event.respondWith(handle(route, request));
});

// A tapped notification (arroyo alert, later event reminders) opens its page
// in the app window that is already open, or in a new one.
worker.addEventListener("notificationclick", (event) => {
	event.notification.close();
	const target = notificationTarget(
		event.notification.data,
		worker.location.origin,
	);
	event.waitUntil(
		(async () => {
			const windows = await worker.clients.matchAll({
				type: "window",
				includeUncontrolled: true,
			});
			const open = windows.find(
				(client) => new URL(client.url).origin === worker.location.origin,
			);
			if (open) {
				try {
					await open.focus();
					if (open.url !== target) await open.navigate(target);
					return;
				} catch {
					// Not controlled by this worker: open a new window instead.
				}
			}
			await worker.clients.openWindow(target);
		})(),
	);
});

function handle(
	route: Exclude<CacheRoute, "bypass">,
	request: Request,
): Promise<Response> {
	const cacheName = cacheNameFor(route, VERSION);
	switch (route) {
		case "page":
			return pageResponse(request, cacheName);
		case "asset":
			return cacheFirst(request, cacheName, null);
		case "tile":
			return cacheFirst(request, cacheName, TILE_CACHE_LIMIT);
		case "static":
			return staleWhileRevalidate(request, cacheName);
		case "data":
			return networkFirst(request, cacheName);
	}
}

/** Only complete, same-request answers are worth keeping. */
function storable(response: Response): boolean {
	return response.ok && !response.redirected && response.type !== "opaque";
}

async function save(
	cacheName: string,
	request: Request,
	response: Response,
	limit: number | null,
): Promise<void> {
	if (!storable(response)) return;
	const cache = await caches.open(cacheName);
	await cache.put(request, response);
	if (limit === null) return;
	const keys = await cache.keys();
	// Keys come back in insertion order: drop the oldest.
	await Promise.all(
		keys
			.slice(0, Math.max(0, keys.length - limit))
			.map((key) => cache.delete(key)),
	);
}

async function cacheFirst(
	request: Request,
	cacheName: string,
	limit: number | null,
): Promise<Response> {
	const cached = await caches.match(request);
	if (cached) return cached;
	try {
		const response = await fetch(request);
		await save(cacheName, request, response.clone(), limit);
		return response;
	} catch {
		// A missing tile or file: the page handles the error (the map shows its own state).
		return Response.error();
	}
}

async function staleWhileRevalidate(
	request: Request,
	cacheName: string,
): Promise<Response> {
	const cached = await caches.match(request);
	const refresh = fetch(request).then(async (response) => {
		await save(cacheName, request, response.clone(), RUNTIME_CACHE_LIMIT);
		return response;
	});
	if (cached) {
		refresh.catch(() => undefined);
		return cached;
	}
	return refresh.catch(() => Response.error());
}

async function networkFirst(
	request: Request,
	cacheName: string,
): Promise<Response> {
	try {
		const response = await fetch(request);
		await save(cacheName, request, response.clone(), RUNTIME_CACHE_LIMIT);
		return response;
	} catch {
		return (
			(await caches.match(request, { ignoreVary: true })) ?? Response.error()
		);
	}
}

function timeout(ms: number): Promise<never> {
	return new Promise((_, reject) =>
		setTimeout(() => reject(new Error("timeout")), ms),
	);
}

async function savedPage(
	request: Request,
	cacheName: string,
): Promise<Response | undefined> {
	const fresh = await caches.open(cacheName);
	return (
		// The copy from the last visit first, then the one saved on install.
		(await fresh.match(request, { ignoreVary: true })) ??
		(await caches.match(request, { ignoreVary: true })) ??
		// `/inicio?q=…` opens the saved `/inicio`: the islands read the query.
		(await caches.match(new URL(request.url).pathname, { ignoreVary: true }))
	);
}

/** Network first with a short wait; then the saved page; then the offline page. */
async function pageResponse(
	request: Request,
	cacheName: string,
): Promise<Response> {
	const network = fetch(request).then(async (response) => {
		await save(cacheName, request, response.clone(), RUNTIME_CACHE_LIMIT);
		return response;
	});
	try {
		return await Promise.race([network, timeout(PAGE_NETWORK_TIMEOUT_MS)]);
	} catch {
		const saved = await savedPage(request, cacheName);
		if (saved) {
			network.catch(() => undefined);
			return saved;
		}
	}
	try {
		return await network;
	} catch {
		return (
			(await caches.match(OFFLINE_FALLBACK_PAGE)) ??
			new Response(
				'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>QUILLART</title><p style="font:16px system-ui;padding:24px">Sin conexión. <a href="/inicio">Volver a Quillart</a></p>',
				{ headers: { "Content-Type": "text/html; charset=utf-8" } },
			)
		);
	}
}
