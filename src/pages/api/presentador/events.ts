import type { APIRoute } from "astro";
import {
	CITY_EVENT_NAME,
	CITY_EVENTS_CHANNEL,
} from "../../../lib/city-events/city-events-types";
import { parseCityEvent } from "../../../lib/city-events/parse-city-event";
import { resolvePresenterAccess } from "../../../lib/presenter/presenter-auth";
import { guardRequest } from "../../../lib/security/api-guard";
import { mfaRequiredResponse } from "../../../lib/security/city-mfa";
import { getSupabaseAdmin } from "../../../lib/supabase-admin";

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
 * Publishes one `city-events` event for the presenter panel. Only a demo key
 * session or a city account may call it; the event is validated against the
 * epic's contract and broadcast by the server over Supabase Realtime.
 */
export const POST: APIRoute = async (context) => {
	const limited = await guardRequest(context, "presenter-events");
	if (limited) return limited;
	const { access, mfaRequired } = await resolvePresenterAccess(
		context.request,
		context.cookies,
	);
	if (mfaRequired) return mfaRequiredResponse();
	if (!access)
		return json(
			{
				error: "Entra al panel con la llave de demo o una cuenta de la ciudad.",
			},
			401,
		);

	let body: unknown;
	try {
		body = await context.request.json();
	} catch {
		return json({ error: "Send the event as JSON." }, 400);
	}
	const parsed = parseCityEvent(body);
	if (!parsed.ok) return json({ error: parsed.error }, 400);

	const admin = getSupabaseAdmin();
	if (!admin) {
		// The panel falls back to the local channel (same laptop, other tabs).
		return json(
			{ error: "Realtime is not configured on the server.", delivered: "none" },
			503,
		);
	}
	const channel = admin.channel(CITY_EVENTS_CHANNEL);
	try {
		const result = await channel.httpSend(CITY_EVENT_NAME, parsed.value, {
			timeout: 5000,
		});
		if (!result.success) {
			console.error(
				"[presenter] Broadcast failed",
				result.status,
				result.error,
			);
			return json(
				{ error: "Could not broadcast the event.", delivered: "none" },
				502,
			);
		}
	} finally {
		void admin.removeChannel(channel);
	}
	return json({ delivered: "supabase", event: parsed.value, via: access }, 200);
};
