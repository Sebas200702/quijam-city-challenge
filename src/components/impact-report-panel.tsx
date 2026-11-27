import {
	Check,
	Copy,
	Download,
	FileText,
	Layers,
	ShieldCheck,
	Sparkles,
	Store,
	TriangleAlert,
	Users,
	WifiOff,
} from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type {
	ImpactMetrics,
	ImpactReportResponse,
} from "../lib/impact-report/impact-report-types";
import { ReportIllustration } from "./impact-report-illustration";
import { ReportPreview } from "./impact-report-preview";

type PanelState =
	| { kind: "idle" }
	| { kind: "loading" }
	| { kind: "error"; message: string }
	| { kind: "done"; report: ImpactReportResponse };

const ICON = { size: 18, strokeWidth: 1.75, "aria-hidden": true } as const;
const NUMBER = new Intl.NumberFormat("es-CO");
const TIME = new Intl.DateTimeFormat("es-CO", {
	hour: "numeric",
	minute: "2-digit",
	timeZone: "America/Bogota",
});

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

function subscribeOnline(onChange: () => void) {
	window.addEventListener("online", onChange);
	window.addEventListener("offline", onChange);
	return () => {
		window.removeEventListener("online", onChange);
		window.removeEventListener("offline", onChange);
	};
}

function useOnline(): boolean {
	return useSyncExternalStore(
		subscribeOnline,
		() => navigator.onLine,
		() => true,
	);
}

function joinNames(names: string[]): string {
	if (names.length <= 1) return names.join("");
	return `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`;
}

/** The one-sentence "why" of the report, built only from the aggregated figures. */
function summarize(metrics: ImpactMetrics): string {
	const saturated = metrics.saturatedZoneLabels;
	const crowd =
		saturated.length === 0
			? "ninguna zona llegó a saturado"
			: `${joinNames(saturated)} ${saturated.length === 1 ? "llegó" : "llegaron"} a saturado`;
	const floods =
		metrics.activeFloodAlerts.length === 0
			? "no hay arroyos activos"
			: `hay arroyo activo en ${joinNames(metrics.activeFloodAlerts)}`;
	return `El corredor tiene ${NUMBER.format(metrics.totalVisitors)} visitantes, ${crowd} y ${floods}.`;
}

// --- Panel ------------------------------------------------------------------

/** City dashboard card: Gemini writes the day's report from aggregated counts. */
export function ImpactReportPanel() {
	const [state, setState] = useState<PanelState>({ kind: "idle" });
	const [copied, setCopied] = useState(false);
	const copiedTimer = useRef(0);
	const online = useOnline();

	useEffect(() => () => window.clearTimeout(copiedTimer.current), []);

	async function generate() {
		setState({ kind: "loading" });
		setCopied(false);
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

	async function copy(markdown: string) {
		try {
			await navigator.clipboard.writeText(markdown);
			setCopied(true);
			window.clearTimeout(copiedTimer.current);
			copiedTimer.current = window.setTimeout(() => setCopied(false), 2500);
		} catch {
			setCopied(false);
		}
	}

	const loading = state.kind === "loading";

	return (
		<section className="q-card" aria-labelledby="impact-report-title">
			<div className="q-band q-band--green" aria-hidden="true" />
			<div className="q-card__body">
				<div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
					<div className="flex flex-col gap-4">
						<div>
							<p className="q-eyebrow">Informe del día</p>
							<h2
								id="impact-report-title"
								className="q-h2 mt-1 flex items-center gap-2"
							>
								<Sparkles
									size={22}
									strokeWidth={1.75}
									aria-hidden="true"
									className="text-[var(--gold-text)]"
								/>
								Informe con IA
							</h2>
							<p className="q-sm q-muted mt-2">
								Redacta el informe del día con las cifras agregadas del
								corredor.
							</p>
						</div>
						<dl className="q-dl" style={{ gridTemplateColumns: "1fr" }}>
							<div>
								<dt>
									<Layers {...ICON} />
									Incluye
								</dt>
								<dd className="text-[15px]">Zonas, negocios y cobros</dd>
							</div>
							<div>
								<dt>
									<ShieldCheck {...ICON} />
									Datos personales
								</dt>
								<dd className="text-[15px]">Ninguno, solo conteos</dd>
							</div>
						</dl>
						<button
							type="button"
							className="q-btn q-btn--primary q-btn--block"
							onClick={() => void generate()}
							disabled={loading || !online}
							aria-busy={loading}
						>
							{loading ? (
								<span
									className="q-star q-star--think"
									style={{ width: 18, height: 18 }}
									aria-hidden="true"
								/>
							) : (
								<Sparkles {...ICON} />
							)}
							{loading ? "Redactando…" : "Generar informe"}
						</button>
						{!online && (
							<p className="q-sm q-muted flex items-start gap-2">
								<WifiOff {...ICON} className="mt-0.5 flex-none" />
								Generar un informe necesita conexión.
								{state.kind === "done" ? " Puedes descargar el último." : ""}
							</p>
						)}
					</div>

					<div
						className="min-w-0 rounded-[var(--radius-lg)] border border-[var(--line)] p-4 lg:p-5"
						aria-live="polite"
						aria-busy={loading}
					>
						<PanelBody
							state={state}
							online={online}
							copied={copied}
							onCopy={(markdown) => void copy(markdown)}
						/>
					</div>
				</div>
			</div>
		</section>
	);
}

interface PanelBodyProps {
	state: PanelState;
	online: boolean;
	copied: boolean;
	onCopy: (markdown: string) => void;
}

function PanelBody({ state, online, copied, onCopy }: PanelBodyProps) {
	if (state.kind === "loading") {
		return (
			<div className="q-state q-state--loading" role="status">
				<span className="q-state__glyph">
					<span className="q-star q-star--think" aria-hidden="true" />
				</span>
				<p className="q-state__title">Redactando el informe</p>
				<p className="q-state__text">
					Suele tardar unos 20 s. Puedes seguir usando el tablero.
				</p>
				<p className="q-thinking">
					Leyendo los conteos por zona
					<span className="q-thinking__dots" aria-hidden="true">
						<i />
						<i />
						<i />
					</span>
				</p>
			</div>
		);
	}

	if (state.kind === "error") {
		return (
			<div className="q-state q-state--error" role="alert">
				<ReportIllustration mark="error" />
				<p className="q-state__title">No pudimos redactar el informe</p>
				<p className="q-state__text">
					{state.message} Los datos están a salvo.
				</p>
			</div>
		);
	}

	if (state.kind === "idle") {
		return online ? (
			<div className="q-state q-state--empty" role="status">
				<ReportIllustration mark="star" />
				<p className="q-state__title">Aún no hay informe de hoy</p>
				<p className="q-state__text">
					Genera el primero. Queda listo para descargar o copiar.
				</p>
			</div>
		) : (
			<div className="q-state q-state--offline" role="status">
				<ReportIllustration mark="offline" />
				<p className="q-state__title">Sin conexión</p>
				<p className="q-state__text">
					Cuando vuelva la conexión podrás generar el informe del día.
				</p>
			</div>
		);
	}

	const { report } = state;
	const { metrics } = report;
	const byAi = report.source === "ai";
	const time = TIME.format(new Date(metrics.generatedAt));

	return (
		<article className="flex flex-col gap-4">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<p className="q-eyebrow">
						{byAi
							? `Redactado con IA a las ${time}`
							: `Hecho con plantilla a las ${time}`}
					</p>
					<h3 className="q-h2 mt-1">Corredor Estadio – Gran Malecón</h3>
				</div>
				<span
					className={`q-badge ${byAi ? "q-badge--high" : "q-badge--neutral"}`}
				>
					{byAi ? "Revisa antes de compartir" : "Plantilla sin IA"}
				</span>
			</div>

			<p className="text-base leading-6 text-[var(--ink)]">
				{summarize(metrics)}
			</p>

			<dl className="q-dl">
				<div>
					<dt>
						<Users {...ICON} />
						Visitantes
					</dt>
					<dd>{NUMBER.format(metrics.totalVisitors)}</dd>
				</div>
				<div>
					<dt>
						<TriangleAlert {...ICON} />
						Zonas saturadas
					</dt>
					<dd>{metrics.saturatedZoneLabels.length}</dd>
				</div>
				<div>
					<dt>
						<ShieldCheck {...ICON} />
						Cobros resueltos
					</dt>
					<dd>
						{metrics.reports.resolvedPct === null
							? "Sin reportes"
							: `${metrics.reports.resolvedPct} %`}
					</dd>
				</div>
				<div>
					<dt>
						<Store {...ICON} />
						Negocios abiertos
					</dt>
					<dd>{metrics.openVerifiedBusinesses}</dd>
				</div>
			</dl>

			{report.fallbackReason && (
				<p className="q-sm q-muted">
					{report.fallbackReason} Las cifras salen directo de la base.
				</p>
			)}

			<details className="q-details">
				<summary>
					<span className="inline-flex items-center gap-2">
						<FileText {...ICON} />
						Ver informe completo
					</span>
				</summary>
				<div className="q-details__body">
					<ReportPreview markdown={report.markdown} />
					<p className="q-sm">
						Fuentes: conteos anónimos por zona, reportes de cobro y negocios
						verificados. La IA solo redacta con esas cifras; revísalas antes de
						compartir.
					</p>
				</div>
			</details>

			<div className="flex flex-wrap gap-2">
				<button
					type="button"
					className="q-btn q-btn--secondary"
					onClick={() => download(report.markdown, metrics.generatedAt)}
				>
					<Download {...ICON} />
					Descargar Markdown
				</button>
				<button
					type="button"
					className="q-btn q-btn--ghost"
					onClick={() => onCopy(report.markdown)}
				>
					{copied ? <Check {...ICON} /> : <Copy {...ICON} />}
					{copied ? "Texto copiado" : "Copiar texto"}
				</button>
			</div>
		</article>
	);
}
