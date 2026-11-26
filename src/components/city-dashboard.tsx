import { useCallback, useEffect, useState } from "react";
import {
	fetchCityDashboardSnapshot,
	getCurrentCitySession,
	isSupabaseConfigured,
	type RealtimeStatus,
	signInCityOperator,
	signOutCityOperator,
	subscribeCityDashboardRealtime,
	toggleFloodAlert,
	updateReportStatus,
} from "../lib/city-dashboard-service";
import type {
	CityDashboardSnapshot,
	CitySessionInfo,
	ReportStatus,
} from "../lib/city-dashboard-types";
import {
	CITY_MODE_LABELS,
	calculateOccupancyPercent,
	calculateTotalVisitors,
	formatCop,
	formatFreshnessLabel,
	getActiveFloodAlerts,
	getDensityVisualState,
	getSaturatedZones,
	REPORT_STATUS_LABELS,
	summarizeReportsByStatus,
	ZONE_LABELS,
} from "../lib/city-dashboard-utils";
import { CityAuthGate } from "./city-auth-gate";
import { CrowdSimPanel } from "./crowd-sim-panel";
import { ImpactReportPanel } from "./impact-report-panel";

const STATUS_OPTIONS: ReportStatus[] = [
	"open",
	"in_review",
	"resolved",
	"dismissed",
];

type ThemeMode = "dark" | "light";

export function CityDashboard() {
	const [theme, setTheme] = useState<ThemeMode>("dark");
	const [session, setSession] = useState<CitySessionInfo | null>(null);
	const [authLoading, setAuthLoading] = useState(true);
	const [snapshot, setSnapshot] = useState<CityDashboardSnapshot | null>(null);
	const [realtimeStatus, setRealtimeStatus] =
		useState<RealtimeStatus>("connecting");
	const [nowMs, setNowMs] = useState(() => Date.now());
	const [error, setError] = useState<string | null>(null);
	const [busyId, setBusyId] = useState<string | null>(null);

	const configured = isSupabaseConfigured();

	useEffect(() => {
		document.documentElement.dataset.theme = theme;
	}, [theme]);

	useEffect(() => {
		const timer = window.setInterval(() => setNowMs(Date.now()), 5000);
		return () => window.clearInterval(timer);
	}, []);

	const loadSnapshot = useCallback(async () => {
		try {
			const data = await fetchCityDashboardSnapshot();
			setSnapshot(data);
			setNowMs(Date.now());
			setError(null);
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: "Error cargando datos del tablero.",
			);
		}
	}, []);

	useEffect(() => {
		if (!configured) {
			setAuthLoading(false);
			return;
		}
		void getCurrentCitySession()
			.then((current) => setSession(current))
			.catch(() => setSession(null))
			.finally(() => setAuthLoading(false));
	}, [configured]);

	useEffect(() => {
		if (!configured || session?.role !== "city") {
			return;
		}

		let unsubscribe: (() => void) | undefined;
		let active = true;

		void loadSnapshot();
		void subscribeCityDashboardRealtime(
			() => {
				if (active) {
					void loadSnapshot();
				}
			},
			(status) => {
				if (active) {
					setRealtimeStatus(status);
				}
			},
		).then((cleanup) => {
			if (active) {
				unsubscribe = cleanup;
			} else {
				cleanup();
			}
		});

		return () => {
			active = false;
			unsubscribe?.();
		};
	}, [configured, session, loadSnapshot]);

	async function handleSignIn(email: string, password: string) {
		const nextSession = await signInCityOperator(email, password);
		setSession(nextSession);
	}

	async function handleSignOut() {
		await signOutCityOperator();
		setSession(null);
		setSnapshot(null);
	}

	async function handleStatusChange(reportId: string, status: ReportStatus) {
		setBusyId(reportId);
		try {
			await updateReportStatus(reportId, status);
			await loadSnapshot();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Error al actualizar.");
		} finally {
			setBusyId(null);
		}
	}

	async function handleToggleFlood(floodZoneId: string, nextActive: boolean) {
		setBusyId(floodZoneId);
		try {
			await toggleFloodAlert(floodZoneId, nextActive);
			await loadSnapshot();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Error al actualizar.");
		} finally {
			setBusyId(null);
		}
	}

	const headerBar = (
		<header className="q-header border-b border-[var(--line)]">
			<a href="/" className="q-logo">
				<span className="q-logo__tile" aria-hidden="true">
					<span className="q-star h-5 w-5" />
				</span>
				<span className="q-logo__text">
					<span className="q-logo__word">QUILLART</span>
					<span className="q-logo__sub">
						Lo que la ciudad aprende · Corredor 2034
					</span>
				</span>
			</a>

			<div className="q-header__center">
				<div className="q-row">
					{session?.role === "city" && (
						<span
							className={`q-badge ${
								realtimeStatus === "live"
									? "q-badge--live"
									: realtimeStatus === "error"
										? "q-badge--alert"
										: "q-badge--neutral"
							}`}
						>
							{realtimeStatus === "live" && (
								<span className="q-dot" aria-hidden="true" />
							)}
							{realtimeStatus === "live"
								? "En vivo"
								: realtimeStatus === "error"
									? "Reconectando"
									: "Conectando"}
						</span>
					)}
					<span className="q-badge q-badge--high">Simulado 2034</span>
				</div>
			</div>

			<div className="q-header__end">
				<fieldset className="q-seg m-0 border-0" aria-label="Tema de color">
					<button
						type="button"
						aria-pressed={theme === "dark"}
						onClick={() => setTheme("dark")}
						className={`q-seg__opt ${theme === "dark" ? "is-on" : ""}`}
					>
						Oscuro
					</button>
					<button
						type="button"
						aria-pressed={theme === "light"}
						onClick={() => setTheme("light")}
						className={`q-seg__opt ${theme === "light" ? "is-on" : ""}`}
					>
						Claro
					</button>
				</fieldset>

				{session?.role === "city" && (
					<>
						<span className="q-sm q-muted hidden sm:inline">
							{session.email}
						</span>
						<button
							type="button"
							onClick={() => void handleSignOut()}
							className="q-btn q-btn--secondary q-btn--sm"
						>
							Salir
						</button>
					</>
				)}
			</div>
		</header>
	);

	if (!configured) {
		return (
			<>
				{headerBar}
				<main className="mx-auto max-w-2xl px-4 py-10">
					<section className="q-card">
						<div className="q-band q-band--gold" aria-hidden="true" />
						<div className="q-card__head">
							<h1 className="q-h2">Faltan variables de Supabase en .env</h1>
						</div>
						<div className="q-card__body">
							<p className="q-p q-muted">
								Copia <code>.env.example</code> a <code>.env</code> y define{" "}
								<code>PUBLIC_SUPABASE_URL</code> y{" "}
								<code>PUBLIC_SUPABASE_PUBLISHABLE_KEY</code>.
							</p>
						</div>
					</section>
				</main>
			</>
		);
	}

	if (authLoading) {
		return (
			<>
				{headerBar}
				<main className="mx-auto flex max-w-6xl items-center justify-center gap-3 px-4 py-20">
					<span
						className="q-star q-star--think text-[var(--gold)]"
						aria-hidden="true"
					/>
					<span className="q-muted">Verificando sesión de ciudad...</span>
				</main>
			</>
		);
	}

	if (session?.role !== "city") {
		return (
			<>
				{headerBar}
				<main className="mx-auto max-w-6xl px-4 pb-12">
					<CityAuthGate
						session={session}
						onSignIn={handleSignIn}
						onSignOut={handleSignOut}
					/>
				</main>
			</>
		);
	}

	const zones = snapshot?.zones ?? [];
	const reports = snapshot?.reports ?? [];
	const floodZones = snapshot?.floodZones ?? [];
	const activeAlerts = getActiveFloodAlerts(floodZones);
	const reportSummary = summarizeReportsByStatus(reports);
	const totalVisitors = calculateTotalVisitors(zones);
	const saturatedZones = getSaturatedZones(zones);

	return (
		<>
			{headerBar}

			<main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
				<div className="flex flex-wrap items-end justify-between gap-4">
					<div>
						<p className="q-eyebrow">
							Corredor Estadio – Troncal Murillo – Centro – Barrio Abajo –
							Malecón
						</p>
						<h1 className="q-h1 mt-1">Tablero operativo de ciudad</h1>
					</div>
					<p className="q-sm q-subtle">
						Conteos anónimos (Ley 1581 de 2012)
						{snapshot &&
							` · ${formatFreshnessLabel(snapshot.lastUpdatedAt, nowMs)}`}
					</p>
				</div>

				{error && (
					<p
						role="alert"
						className="rounded-[var(--radius-md)] bg-[var(--red-soft)] px-4 py-3 text-sm text-[var(--red-text)]"
					>
						{error}
					</p>
				)}

				{/* Top KPI strip */}
				<section
					aria-label="Resumen operativo"
					className="grid gap-4 sm:grid-cols-3"
				>
					<article className="q-kpi">
						<span className="q-kpi__label">Visitantes en corredor</span>
						<div className="q-kpi__row">
							<span className="q-kpi__value">
								{new Intl.NumberFormat("es-CO").format(totalVisitors)}
							</span>
							<span
								className={`q-delta ${
									saturatedZones.length > 0 ? "q-delta--bad" : "q-delta--good"
								}`}
							>
								{saturatedZones.length > 0
									? `${saturatedZones.length} saturada(s)`
									: "Flujo estable"}
							</span>
						</div>
					</article>

					<article className="q-kpi">
						<span className="q-kpi__label">Alertas de arroyos</span>
						<div className="q-kpi__row">
							<span className="q-kpi__value">{activeAlerts.length}</span>
							<span
								className={`q-delta ${
									activeAlerts.length > 0 ? "q-delta--bad" : "q-delta--good"
								}`}
							>
								{activeAlerts.length > 0 ? "Alerta activa" : "Sin alertas"}
							</span>
						</div>
					</article>

					<article className="q-kpi">
						<span className="q-kpi__label">Reportes de cobro abusivo</span>
						<div className="q-kpi__row">
							<span className="q-kpi__value">{reportSummary.total}</span>
							<span
								className={`q-delta ${
									reportSummary.open > 0 ? "q-delta--bad" : "q-delta--good"
								}`}
							>
								{reportSummary.open} abierto(s)
							</span>
						</div>
					</article>
				</section>

				{zones.length > 0 && <CrowdSimPanel zones={zones} canWrite />}

				{/* Active flood alert card */}
				<section
					aria-label="Alertas de arroyos"
					className={`q-card ${activeAlerts.length > 0 ? "shadow-[var(--glow-red)]" : ""}`}
				>
					<div
						className={`q-band ${
							activeAlerts.length > 0 ? "q-band--red" : "q-band--green"
						}`}
						aria-hidden="true"
					/>
					<div className="q-card__head">
						<div>
							<p className="q-eyebrow">Resiliencia climática · Arroyos</p>
							<h2 className="q-h2 mt-1">
								{activeAlerts.length > 0
									? `Alerta de arroyos activa (${activeAlerts.length})`
									: "Sin alertas de arroyos activas"}
							</h2>
						</div>
						<span
							className={`q-badge ${
								activeAlerts.length > 0
									? "q-badge--alert q-badge--solid"
									: "q-badge--optimal"
							}`}
						>
							{activeAlerts.length > 0 ? "Crítico" : "Seguro"}
						</span>
					</div>

					<div className="q-card__body">
						{activeAlerts.length > 0 && (
							<ul className="space-y-2.5">
								{activeAlerts.map((alert) => (
									<li
										key={alert.id}
										className="rounded-[var(--radius-md)] bg-[var(--red-soft)] p-3.5"
									>
										<div className="flex flex-wrap items-center justify-between gap-2">
											<span className="font-semibold text-[var(--ink)]">
												{alert.name} · {ZONE_LABELS[alert.zone]}
											</span>
											<span className="q-badge q-badge--alert q-badge--solid">
												Riesgo {alert.risk_level}
											</span>
										</div>
										{alert.advisory_es && (
											<p className="q-sm mt-1.5 text-[var(--red-text)]">
												{alert.advisory_es}
											</p>
										)}
									</li>
								))}
							</ul>
						)}

						<div className="q-row">
							{floodZones.map((zone) => (
								<button
									key={zone.id}
									type="button"
									disabled={busyId === zone.id}
									onClick={() =>
										void handleToggleFlood(zone.id, !zone.alert_active)
									}
									className={`q-btn q-btn--sm ${
										zone.alert_active ? "q-btn--alert" : "q-btn--secondary"
									}`}
								>
									{zone.alert_active ? "Desactivar: " : "Simular alerta: "}
									{zone.name}
								</button>
							))}
						</div>
					</div>
				</section>

				{/* Zone visitor density meters */}
				<section className="space-y-4">
					<div className="flex flex-wrap items-baseline justify-between gap-2">
						<div>
							<p className="q-eyebrow">Aforo anónimo por zona</p>
							<h2 className="q-h2 mt-0.5">
								Visitantes en el corredor (simulado)
							</h2>
						</div>
						<span className="q-sm q-subtle">
							Escala: &lt;60 % Fluido · 60–84 % Moderado · ≥85 % Saturado
						</span>
					</div>

					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
						{zones.map((zone) => {
							const pct = calculateOccupancyPercent(zone);
							const visual = getDensityVisualState(pct);
							const barWidth = Math.min(pct, 100);

							return (
								<article key={zone.zone} className="q-card">
									<div
										className={`q-band q-band--${visual.tone}`}
										aria-hidden="true"
									/>
									<div className="q-card__body">
										<div className="flex items-start justify-between gap-2">
											<h3 className="q-h3">{zone.zone_label}</h3>
										</div>

										<p className="q-num text-3xl font-bold text-[var(--ink)]">
											{new Intl.NumberFormat("es-CO").format(
												zone.active_visitors,
											)}
										</p>

										<div className={`q-meter q-meter--${visual.tone}`}>
											<meter
												className="q-sr"
												min={0}
												max={zone.capacity_threshold}
												value={zone.active_visitors}
												aria-label={`Densidad en ${zone.zone_label}`}
											>
												{pct}% {visual.label}
											</meter>
											<div className="q-meter__head">
												<span className="q-meter__state font-semibold">
													{visual.label}
												</span>
												<b>{pct}%</b>
											</div>
											<div className="q-meter__track" aria-hidden="true">
												<div
													className="q-meter__fill"
													style={{ width: `${barWidth}%` }}
												/>
											</div>
										</div>

										<p className="q-sm q-subtle">
											Umbral{" "}
											{new Intl.NumberFormat("es-CO").format(
												zone.capacity_threshold,
											)}{" "}
											· {CITY_MODE_LABELS[zone.city_mode]}
										</p>
									</div>
								</article>
							);
						})}
					</div>
				</section>

				{/* Overcharge reports by status */}
				<section className="q-card">
					<div className="q-band q-band--gold" aria-hidden="true" />
					<div className="q-card__head">
						<div>
							<p className="q-eyebrow">Tarifa justa · Control ciudadano</p>
							<h2 className="q-h2 mt-1">
								Reportes de cobro abusivo por estado
							</h2>
						</div>
						<span className="q-badge q-badge--neutral">
							{reportSummary.total} total
						</span>
					</div>

					<div className="q-card__body">
						<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
							{STATUS_OPTIONS.map((status) => (
								<div
									key={status}
									className="rounded-[var(--radius-md)] bg-[var(--bg)] p-4"
								>
									<p className="q-eyebrow">{REPORT_STATUS_LABELS[status]}</p>
									<p className="q-num mt-1 text-2xl font-bold text-[var(--ink)]">
										{reportSummary[status]}
									</p>
								</div>
							))}
						</div>

						<div className="q-scroll rounded-[var(--radius-md)] bg-[var(--bg)]">
							<table className="min-w-full divide-y divide-[var(--line)] text-left text-sm">
								<thead>
									<tr className="text-xs uppercase tracking-wider text-[var(--ink-muted)]">
										<th className="px-4 py-3 font-semibold">Zona</th>
										<th className="px-4 py-3 font-semibold">Modo</th>
										<th className="px-4 py-3 font-semibold">Cobrado</th>
										<th className="px-4 py-3 font-semibold">Referencia</th>
										<th className="px-4 py-3 font-semibold">QR conductor</th>
										<th className="px-4 py-3 font-semibold">Estado</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-[var(--line)]">
									{reports.length === 0 ? (
										<tr>
											<td
												colSpan={6}
												className="px-4 py-6 text-center text-[var(--ink-muted)]"
											>
												No hay reportes registrados.
											</td>
										</tr>
									) : (
										reports.map((report) => (
											<tr key={report.id}>
												<td className="px-4 py-3 font-medium text-[var(--ink)]">
													{ZONE_LABELS[report.zone]}
												</td>
												<td className="px-4 py-3 capitalize text-[var(--ink-muted)]">
													{report.transport_mode}
												</td>
												<td className="q-num px-4 py-3 font-semibold text-[var(--red-text)]">
													{formatCop(report.charged_fare_cop)}
												</td>
												<td className="q-num px-4 py-3 text-[var(--green-text)]">
													{formatCop(report.reference_fare_cop)}
												</td>
												<td className="px-4 py-3 font-mono text-xs text-[var(--ink-muted)]">
													{report.driver_qr_code ?? "Sin QR"}
												</td>
												<td className="px-4 py-3">
													<select
														aria-label={`Estado del reporte ${report.id}`}
														value={report.status}
														disabled={busyId === report.id}
														onChange={(event) =>
															void handleStatusChange(
																report.id,
																event.target.value as ReportStatus,
															)
														}
														className="rounded-full border border-[var(--line-control)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--ink)]"
													>
														{STATUS_OPTIONS.map((option) => (
															<option key={option} value={option}>
																{REPORT_STATUS_LABELS[option]}
															</option>
														))}
													</select>
												</td>
											</tr>
										))
									)}
								</tbody>
							</table>
						</div>
					</div>
				</section>

				<ImpactReportPanel />
			</main>
		</>
	);
}
