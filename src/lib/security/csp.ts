// Content-Security-Policy for every HTML page (issue #125).
//
// Scripts are strict: only our own files plus the exact inline scripts each
// page ships (theme script, Astro island loaders), allowed by their SHA-256.
// Styles allow 'unsafe-inline': Astro and React render style attributes, and
// the risk of injected CSS is far lower than injected script.

export type CspMode = "enforce" | "report-only" | "off";

/** Where the browser may connect, load from or be framed. */
const SOURCES = {
	/** OpenStreetMap tiles used by Leaflet in /mapa and the city dashboard. */
	tiles: ["https://tile.openstreetmap.org"],
	fontsCss: ["https://fonts.googleapis.com"],
	fontFiles: ["https://fonts.gstatic.com"],
	/** Gemini from the browser: the Live API over a websocket (ephemeral token). */
	gemini: [
		"https://generativelanguage.googleapis.com",
		"wss://generativelanguage.googleapis.com",
	],
} as const;

/** Pages that load an AudioWorklet from a blob URL (the voice test). */
const BLOB_WORKLET_PATHS = new Set(["/prueba-guia"]);

/** Reporting endpoint for violations (see src/pages/api/csp-report.ts). */
export const CSP_REPORT_PATH = "/api/csp-report";

/** "enforce" (default), "report-only" or "off", from CSP_MODE. */
export function parseCspMode(value: string | undefined): CspMode {
	const mode = value?.trim().toLowerCase();
	return mode === "report-only" || mode === "off" ? mode : "enforce";
}

/** The Supabase origin as https and wss, for REST, Auth and Realtime. */
export function supabaseOrigins(url: string | undefined): string[] {
	if (!url) return [];
	try {
		const { origin, host } = new URL(url);
		return [origin, `wss://${host}`];
	} catch {
		return [];
	}
}

const INLINE_SCRIPT = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;

/** Base64 SHA-256 of every inline script, in the form CSP expects. */
export async function inlineScriptHashes(html: string): Promise<string[]> {
	const hashes = new Set<string>();
	for (const [, attributes, body] of html.matchAll(INLINE_SCRIPT)) {
		// External scripts are covered by 'self'; JSON data blocks are not executed.
		if (/\ssrc\s*=/i.test(attributes)) continue;
		if (/type\s*=\s*["']?application\/(ld\+)?json/i.test(attributes)) continue;
		const digest = await crypto.subtle.digest(
			"SHA-256",
			new TextEncoder().encode(body),
		);
		hashes.add(`'sha256-${Buffer.from(digest).toString("base64")}'`);
	}
	return [...hashes];
}

export interface CspInput {
	scriptHashes: string[];
	supabaseUrl?: string;
	pathname: string;
}

/** The policy as a header value. Pure, so it can be tested. */
export function buildCsp({
	scriptHashes,
	supabaseUrl,
	pathname,
}: CspInput): string {
	const supabase = supabaseOrigins(supabaseUrl);
	const scriptExtra = BLOB_WORKLET_PATHS.has(pathname) ? ["blob:"] : [];
	const directives: Record<string, string[]> = {
		"default-src": ["'self'"],
		"script-src": ["'self'", ...scriptHashes, ...scriptExtra],
		"style-src": ["'self'", "'unsafe-inline'", ...SOURCES.fontsCss],
		"font-src": ["'self'", ...SOURCES.fontFiles],
		"img-src": ["'self'", "data:", "blob:", ...SOURCES.tiles],
		"connect-src": ["'self'", ...supabase, ...SOURCES.gemini],
		"worker-src": ["'self'", "blob:"],
		"media-src": ["'self'", "blob:"],
		"object-src": ["'none'"],
		"base-uri": ["'self'"],
		"form-action": ["'self'"],
		"frame-ancestors": ["'self'"],
		"report-uri": [CSP_REPORT_PATH],
	};
	return Object.entries(directives)
		.map(([name, values]) => `${name} ${values.join(" ")}`)
		.join("; ");
}

export function cspHeaderName(mode: Exclude<CspMode, "off">): string {
	return mode === "report-only"
		? "Content-Security-Policy-Report-Only"
		: "Content-Security-Policy";
}
