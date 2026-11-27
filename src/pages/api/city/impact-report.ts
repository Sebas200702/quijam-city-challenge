import type { APIRoute } from "astro";
import {
	loadMetrics,
	ReportAccessError,
	writeReport,
} from "../../../lib/impact-report/impact-report-server";
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

/** Daily impact report for the city dashboard. Needs the operator's Supabase access token. */
export const POST: APIRoute = async (context) => {
	const limited = guardRequest(context, "impact-report");
	if (limited) return limited;
	const { request } = context;
	const accessToken = request.headers
		.get("Authorization")
		?.replace(/^Bearer\s+/i, "");
	if (!accessToken) {
		return json(
			{ error: "Inicia sesión como ciudad para generar el informe." },
			401,
		);
	}

	try {
		const metrics = await loadMetrics(accessToken);
		return json(await writeReport(metrics), 200);
	} catch (error) {
		if (error instanceof ReportAccessError) {
			return json({ error: error.message }, 403);
		}
		console.error("Impact report failed", error);
		return json({ error: "No se pudo generar el informe." }, 500);
	}
};
