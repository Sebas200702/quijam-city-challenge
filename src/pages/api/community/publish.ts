import type { APIRoute } from "astro";
import {
	errorResponse,
	json,
	notConfigured,
	readJson,
} from "../../../lib/community/community-http";
import {
	authenticate,
	parsePublishRequest,
	publishContent,
} from "../../../lib/community/community-server";
import { getOpenJevClient } from "../../../lib/openjev/openjev-server";
import { guardRequest } from "../../../lib/security/api-guard";
import { getSupabaseAdmin } from "../../../lib/supabase-admin";

export const prerender = false;

/**
 * Publishes an event, a forum thread or a reply after the moderation triage
 * (hard rules, then OpenJev, then rules-only fallback). Held content is stored
 * for a moderator; rejected content is not stored.
 */
export const POST: APIRoute = async (context) => {
	const limitedIp = await guardRequest(context, "publish-ip");
	if (limitedIp) return limitedIp;
	const { request } = context;
	const admin = getSupabaseAdmin();
	if (!admin) return notConfigured();
	try {
		const author = await authenticate(request, admin);
		const limitedUser = await guardRequest(context, "publish-user", author.id);
		if (limitedUser) return limitedUser;
		const publishRequest = parsePublishRequest(await readJson(request));
		const result = await publishContent(
			admin,
			author,
			publishRequest,
			getOpenJevClient(),
		);
		return json(result, result.outcome === "rejected" ? 422 : 200);
	} catch (error) {
		return errorResponse(error);
	}
};
