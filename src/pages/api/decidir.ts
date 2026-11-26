import type { APIRoute } from "astro";
import { loadCorridorData } from "../../lib/corridor/corridor-data";
import { createOpenJevChooser } from "../../lib/decider/openjev-chooser";
import { getOpenJevClient } from "../../lib/openjev/openjev-server";
import { parsePlanRequest, planRoute } from "../../lib/routing/plan-route";
import { loadRouteSegments } from "../../lib/routing/route-segments-data";

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
 * Plans a route for a visitor: hard safety rules, then OpenJev (if configured),
 * then the weighted score. Called by the map and by the Guide's function call.
 */
export const POST: APIRoute = async ({ request }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: "Body must be valid JSON" }, 400);
	}

	const [{ data: corridor }, segments] = await Promise.all([
		loadCorridorData(),
		loadRouteSegments(),
	]);
	const parsed = parsePlanRequest(
		body,
		new Set(corridor.stops.map((stop) => stop.code)),
	);
	if (!parsed.ok) return json({ error: parsed.error }, 400);

	const client = getOpenJevClient();
	const plan = await planRoute(parsed.value, {
		segments,
		stops: corridor.stops,
		floodZones: corridor.floodZones,
		remote: client ? createOpenJevChooser(client) : undefined,
	});
	return json(plan, 200);
};
