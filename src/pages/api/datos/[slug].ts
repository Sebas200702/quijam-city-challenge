import type { APIRoute } from "astro";
import {
	isOpenDataSlug,
	parseOpenDataFormat,
	serializeToCsv,
} from "../../../lib/open-data/open-data-catalog";
import { loadOpenDataDataset } from "../../../lib/open-data/open-data-server";
import { guardRequest } from "../../../lib/security/api-guard";

export const prerender = false;

function errorJson(message: string, status: number): Response {
	return new Response(JSON.stringify({ error: message }), {
		status,
		headers: {
			"Content-Type": "application/json; charset=utf-8",
			"Cache-Control": "no-store",
		},
	});
}

/**
 * Serves one open dataset in JSON (default) or RFC 4180 CSV (?format=csv).
 * Pass ?download=1 to force a file download header on JSON responses.
 */
export const GET: APIRoute = async (context) => {
	const limited = await guardRequest(context, "open-data");
	if (limited) return limited;

	const slug = context.params.slug ?? "";
	if (!isOpenDataSlug(slug)) {
		return errorJson("Conjunto de datos no encontrado.", 404);
	}

	const format = parseOpenDataFormat(context.url.searchParams.get("format"));
	if (!format) {
		return errorJson(
			"Formato no soportado. Usa format=json o format=csv.",
			400,
		);
	}

	try {
		const payload = await loadOpenDataDataset(slug);

		if (format === "csv") {
			const csv = serializeToCsv(payload.dataset.columns, payload.records);
			return new Response(csv, {
				status: 200,
				headers: {
					"Content-Type": "text/csv; charset=utf-8",
					"Content-Disposition": `attachment; filename="quillart-${slug}.csv"`,
					"Cache-Control": "public, max-age=60",
				},
			});
		}

		const headers: Record<string, string> = {
			"Content-Type": "application/json; charset=utf-8",
			"Cache-Control": "public, max-age=60",
		};
		if (context.url.searchParams.get("download") === "1") {
			headers["Content-Disposition"] =
				`attachment; filename="quillart-${slug}.json"`;
		}

		return new Response(
			JSON.stringify(
				{
					slug: payload.dataset.slug,
					title: payload.dataset.title,
					description: payload.dataset.description,
					origin: payload.dataset.origin,
					dimension: payload.dataset.dimension,
					license: payload.dataset.license,
					licenseUrl: payload.dataset.licenseUrl,
					privacy: payload.dataset.privacyNote,
					source: payload.source,
					generatedAt: payload.generatedAt,
					recordCount: payload.recordCount,
					columns: payload.dataset.columns,
					records: payload.records,
				},
				null,
				2,
			),
			{
				status: 200,
				headers,
			},
		);
	} catch (error) {
		console.error(
			`[open-data] Failed to load dataset ${slug}`,
			error instanceof Error ? error.message : String(error),
		);
		return errorJson("No pudimos generar este conjunto de datos.", 502);
	}
};
