import type { APIRoute } from "astro";
import { guardRequest } from "../../lib/security/api-guard";

export const prerender = false;

const MAX_BODY_BYTES = 8 * 1024;

interface Violation {
	page: string;
	directive: string;
	blocked: string;
}

/** Reads the old `csp-report` format and the Reporting API format. */
function violationsFrom(body: unknown): Violation[] {
	const items = Array.isArray(body) ? body : [body];
	return items.flatMap((item) => {
		if (typeof item !== "object" || item === null) return [];
		const raw = item as Record<string, unknown>;
		const report = (raw["csp-report"] ?? raw.body ?? raw) as Record<
			string,
			unknown
		>;
		const text = (value: unknown) =>
			typeof value === "string" ? value.slice(0, 300) : "";
		const page = text(report["document-uri"] ?? report.documentURL);
		const directive = text(
			report["violated-directive"] ?? report.effectiveDirective,
		);
		const blocked = text(report["blocked-uri"] ?? report.blockedURL);
		return directive ? [{ page, directive, blocked }] : [];
	});
}

/** Logs CSP violations so they can be fixed before or after enforcing the policy. */
export const POST: APIRoute = async (context) => {
	const limited = guardRequest(context, "csp-report");
	if (limited) return limited;

	const text = await context.request.text();
	if (text.length > MAX_BODY_BYTES) return new Response(null, { status: 413 });
	try {
		for (const violation of violationsFrom(JSON.parse(text))) {
			console.warn("[csp] violation", violation);
		}
	} catch {
		return new Response(null, { status: 400 });
	}
	return new Response(null, { status: 204 });
};
