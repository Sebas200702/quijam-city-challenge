import type { APIRoute } from "astro";
import {
	presenterAccess,
	readDemoKey,
} from "../../../lib/presenter/presenter-auth";
import {
	createSessionValue,
	isUsableKey,
	keyMatches,
	PRESENTER_COOKIE,
	SESSION_HOURS,
} from "../../../lib/presenter/presenter-session";
import { guardRequest } from "../../../lib/security/api-guard";

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

/** Whether this browser may use the panel, and how. */
export const GET: APIRoute = async ({ request, cookies }) => {
	const access = await presenterAccess(request, cookies);
	return json({ access, demoKeyEnabled: isUsableKey(readDemoKey()) }, 200);
};

/** Exchanges the demo key for an 8-hour httpOnly cookie. Rate limited against guessing. */
export const POST: APIRoute = async (context) => {
	const limited = await guardRequest(context, "presenter-session");
	if (limited) return limited;
	const key = readDemoKey();
	if (!isUsableKey(key)) {
		return json(
			{ error: "La llave de demo no está configurada en el servidor." },
			503,
		);
	}
	let body: { key?: unknown };
	try {
		body = (await context.request.json()) as { key?: unknown };
	} catch {
		return json({ error: "Envía la llave como JSON." }, 400);
	}
	if (!keyMatches(body.key, key)) {
		return json({ error: "La llave no es correcta." }, 401);
	}
	context.cookies.set(PRESENTER_COOKIE, createSessionValue(key), {
		httpOnly: true,
		secure: context.url.protocol === "https:",
		sameSite: "strict",
		path: "/",
		maxAge: SESSION_HOURS * 3600,
	});
	return json({ access: "demo-key" }, 200);
};

/** Ends the demo key session. */
export const DELETE: APIRoute = ({ cookies }) => {
	cookies.delete(PRESENTER_COOKIE, { path: "/" });
	return json({ access: null }, 200);
};
