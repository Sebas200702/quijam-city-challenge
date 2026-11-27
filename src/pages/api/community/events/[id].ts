import type { APIRoute } from "astro";
import {
	errorResponse,
	json,
	notConfigured,
	readJson,
} from "../../../../lib/community/community-http";
import {
	authenticate,
	CommunityError,
	parseUpdateEventRequest,
	updateEventContent,
} from "../../../../lib/community/community-server";
import { getOpenJevClient } from "../../../../lib/openjev/openjev-server";
import { guardRequest } from "../../../../lib/security/api-guard";
import { getSupabaseAdmin } from "../../../../lib/supabase-admin";

export const prerender = false;

/**
 * Edits an event through the server (service role), keeping direct client
 * UPDATEs on public.events disabled except for status cancellation (#92).
 */
export const PATCH: APIRoute = async (context) => {
	const limitedIp = await guardRequest(context, "publish-ip");
	if (limitedIp) return limitedIp;
	const { request, params } = context;
	const eventId = params.id?.trim() ?? "";
	if (!eventId) {
		return errorResponse(new CommunityError("Falta el id del evento.", 400));
	}
	const admin = getSupabaseAdmin();
	if (!admin) return notConfigured();
	try {
		const author = await authenticate(request, admin);
		const limitedUser = await guardRequest(context, "publish-user", author.id);
		if (limitedUser) return limitedUser;
		const input = parseUpdateEventRequest(await readJson(request));
		const result = await updateEventContent(
			admin,
			author,
			eventId,
			input,
			getOpenJevClient(),
		);
		return json(result, result.outcome === "rejected" ? 422 : 200);
	} catch (error) {
		return errorResponse(error);
	}
};
