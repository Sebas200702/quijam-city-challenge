import type { APIRoute } from "astro";
import {
	errorResponse,
	json,
	notConfigured,
	readJson,
} from "../../../lib/community/community-http";
import {
	applyModeration,
	authenticate,
	CommunityError,
	isCityUser,
	loadModerationQueue,
	parseModerationRequest,
} from "../../../lib/community/community-server";
import { guardRequest } from "../../../lib/security/api-guard";
import { getSupabaseAdmin } from "../../../lib/supabase-admin";

export const prerender = false;

async function requireCity(request: Request) {
	const admin = getSupabaseAdmin();
	if (!admin) return null;
	const user = await authenticate(request, admin);
	if (!(await isCityUser(admin, user.id))) {
		throw new CommunityError("Solo el equipo de la ciudad puede moderar.", 403);
	}
	return { admin, moderatorId: user.id };
}

/** Moderation queue for the city role: held content and reports to follow up. */
export const GET: APIRoute = async (context) => {
	const limited = guardRequest(context, "moderation");
	if (limited) return limited;
	const { request } = context;
	try {
		const city = await requireCity(request);
		if (!city) return notConfigured();
		return json({ items: await loadModerationQueue(city.admin) });
	} catch (error) {
		return errorResponse(error);
	}
};

/** Approve or remove held content, close a follow-up or confirm a citizen report. */
export const POST: APIRoute = async (context) => {
	const limited = guardRequest(context, "moderation");
	if (limited) return limited;
	const { request } = context;
	try {
		const city = await requireCity(request);
		if (!city) return notConfigured();
		const { kind, id, action } = parseModerationRequest(
			await readJson(request),
		);
		await applyModeration(city.admin, city.moderatorId, kind, id, action);
		return json({ ok: true });
	} catch (error) {
		return errorResponse(error);
	}
};
