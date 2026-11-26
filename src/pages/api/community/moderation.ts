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
import { getSupabaseAdmin } from "../../../lib/supabase-admin";

export const prerender = false;

async function requireCity(request: Request) {
	const admin = getSupabaseAdmin();
	if (!admin) return null;
	const user = await authenticate(request, admin);
	if (!(await isCityUser(admin, user.id))) {
		throw new CommunityError("Solo el equipo de la ciudad puede moderar.", 403);
	}
	return admin;
}

/** Moderation queue for the city role: held content and reports to follow up. */
export const GET: APIRoute = async ({ request }) => {
	try {
		const admin = await requireCity(request);
		if (!admin) return notConfigured();
		return json({ items: await loadModerationQueue(admin) });
	} catch (error) {
		return errorResponse(error);
	}
};

/** Approve or remove held content, or close a city follow-up. */
export const POST: APIRoute = async ({ request }) => {
	try {
		const admin = await requireCity(request);
		if (!admin) return notConfigured();
		const { kind, id, action } = parseModerationRequest(
			await readJson(request),
		);
		await applyModeration(admin, kind, id, action);
		return json({ ok: true });
	} catch (error) {
		return errorResponse(error);
	}
};
