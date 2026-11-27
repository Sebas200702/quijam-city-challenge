import type { APIRoute } from "astro";
import { loadOpenDataCatalog } from "../../../lib/open-data/open-data-server";
import { guardRequest } from "../../../lib/security/api-guard";

export const prerender = false;

/**
 * Public catalog of open datasets published by QUILLART.
 * Returns metadata, license, origin (community vs. corridor reference data),
 * live record counts, and JSON/CSV download endpoints. Never exposes PII.
 */
export const GET: APIRoute = async (context) => {
	const limited = guardRequest(context, "open-data");
	if (limited) return limited;

	try {
		const catalog = await loadOpenDataCatalog();
		const datasets = catalog.datasets.map(
			({ previewRows: _preview, ...publicMeta }) => publicMeta,
		);

		return new Response(
			JSON.stringify(
				{
					...catalog,
					datasets,
				},
				null,
				2,
			),
			{
				status: 200,
				headers: {
					"Content-Type": "application/json; charset=utf-8",
					"Cache-Control": "public, max-age=60",
				},
			},
		);
	} catch (error) {
		console.error(
			"[open-data] Failed to load catalog",
			error instanceof Error ? error.message : String(error),
		);
		return new Response(
			JSON.stringify({
				error: "No pudimos cargar el catálogo de datos abiertos.",
			}),
			{
				status: 502,
				headers: {
					"Content-Type": "application/json; charset=utf-8",
					"Cache-Control": "no-store",
				},
			},
		);
	}
};
