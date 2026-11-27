import {
	AlertTriangle,
	CheckCircle2,
	Clock,
	Eye,
	Receipt,
	SearchX,
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
	getReportStatusActions,
	ZONE_LABELS,
} from "../lib/city-dashboard-utils";
import { formatFare } from "../lib/guide/guide-local";
import { useLanguage, useT } from "../lib/i18n/use-language";
import { overchargePercent } from "../lib/reports/overcharge-report";
import { SectionState } from "./city/sections/section-state";

const PRIMARY_WORKFLOW_STATUSES: ReportStatus[] = [
	"open",
	"in_review",
	"resolved",
];

const FILTER_VALUES: ReportFilter[] = [
	"all",
	"open",
	"in_review",
	"resolved",
	"dismissed",
];

function getActionKey(
	status: ReportStatus,
	nextStatus: ReportStatus,
): "review" | "resolve" | "markResolved" | "dismiss" | "reopen" {
	if (nextStatus === "dismissed") return "dismiss";
	if (nextStatus === "in_review") {
		return status === "open" ? "review" : "reopen";
	}
	return status === "open" ? "resolve" : "markResolved";
}

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
	const t = useT().inbox;
	const language = useLanguage();

	function relativeTime(createdAtIso: string): string {
		const diffSeconds = Math.max(
			0,
			Math.floor((nowMs - new Date(createdAtIso).getTime()) / 1000),
		);
		if (diffSeconds < 60) return t.ago.now;
		const diffMinutes = Math.floor(diffSeconds / 60);
		if (diffMinutes < 60) return t.ago.minutes(diffMinutes);
		const diffHours = Math.floor(diffMinutes / 60);
		if (diffHours < 24) return t.ago.hours(diffHours);
		return t.ago.days(Math.floor(diffHours / 24));
	}

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
			className="q-card l-rise relative overflow-hidden rounded-[28px_56px_28px_28px]"
			lang={language}
			aria-labelledby="overcharge-inbox-title"
			aria-live="polite"
		>
			<div className="q-band q-band--gold" aria-hidden="true" />
			<div className="q-card__head relative bg-[linear-gradient(135deg,var(--gold-soft),var(--surface)_70%)]">
				<span
					aria-hidden="true"
					className="l-geo l-geo--ring l-geo--gold absolute right-24 -top-3 max-lg:hidden"
				/>
				<span
					aria-hidden="true"
					className="l-geo l-geo--plus l-geo--green absolute right-1/3 bottom-2 max-lg:hidden"
				/>
				<div className="relative">
					<p className="l-eyebrow">
						<span className="q-dot" aria-hidden="true" />
						{t.eyebrow}
					</p>
					<h2
						id="overcharge-inbox-title"
						className="l-h2 mt-2 !text-[clamp(1.5rem,3vw,2.1rem)]"
					>
						{t.title}
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
					{t.resolvedBadge(
						summary.resolved,
						summary.total,
						t.percent(resolvedRate),
					)}
				</span>
			</div>

			<div className="q-card__body space-y-5">
				{/* Resolved reports indicator bar */}
				<div className="rounded-[36px_16px_36px_16px] bg-[var(--bg)] p-5 space-y-3">
					<div className="flex flex-wrap items-baseline justify-between gap-2">
						<div>
							<p className="q-eyebrow">{t.indicatorEyebrow}</p>
							<p className="q-sm q-muted mt-0.5">{t.flow}</p>
						</div>
						<p className="q-num text-2xl font-bold text-[var(--ink)]">
							{t.percent(resolvedRate)}
						</p>
					</div>

					<div className={`q-meter q-meter--${resolutionTone}`}>
						<meter
							className="q-sr"
							min={0}
							max={Math.max(summary.total, 1)}
							value={summary.resolved}
							aria-label={t.meterLabel}
						>
							{t.meterText(
								t.meterPercent(resolvedRate),
								summary.resolved,
								summary.total,
							)}
						</meter>
						<div className="q-meter__head">
							<span className="q-meter__state font-semibold">
								{summary.total === 0
									? t.noPending
									: t.resolvedOf(summary.resolved, summary.total)}
							</span>
							<b>{t.newCount(summary.open)}</b>
						</div>
						<div className="q-meter__track" aria-hidden="true">
							<div
								className="q-meter__fill"
								style={{ width: `${Math.min(resolvedRate, 100)}%` }}
							/>
						</div>
					</div>

					<div className="grid gap-2.5 pt-1 sm:grid-cols-3">
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
									className={`flex min-h-11 items-center justify-between gap-2 sm:flex-col sm:items-start border p-3 text-left transition-[transform,border-color,background-color] duration-200 hover:-translate-y-0.5 ${
										status === PRIMARY_WORKFLOW_STATUSES[0]
											? "rounded-[24px_24px_24px_6px]"
											: status === PRIMARY_WORKFLOW_STATUSES[1]
												? "rounded-[18px]"
												: "rounded-[24px_6px_24px_24px]"
									} ${
										filter === status
											? "border-[var(--action)] bg-[var(--surface-raised)]"
											: "border-[var(--line)] bg-[var(--surface)]"
									}`}
								>
									<span className={`q-badge ${className}`}>
										<Icon size={12} strokeWidth={2} aria-hidden="true" />
										{t.status[status]}
									</span>
									<span className="q-num text-2xl font-bold text-[var(--ink)] sm:mt-2">
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
					aria-label={t.filterAria}
				>
					{FILTER_VALUES.map((value) => (
						<button
							key={value}
							type="button"
							aria-pressed={filter === value}
							onClick={() => setFilter(value)}
							className={`q-seg__opt min-h-11 ${
								filter === value ? "is-on" : ""
							}`}
						>
							{value === "all" ? t.all : t.status[value]} (
							{countForFilter(value)})
						</button>
					))}
				</fieldset>

				{/* Complete states: loading, error, empty, list */}
				{isLoading ? (
					<SectionState
						compact
						kind="loading"
						title={t.loadingTitle}
						text={t.loadingText}
					/>
				) : error && reports.length === 0 ? (
					<SectionState
						compact
						kind="error"
						icon={Receipt}
						title={t.errorTitle}
						text={error}
						onRetry={onRetry}
					/>
				) : visibleReports.length === 0 ? (
					filter === "all" ? (
						<SectionState
							compact
							kind="empty"
							illustration="/illustrations/transport.svg"
							title={t.emptyTitle}
							text={t.emptyText}
						/>
					) : (
						<SectionState
							compact
							kind="empty"
							icon={SearchX}
							title={t.emptyFilterTitle(t.status[filter])}
							text={t.emptyFilterText}
						/>
					)
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
									className={`l-rise rounded-[24px_40px_24px_24px] border p-4 transition-transform duration-200 hover:-translate-y-0.5 ${
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
													{t.status[report.status]}
												</span>
												{isHighlighted && (
													<span className="q-badge q-badge--event">
														<Sparkles
															size={12}
															strokeWidth={2}
															aria-hidden="true"
														/>
														{t.justArrived}
													</span>
												)}
												<span className="q-sm q-subtle inline-flex items-center gap-1">
													<Clock
														size={13}
														strokeWidth={1.75}
														aria-hidden="true"
													/>
													{relativeTime(report.created_at)}
												</span>
											</div>

											<h3 className="q-h3 text-[var(--ink)]">{routeTitle}</h3>
											<p className="q-sm q-muted">
												{ZONE_LABELS[report.zone]} ·{" "}
												{t.transport[report.transport_mode]}
												{report.driver_qr_code
													? ` · QR ${report.driver_qr_code}`
													: ""}
											</p>
										</div>

										<div className="flex flex-wrap items-center gap-4 text-right">
											<div>
												<p className="q-eyebrow">{t.charged}</p>
												<p className="q-num text-lg font-bold text-[var(--red-text)]">
													{formatFare(report.charged_fare_cop, language)}
												</p>
											</div>
											<div>
												<p className="q-eyebrow">{t.reference}</p>
												<p className="q-num text-lg font-semibold text-[var(--green-text)]">
													{formatFare(report.reference_fare_cop, language)}
												</p>
											</div>
											{pct !== null && pct > 0 && (
												<span className="q-badge q-badge--alert q-badge--solid">
													+{t.percent(pct)}
												</span>
											)}
										</div>
									</div>

									{report.notes && (
										<p className="q-sm q-muted mt-3 rounded-[4px_18px_18px_18px] bg-[var(--gold-soft)] px-3 py-2">
											{report.notes}
										</p>
									)}

									<div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--line)] pt-3">
										<span className="font-mono text-xs text-[var(--ink-subtle)]">
											{t.idLabel} #{report.id.slice(0, 8)}
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
													{
														t.actions[
															getActionKey(report.status, action.nextStatus)
														]
													}
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
