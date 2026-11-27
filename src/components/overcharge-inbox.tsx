import {
	AlertTriangle,
	CheckCircle2,
	Clock,
	Eye,
	RefreshCw,
	Sparkles,
	XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import type {
	OverchargeReport,
	ReportFilter,
	ReportStatus,
	ReportStatusSummary,
} from "../lib/city-dashboard-types";
import {
	calculateResolvedReportsRate,
	filterReportsByStatus,
	formatCop,
	formatRelativeReportTime,
	getReportStatusActions,
	REPORT_STATUS_LABELS,
	REPORT_TRANSPORT_LABELS,
	ZONE_LABELS,
} from "../lib/city-dashboard-utils";
import { overchargePercent } from "../lib/reports/overcharge-report";

const PRIMARY_WORKFLOW_STATUSES: ReportStatus[] = [
	"open",
	"in_review",
	"resolved",
];

const FILTER_OPTIONS: { value: ReportFilter; label: string }[] = [
	{ value: "all", label: "Todos" },
	{ value: "open", label: REPORT_STATUS_LABELS.open },
	{ value: "in_review", label: REPORT_STATUS_LABELS.in_review },
	{ value: "resolved", label: REPORT_STATUS_LABELS.resolved },
	{ value: "dismissed", label: REPORT_STATUS_LABELS.dismissed },
];

function getStatusBadge(status: ReportStatus): {
	className: string;
	Icon: typeof AlertTriangle;
} {
	switch (status) {
		case "open":
			return { className: "q-badge--alert", Icon: AlertTriangle };
		case "in_review":
			return { className: "q-badge--high", Icon: Eye };
		case "resolved":
			return { className: "q-badge--optimal", Icon: CheckCircle2 };
		case "dismissed":
			return { className: "q-badge--neutral", Icon: XCircle };
	}
}

function getResolutionTone(
	resolvedRate: number,
	total: number,
): "green" | "gold" | "red" {
	if (total === 0 || resolvedRate >= 70) return "green";
	if (resolvedRate >= 40) return "gold";
	return "red";
}

interface OverchargeInboxProps {
	reports: OverchargeReport[];
	summary: ReportStatusSummary;
	isLoading: boolean;
	error: string | null;
	busyId: string | null;
	highlightedReportId: string | null;
	nowMs: number;
	onStatusChange: (reportId: string, nextStatus: ReportStatus) => Promise<void>;
	onRetry: () => void;
}

export function OverchargeInbox({
	reports,
	summary,
	isLoading,
	error,
	busyId,
	highlightedReportId,
	nowMs,
	onStatusChange,
	onRetry,
}: OverchargeInboxProps) {
	const [filter, setFilter] = useState<ReportFilter>("all");

	const resolvedRate = calculateResolvedReportsRate(summary);
	const resolutionTone = getResolutionTone(resolvedRate, summary.total);
	const visibleReports = useMemo(
		() => filterReportsByStatus(reports, filter),
		[reports, filter],
	);

	function countForFilter(value: ReportFilter): number {
		if (value === "all") return summary.total;
		return summary[value];
	}

	return (
		<section
			className="q-card"
			aria-labelledby="overcharge-inbox-title"
			aria-live="polite"
		>
			<div className="q-band q-band--gold" aria-hidden="true" />
			<div className="q-card__head">
				<div>
					<p className="q-eyebrow">
						Tarifa justa · Ciudadanía · Control en vivo
					</p>
					<h2 id="overcharge-inbox-title" className="q-h2 mt-1">
						Bandeja de reportes de cobro abusivo
					</h2>
				</div>
				<span
					className={`q-badge ${
						resolutionTone === "green"
							? "q-badge--optimal"
							: resolutionTone === "gold"
								? "q-badge--high"
								: "q-badge--alert"
					}`}
				>
					{summary.resolved} / {summary.total} resueltos ({resolvedRate} %)
				</span>
			</div>

			<div className="q-card__body space-y-5">
				{/* Resolved reports indicator bar */}
				<div className="rounded-[var(--radius-md)] bg-[var(--bg)] p-4 space-y-3">
					<div className="flex flex-wrap items-baseline justify-between gap-2">
						<div>
							<p className="q-eyebrow">Indicador de reportes resueltos</p>
							<p className="q-sm q-muted mt-0.5">
								Flujo operativo: Nuevo → En revisión → Resuelto
							</p>
						</div>
						<p className="q-num text-2xl font-bold text-[var(--ink)]">
							{resolvedRate} %
						</p>
					</div>

					<div className={`q-meter q-meter--${resolutionTone}`}>
						<meter
							className="q-sr"
							min={0}
							max={Math.max(summary.total, 1)}
							value={summary.resolved}
							aria-label="Porcentaje de reportes de cobro abusivo resueltos"
						>
							{resolvedRate}% ({summary.resolved} de {summary.total})
						</meter>
						<div className="q-meter__head">
							<span className="q-meter__state font-semibold">
								{summary.total === 0
									? "Sin reportes pendientes"
									: `${summary.resolved} resuelto(s) de ${summary.total}`}
							</span>
							<b>{summary.open} nuevo(s)</b>
						</div>
						<div className="q-meter__track" aria-hidden="true">
							<div
								className="q-meter__fill"
								style={{ width: `${Math.min(resolvedRate, 100)}%` }}
							/>
						</div>
					</div>

					<div className="grid grid-cols-3 gap-2.5 pt-1">
						{PRIMARY_WORKFLOW_STATUSES.map((status) => {
							const { className, Icon } = getStatusBadge(status);
							return (
								<button
									key={status}
									type="button"
									onClick={() =>
										setFilter((current) =>
											current === status ? "all" : status,
										)
									}
									aria-pressed={filter === status}
									className={`flex min-h-11 flex-col items-start justify-between rounded-[var(--radius-md)] border p-3 text-left transition-colors ${
										filter === status
											? "border-[var(--action)] bg-[var(--surface-raised)]"
											: "border-[var(--line)] bg-[var(--surface)]"
									}`}
								>
									<span className={`q-badge ${className}`}>
										<Icon size={12} strokeWidth={2} aria-hidden="true" />
										{REPORT_STATUS_LABELS[status]}
									</span>
									<span className="q-num mt-2 text-2xl font-bold text-[var(--ink)]">
										{summary[status]}
									</span>
								</button>
							);
						})}
					</div>
				</div>

				{/* Filter bar */}
				<fieldset
					className="q-seg m-0 flex-wrap border-0"
					aria-label="Filtrar reportes por estado"
				>
					{FILTER_OPTIONS.map((option) => (
						<button
							key={option.value}
							type="button"
							aria-pressed={filter === option.value}
							onClick={() => setFilter(option.value)}
							className={`q-seg__opt min-h-11 ${
								filter === option.value ? "is-on" : ""
							}`}
						>
							{option.label} ({countForFilter(option.value)})
						</button>
					))}
				</fieldset>

				{/* Complete states: loading, error, empty, list */}
				{isLoading ? (
					<div className="flex items-center justify-center gap-3 rounded-[var(--radius-md)] bg-[var(--bg)] px-4 py-10">
						<span
							className="q-star q-star--think text-[var(--gold)]"
							aria-hidden="true"
						/>
						<span className="q-sm q-muted">Cargando bandeja de reportes…</span>
					</div>
				) : error && reports.length === 0 ? (
					<div
						role="alert"
						className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] bg-[var(--red-soft)] p-4 text-sm text-[var(--red-text)]"
					>
						<span>{error}</span>
						<button
							type="button"
							onClick={onRetry}
							className="q-btn q-btn--secondary q-btn--sm min-h-11"
						>
							<RefreshCw size={16} strokeWidth={1.75} aria-hidden="true" />
							Reintentar
						</button>
					</div>
				) : visibleReports.length === 0 ? (
					<div className="rounded-[var(--radius-md)] bg-[var(--bg)] px-4 py-8 text-center">
						<p className="q-p font-medium text-[var(--ink)]">
							{filter === "all"
								? "No hay reportes de cobro abusivo registrados."
								: `No hay reportes en estado "${REPORT_STATUS_LABELS[filter]}".`}
						</p>
						<p className="q-sm q-muted mt-1">
							Cuando un visitante envíe un reporte desde /reportar o el Guía,
							aparecerá aquí en tiempo real.
						</p>
					</div>
				) : (
					<ul className="space-y-3">
						{visibleReports.map((report) => {
							const { className, Icon } = getStatusBadge(report.status);
							const pct = overchargePercent(
								report.charged_fare_cop,
								report.reference_fare_cop,
							);
							const actions = getReportStatusActions(report.status);
							const isHighlighted = highlightedReportId === report.id;
							const isBusy = busyId === report.id;
							const routeTitle = report.route_label ?? ZONE_LABELS[report.zone];

							return (
								<li
									key={report.id}
									className={`rounded-[var(--radius-md)] border p-4 ${
										isHighlighted
											? "border-[var(--gold)] bg-[var(--surface-raised)]"
											: "border-[var(--line)] bg-[var(--bg)]"
									}`}
								>
									<div className="flex flex-wrap items-start justify-between gap-3">
										<div className="space-y-1">
											<div className="flex flex-wrap items-center gap-2">
												<span className={`q-badge ${className}`}>
													<Icon size={12} strokeWidth={2} aria-hidden="true" />
													{REPORT_STATUS_LABELS[report.status]}
												</span>
												{isHighlighted && (
													<span className="q-badge q-badge--event">
														<Sparkles
															size={12}
															strokeWidth={2}
															aria-hidden="true"
														/>
														Recién llegado
													</span>
												)}
												<span className="q-sm q-subtle inline-flex items-center gap-1">
													<Clock
														size={13}
														strokeWidth={1.75}
														aria-hidden="true"
													/>
													{formatRelativeReportTime(report.created_at, nowMs)}
												</span>
											</div>

											<h3 className="q-h3 text-[var(--ink)]">{routeTitle}</h3>
											<p className="q-sm q-muted">
												{ZONE_LABELS[report.zone]} ·{" "}
												{REPORT_TRANSPORT_LABELS[report.transport_mode]}
												{report.driver_qr_code
													? ` · QR ${report.driver_qr_code}`
													: ""}
											</p>
										</div>

										<div className="flex flex-wrap items-center gap-4 text-right">
											<div>
												<p className="q-eyebrow">Cobrado</p>
												<p className="q-num text-lg font-bold text-[var(--red-text)]">
													{formatCop(report.charged_fare_cop)}
												</p>
											</div>
											<div>
												<p className="q-eyebrow">Referencia</p>
												<p className="q-num text-lg font-semibold text-[var(--green-text)]">
													{formatCop(report.reference_fare_cop)}
												</p>
											</div>
											{pct !== null && pct > 0 && (
												<span className="q-badge q-badge--alert q-badge--solid">
													+{pct} %
												</span>
											)}
										</div>
									</div>

									{report.notes && (
										<p className="q-sm q-muted mt-3 rounded-[var(--radius-sm)] bg-[var(--surface)] px-3 py-2">
											{report.notes}
										</p>
									)}

									<div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--line)] pt-3">
										<span className="font-mono text-xs text-[var(--ink-subtle)]">
											ID #{report.id.slice(0, 8)}
										</span>
										<div className="flex flex-wrap items-center gap-2">
											{actions.map((action) => (
												<button
													key={action.nextStatus}
													type="button"
													disabled={isBusy}
													aria-busy={isBusy}
													onClick={() =>
														void onStatusChange(report.id, action.nextStatus)
													}
													className={`q-btn q-btn--sm min-h-11 ${
														action.emphasis === "primary"
															? "q-btn--primary"
															: action.emphasis === "secondary"
																? "q-btn--secondary"
																: "q-btn--ghost"
													}`}
												>
													{action.label}
												</button>
											))}
										</div>
									</div>
								</li>
							);
						})}
					</ul>
				)}
			</div>
		</section>
	);
}
