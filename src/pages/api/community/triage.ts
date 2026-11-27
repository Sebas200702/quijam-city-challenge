import type { APIRoute } from "astro";
import {
	errorResponse,
	json,
	readJson,
} from "../../../lib/community/community-http";
import { CommunityError } from "../../../lib/community/community-server";
import type { ContentKind } from "../../../lib/moderation/moderation-types";
import { triageContent } from "../../../lib/moderation/triage";
import { getOpenJevClient } from "../../../lib/openjev/openjev-server";
import { guardRequest } from "../../../lib/security/api-guard";

export const prerender = false;

const KINDS: ContentKind[] = ["event", "thread", "post"];

/**
 * Stateless triage for the on-device store (no Supabase): returns the decision
 * without storing anything. The cloud store uses /api/community/publish.
 */
export const POST: APIRoute = async (context) => {
	const limited = await guardRequest(context, "triage");
	if (limited) return limited;
	const { request } = context;
	try {
		const body = (await readJson(request)) as Record<string, unknown> | null;
		const kind = body?.kind as ContentKind;
		const text = body?.body;
		const title = body?.title;
		if (
			!KINDS.includes(kind) ||
			typeof text !== "string" ||
			text.length > 5000 ||
			(title !== undefined && typeof title !== "string")
		) {
			throw new CommunityError("Solicitud inválida.", 400);
		}
		const decision = await triageContent(
			{ kind, body: text, title: title as string | undefined },
			getOpenJevClient(),
		);
		return json(decision);
	} catch (error) {
		return errorResponse(error);
	}
};
