import { defineMiddleware } from "astro:middleware";

// No Content-Security-Policy yet: Leaflet tiles, Google Fonts, Supabase and
// Gemini need a careful allowlist first.
const SECURITY_HEADERS: Record<string, string> = {
	"X-Content-Type-Options": "nosniff",
	"Referrer-Policy": "strict-origin-when-cross-origin",
	"X-Frame-Options": "SAMEORIGIN",
	// The voice Guide needs the microphone; the map may ask for location.
	"Permissions-Policy": "camera=(), geolocation=(self), microphone=(self)",
	"Cross-Origin-Opener-Policy": "same-origin",
};

function setMissing(headers: Headers): void {
	for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
		if (!headers.has(name)) headers.set(name, value);
	}
}

/** Adds baseline security headers to every response. */
export const onRequest = defineMiddleware(async (_context, next) => {
	const response = await next();
	try {
		setMissing(response.headers);
		return response;
	} catch {
		// Immutable headers (e.g. Response.redirect or a proxied fetch): rebuild.
		const headers = new Headers(response.headers);
		setMissing(headers);
		return new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers,
		});
	}
});
