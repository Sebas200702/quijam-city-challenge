import type { APIRoute } from "astro";
import {
	errorResponse,
	json,
	notConfigured,
} from "../../../lib/community/community-http";
import {
	authenticate,
	deleteAccount,
} from "../../../lib/community/community-server";
import { guardRequest } from "../../../lib/security/api-guard";
import { getSupabaseAdmin } from "../../../lib/supabase-admin";

export const prerender = false;

/**
 * Ley 1581 de 2012 (supresión): deletes the signed-in person's account, what
 * they wrote and their registrations; their upcoming events are cancelled.
 */
export const DELETE: APIRoute = async (context) => {
	const limited = guardRequest(context, "account");
	if (limited) return limited;
	const admin = getSupabaseAdmin();
	if (!admin) return notConfigured();
	try {
		const author = await authenticate(context.request, admin);
		await deleteAccount(admin, author.id);
		return json({ ok: true });
	} catch (error) {
		return errorResponse(error);
	}
};
