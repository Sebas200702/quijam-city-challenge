import { defineMiddleware } from "astro:middleware";
import {
	buildCsp,
	cspHeaderName,
	inlineScriptHashes,
	parseCspMode,
} from "./lib/security/csp";

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

/** CSP_MODE is read at run time, so it can be switched in Dokploy without a rebuild. */
function cspMode() {
	const fromProcess =
		typeof process === "undefined" ? undefined : process.env.CSP_MODE;
	return parseCspMode(fromProcess ?? import.meta.env.CSP_MODE);
}

/**
 * Adds baseline security headers to every response, and a Content-Security-Policy
 * to HTML pages with the hashes of the inline scripts that page ships.
 */
export const onRequest = defineMiddleware(async (context, next) => {
	const response = await next();
	const mode = cspMode();
	const isHtml = response.headers.get("Content-Type")?.includes("text/html");

	if (mode !== "off" && isHtml && response.body) {
		const html = await response.text();
		const headers = new Headers(response.headers);
		setMissing(headers);
		headers.set(
			cspHeaderName(mode),
			buildCsp({
				scriptHashes: await inlineScriptHashes(html),
				supabaseUrl: import.meta.env.PUBLIC_SUPABASE_URL,
				pathname: context.url.pathname,
			}),
		);
		return new Response(html, {
			status: response.status,
			statusText: response.statusText,
			headers,
		});
	}

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
