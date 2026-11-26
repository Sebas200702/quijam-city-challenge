import { useState } from "react";
import type { ImpactReportResponse } from "../lib/impact-report/impact-report-types";

type PanelState =
	| { kind: "idle" }
	| { kind: "loading" }
	| { kind: "error"; message: string }
	| { kind: "done"; report: ImpactReportResponse };

async function getAccessToken(): Promise<string | null> {
	const { supabase } = await import("../lib/supabase");
	const { data } = await supabase.auth.getSession();
	return data.session?.access_token ?? null;
}

async function requestReport(): Promise<ImpactReportResponse> {
	const token = await getAccessToken();
	if (!token) {
		throw new Error("Tu sesión expiró. Vuelve a iniciar sesión.");
	}
	const response = await fetch("/api/city/impact-report", {
		method: "POST",
		headers: { Authorization: `Bearer ${token}` },
	});
	const body = (await response.json()) as
		| ImpactReportResponse
		| { error: string };
	if (!response.ok || "error" in body) {
		throw new Error(
			"error" in body ? body.error : "No se pudo generar el informe.",
		);
	}
	return body;
}

function download(markdown: string, generatedAt: string) {
	const url = URL.createObjectURL(
		new Blob([markdown], { type: "text/markdown;charset=utf-8" }),
	);
	const link = document.createElement("a");
	link.href = url;
	link.download = `informe-impacto-${generatedAt.slice(0, 10)}.md`;
	link.click();
	URL.revokeObjectURL(url);
}

/** City dashboard card: Gemini writes the day's report from aggregated counts. */
export function ImpactReportPanel() {
	const [state, setState] = useState<PanelState>({ kind: "idle" });

	async function generate() {
		setState({ kind: "loading" });
		try {
			setState({ kind: "done", report: await requestReport() });
		} catch (error) {
			setState({
				kind: "error",
				message:
					error instanceof Error
						? error.message
						: "No se pudo generar el informe.",
			});
		}
	}

	return (
		<section className="q-card" aria-labelledby="impact-report-title">
			<div className="q-band q-band--green" aria-hidden="true" />
			<div className="q-card__head">
				<div>
					<p className="q-eyebrow">Informe del día · IA</p>
					<h2 id="impact-report-title" className="q-h2 mt-1">
						Informe de impacto
					</h2>
				</div>
				<button
					type="button"
					className="q-btn q-btn--primary"
					onClick={() => void generate()}
					disabled={state.kind === "loading"}
				>
					{state.kind === "loading" ? "Generando…" : "Generar informe"}
				</button>
			</div>

			<div
				className="q-card__body"
				aria-live="polite"
				aria-busy={state.kind === "loading"}
			>
				{state.kind === "idle" && (
					<p className="q-sm q-subtle">
						Resume el día con los conteos agregados: visitantes por zona,
						negocios abiertos y reportes de cobro abusivo. No usa datos
						personales.
					</p>
				)}

				{state.kind === "loading" && (
					<p className="q-sm q-subtle">
						Leyendo los conteos y redactando el informe…
					</p>
				)}

				{state.kind === "error" && (
					<p
						role="alert"
						className="rounded-[var(--radius-md)] bg-[var(--red-soft)] px-4 py-3 text-sm text-[var(--red-text)]"
					>
						{state.message}
					</p>
				)}

				{state.kind === "done" && (
					<>
						<div className="flex flex-wrap items-center justify-between gap-2">
							<span className="q-badge q-badge--neutral">
								{state.report.source === "ai"
									? "Redactado con IA"
									: "Plantilla sin IA"}
							</span>
							<button
								type="button"
								className="q-btn q-btn--secondary q-btn--sm"
								onClick={() =>
									download(
										state.report.markdown,
										state.report.metrics.generatedAt,
									)
								}
							>
								Descargar Markdown
							</button>
						</div>
						{state.report.fallbackReason && (
							<p className="q-sm q-subtle">
								{state.report.fallbackReason} Las cifras salen directo de la
								base.
							</p>
						)}
						<pre className="q-scroll max-h-[28rem] whitespace-pre-wrap rounded-[var(--radius-md)] bg-[var(--bg)] p-4 font-sans text-sm text-[var(--ink)]">
							{state.report.markdown}
						</pre>
					</>
				)}
			</div>
		</section>
	);
}
