import type { APIRoute } from "astro";
import { CORRIDOR_SEED } from "../../lib/corridor/corridor-seed";
import { guardRequest } from "../../lib/security/api-guard";

export const prerender = false;

function json(body: unknown, status: number): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			"Content-Type": "application/json",
			"Cache-Control": "no-store",
		},
	});
}

/**
 * Counts one passport stamp at a verified business. Anonymous: only the
 * business code and the time are stored, never who scanned.
 */
export const POST: APIRoute = async (context) => {
	const limited = guardRequest(context, "passport-visit");
	if (limited) return limited;
	let body: unknown;
	try {
		body = await context.request.json();
	} catch {
		return json({ error: "Send the visit as JSON." }, 400);
	}
	const code = (body as { businessCode?: unknown })?.businessCode;
	if (
		typeof code !== "string" ||
		!CORRIDOR_SEED.businesses.some((b) => b.code === code && b.is_verified)
	) {
		return json({ error: "Unknown verified business." }, 400);
	}
	let supabase: typeof import("../../lib/supabase")["supabase"];
	try {
		({ supabase } = await import("../../lib/supabase"));
	} catch {
		return json({ error: "Visits are not connected to Supabase." }, 503);
	}
	const insert = await supabase
		.from("passport_visits")
		.insert({ business_code: code });
	if (insert.error) {
		console.error("[passport-visit] Insert failed", insert.error.message);
		return json({ error: "Could not save the visit." }, 502);
	}
	return json({ saved: true }, 201);
};
