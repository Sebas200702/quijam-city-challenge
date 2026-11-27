import type { APIRoute } from "astro";
import { guardRequest } from "../../../lib/security/api-guard";
import { getSupabaseAdmin } from "../../../lib/supabase-admin";

export const prerender = false;

const BUSINESS_CODE = /^BIZ-[A-Z0-9-]{1,60}$/;

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
 * A visitor marks "Estoy aquí" on a verified, open business. Only the business
 * and the time are stored (Ley 1581 de 2012). One visit per business every
 * 30 minutes per address, so the counter is hard to inflate.
 */
export const POST: APIRoute = async (context) => {
	let code: unknown;
	try {
		({ businessCode: code } = (await context.request.json()) as {
			businessCode?: unknown;
		});
	} catch {
		return json({ error: "Send the visit as JSON." }, 400);
	}
	if (typeof code !== "string" || !BUSINESS_CODE.test(code)) {
		return json({ error: "Unknown business." }, 400);
	}
	const limited = guardRequest(context, "vendor-visit", code);
	if (limited) return limited;

	const admin = getSupabaseAdmin();
	if (!admin)
		return json({ error: "Visits are not connected to Supabase." }, 503);

	const business = await admin
		.from("businesses")
		.select("id, is_open, is_verified")
		.eq("code", code)
		.maybeSingle();
	if (business.error)
		return json({ error: "Could not read the business." }, 502);
	if (!business.data) return json({ error: "Unknown business." }, 404);
	if (!business.data.is_open || !business.data.is_verified) {
		return json({ error: "This business is closed right now." }, 409);
	}

	const insert = await admin
		.from("business_visits")
		.insert({ business_id: business.data.id });
	if (insert.error) {
		console.error("[vendor] Visit insert failed", insert.error.message);
		return json({ error: "Could not save the visit." }, 502);
	}
	return json({ saved: true }, 201);
};
