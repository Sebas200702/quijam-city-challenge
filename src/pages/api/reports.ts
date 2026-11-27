import type { APIRoute } from "astro";
import {
	overchargePercent,
	parseOverchargeReport,
} from "../../lib/reports/overcharge-report";
import { guardRequest } from "../../lib/security/api-guard";

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
 * Saves a visitor's overcharge report in overcharge_reports, where the city
 * dashboard sees it in real time. Runs with the public key, so RLS applies:
 * visitors may only insert open reports.
 */
export const POST: APIRoute = async (context) => {
	const limited = guardRequest(context, "reports");
	if (limited) return limited;
	const { request } = context;
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: "Send the report as JSON." }, 400);
	}
	const parsed = parseOverchargeReport(body);
	if (!parsed.ok) return json({ error: parsed.error }, 400);
	const report = parsed.value;

	let supabase: typeof import("../../lib/supabase")["supabase"];
	try {
		// The client module throws when the Supabase env vars are missing.
		({ supabase } = await import("../../lib/supabase"));
	} catch {
		return json({ error: "Reports are not connected to Supabase." }, 503);
	}

	const segment = await supabase
		.from("route_segments")
		.select("id, reference_fare_cop, origin:stops!origin_stop_id(zone)")
		.eq("code", report.segmentCode)
		.maybeSingle()
		.overrideTypes<
			{
				id: string;
				reference_fare_cop: number;
				origin: { zone: string } | null;
			},
			{ merge: false }
		>();
	if (segment.error) return json({ error: "Could not read the route." }, 502);
	if (!segment.data?.origin)
		return json({ error: "Unknown route segment." }, 400);

	const reportId = crypto.randomUUID();

	// No .select() after insert: visitors cannot read other people's reports.
	const insert = await supabase.from("overcharge_reports").insert({
		id: reportId,
		segment_id: segment.data.id,
		zone: segment.data.origin.zone,
		transport_mode: report.transportMode,
		charged_fare_cop: report.chargedFareCop,
		reference_fare_cop: segment.data.reference_fare_cop,
		driver_qr_code: report.driverQrCode,
		notes: report.notes,
		status: "open",
	});
	if (insert.error) {
		console.error("[reports] Insert failed", insert.error.message);
		return json({ error: "Could not save the report." }, 502);
	}

	return json(
		{
			saved: true,
			reportId,
			referenceFareCop: segment.data.reference_fare_cop,
			overchargePercent: overchargePercent(
				report.chargedFareCop,
				segment.data.reference_fare_cop,
			),
		},
		201,
	);
};
