import { getSecret } from "astro:env/server";
import { GoogleGenAI } from "@google/genai";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { FloodZone, ZoneVisitorCount } from "../city-dashboard-types";
import { computeImpactMetrics } from "./impact-metrics";
import {
	buildReportPrompt,
	buildTemplateReport,
	findUnknownNumbers,
	REPORT_SYSTEM_INSTRUCTION,
} from "./impact-report-text";
import type {
	BusinessRow,
	ImpactMetrics,
	ImpactReportResponse,
	ReportRow,
} from "./impact-report-types";

/** Fallback text model. Override with GEMINI_REPORT_MODEL if the API stops serving it. */
export const DEFAULT_REPORT_MODEL = "gemini-flash-latest";

export class ReportAccessError extends Error {}

/** Supabase client acting as the signed-in operator, so RLS applies to every query. */
function clientForToken(accessToken: string): SupabaseClient {
	return createClient(
		import.meta.env.PUBLIC_SUPABASE_URL,
		import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY,
		{
			global: { headers: { Authorization: `Bearer ${accessToken}` } },
			auth: { persistSession: false, autoRefreshToken: false },
		},
	);
}

/** Reads the day's data with the operator's own permissions. Only city users pass. */
export async function loadMetrics(accessToken: string): Promise<ImpactMetrics> {
	const supabase = clientForToken(accessToken);
	const { data: role, error: roleError } =
		await supabase.rpc("current_user_role");
	if (roleError || role !== "city") {
		throw new ReportAccessError("Solo el rol ciudad puede generar el informe.");
	}

	const [zones, reports, floods, businesses] = await Promise.all([
		supabase.from("zone_visitor_counts").select("*"),
		supabase
			.from("overcharge_reports")
			.select("status, charged_fare_cop, reference_fare_cop"),
		supabase.from("flood_zones").select("*"),
		supabase.from("businesses").select("zone, is_open, is_verified"),
	]);
	const failed = [zones, reports, floods, businesses].find(
		(result) => result.error,
	);
	if (failed?.error) {
		throw new Error(`No se pudieron leer los datos: ${failed.error.message}`);
	}

	return computeImpactMetrics({
		zones: (zones.data ?? []) as ZoneVisitorCount[],
		reports: (reports.data ?? []) as ReportRow[],
		floodZones: (floods.data ?? []) as FloodZone[],
		businesses: (businesses.data ?? []) as BusinessRow[],
	});
}

function template(
	metrics: ImpactMetrics,
	fallbackReason: string,
): ImpactReportResponse {
	return {
		markdown: buildTemplateReport(metrics),
		source: "template",
		fallbackReason,
		metrics,
	};
}

/**
 * Gemini writes the text from aggregated metrics only. If there is no key, the
 * call fails, or the text has a number that is not in the data, the template
 * report is returned instead, so figures always match the database.
 */
export async function writeReport(
	metrics: ImpactMetrics,
): Promise<ImpactReportResponse> {
	const apiKey = getSecret("GEMINI_API_KEY");
	if (!apiKey) {
		return template(metrics, "No hay GEMINI_API_KEY en el servidor.");
	}

	try {
		const ai = new GoogleGenAI({ apiKey });
		const response = await ai.models.generateContent({
			model: getSecret("GEMINI_REPORT_MODEL") || DEFAULT_REPORT_MODEL,
			contents: buildReportPrompt(metrics),
			config: {
				systemInstruction: REPORT_SYSTEM_INSTRUCTION,
				temperature: 0.2,
			},
		});
		const markdown = response.text?.trim();
		if (!markdown) {
			return template(metrics, "Gemini no devolvió texto.");
		}
		const unknown = findUnknownNumbers(markdown, metrics);
		if (unknown.length > 0) {
			return template(
				metrics,
				`El texto de Gemini traía cifras que no están en la base (${unknown.join(", ")}).`,
			);
		}
		return { markdown, source: "ai", metrics };
	} catch (error) {
		console.error("Impact report generation failed", error);
		return template(metrics, "No se pudo contactar a Gemini.");
	}
}
