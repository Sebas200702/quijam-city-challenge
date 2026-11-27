import {
	AlertTriangle,
	ArrowLeft,
	CircleCheck,
	CloudOff,
	RefreshCw,
	Send,
	ShieldCheck,
} from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { useCityState } from "../../lib/city-events/use-city-state";
import { formatFare } from "../../lib/guide/guide-local";
import { useLanguage, useT } from "../../lib/i18n/use-language";
import {
	REPORT_TRANSPORT_MODES,
	type ReportTransportMode,
} from "../../lib/reports/overcharge-report";
import type {
	OverchargeSubmitResponse,
	PendingOverchargeReport,
	SelectableFareRoute,
} from "../../lib/reports/overcharge-report-types";
import {
	evaluateOvercharge,
	queuePendingReport,
	readPendingReports,
	writePendingReports,
} from "../../lib/reports/overcharge-routes";

type FormStatus =
	| { kind: "idle" }
	| { kind: "sending" }
	| {
			kind: "saved";
			reportId: string;
			percent: number | null;
			routeLabel: string;
			chargedCop: number;
			referenceCop: number;
	  }
	| { kind: "offline"; queuedCount: number }
	| { kind: "error"; message: string };

interface OverchargeReportPageProps {
	routes: SelectableFareRoute[];
	initialSegmentCode: string | null;
}

export function OverchargeReportPage({
	routes,
	initialSegmentCode,
}: OverchargeReportPageProps) {
	const id = useId();
	const t = useT();
	const language = useLanguage();
	const formatCop = (amount: number) => formatFare(amount, language);
	const VEHICLE_LABELS: Record<ReportTransportMode, string> =
		t.reports.vehicles;
	const { publish } = useCityState();

	const initialRoute = useMemo(() => {
		if (initialSegmentCode) {
			const match = routes.find(
				(route) => route.segmentCode === initialSegmentCode,
			);
			if (match) return match;
		}
		return routes[0] ?? null;
	}, [routes, initialSegmentCode]);

	const [segmentCode, setSegmentCode] = useState(
		initialRoute?.segmentCode ?? "",
	);
	const [vehicle, setVehicle] = useState<ReportTransportMode>(
		initialRoute?.defaultVehicle ?? "taxi",
	);
	const [charged, setCharged] = useState("");
	const [driverCode, setDriverCode] = useState("");
	const [notes, setNotes] = useState("");
	const [status, setStatus] = useState<FormStatus>({ kind: "idle" });
	const [isOnline, setIsOnline] = useState(true);
	const [pendingCount, setPendingCount] = useState(0);
	const [syncingPending, setSyncingPending] = useState(false);

	useEffect(() => {
		setIsOnline(navigator.onLine);
		setPendingCount(readPendingReports().length);
		const onOnline = () => setIsOnline(true);
		const onOffline = () => setIsOnline(false);
		window.addEventListener("online", onOnline);
		window.addEventListener("offline", onOffline);
		return () => {
			window.removeEventListener("online", onOnline);
			window.removeEventListener("offline", onOffline);
		};
	}, []);

	const selectedRoute = useMemo(
		() =>
			routes.find((route) => route.segmentCode === segmentCode) ??
			routes[0] ??
			null,
		[routes, segmentCode],
	);

	const chargedNumber = Number(charged);
	const comparison = useMemo(() => {
		if (!selectedRoute || !charged.trim()) return null;
		return evaluateOvercharge(chargedNumber, selectedRoute.referenceFareCop);
	}, [selectedRoute, charged, chargedNumber]);

	function handleRouteChange(nextCode: string) {
		setSegmentCode(nextCode);
		const nextRoute = routes.find((route) => route.segmentCode === nextCode);
		if (nextRoute) {
			setVehicle(nextRoute.defaultVehicle);
		}
	}

	function resetForm() {
		setCharged("");
		setDriverCode("");
		setNotes("");
		setStatus({ kind: "idle" });
	}

	async function syncPendingQueue() {
		const queued = readPendingReports();
		if (queued.length === 0 || syncingPending) return;
		setSyncingPending(true);
		const remaining: PendingOverchargeReport[] = [];

		for (const item of queued) {
			try {
				const response = await fetch("/api/reports", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						segmentCode: item.segmentCode,
						transportMode: item.transportMode,
						chargedFareCop: item.chargedFareCop,
						driverQrCode: item.driverQrCode,
						notes: item.notes,
					}),
				});
				if (response.ok) {
					const body = (await response.json()) as OverchargeSubmitResponse;
					if (body.reportId) {
						void publish({ type: "cobro_abusivo", reportId: body.reportId });
					}
				} else if (response.status >= 500) {
					remaining.push(item);
				}
			} catch {
				remaining.push(item);
			}
		}

		writePendingReports(remaining);
		setPendingCount(remaining.length);
		setSyncingPending(false);
		if (remaining.length === 0 && status.kind === "offline") {
			setStatus({ kind: "idle" });
		}
	}

	async function handleSubmit(event: { preventDefault: () => void }) {
		event.preventDefault();
		if (!selectedRoute) return;

		const amount = Math.round(Number(charged));
		if (!Number.isInteger(amount) || amount <= 0) {
			setStatus({
				kind: "error",
				message: t.reports.form.invalidAmount,
			});
			return;
		}

		const payload = {
			segmentCode: selectedRoute.segmentCode,
			transportMode: vehicle,
			chargedFareCop: amount,
			driverQrCode: driverCode.trim(),
			notes: notes.trim(),
		};

		if (!navigator.onLine) {
			const count = queuePendingReport({
				...payload,
				queuedAt: new Date().toISOString(),
			});
			setPendingCount(count);
			setStatus({ kind: "offline", queuedCount: count });
			return;
		}

		setStatus({ kind: "sending" });
		try {
			const response = await fetch("/api/reports", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});

			if (response.ok) {
				const body = (await response.json()) as OverchargeSubmitResponse;
				if (body.reportId) {
					void publish({ type: "cobro_abusivo", reportId: body.reportId });
				}
				setStatus({
					kind: "saved",
					reportId: body.reportId,
					percent: body.overchargePercent,
					routeLabel: selectedRoute.label,
					chargedCop: amount,
					referenceCop: body.referenceFareCop,
				});
				return;
			}

			if (response.status >= 500) {
				const count = queuePendingReport({
					...payload,
					queuedAt: new Date().toISOString(),
				});
				setPendingCount(count);
				setStatus({ kind: "offline", queuedCount: count });
				return;
			}

			const body = (await response.json().catch(() => null)) as {
				error?: string;
			} | null;
			setStatus({
				kind: "error",
				message: body?.error ?? t.reports.form.validateError,
			});
		} catch {
			const count = queuePendingReport({
				...payload,
				queuedAt: new Date().toISOString(),
			});
			setPendingCount(count);
			setStatus({ kind: "offline", queuedCount: count });
		}
	}

	if (routes.length === 0 || !selectedRoute) {
		return (
			<section className="q-card" aria-labelledby={`${id}-empty`}>
				<div className="q-band q-band--gold" aria-hidden="true" />
				<div className="q-card__head">
					<div>
						<p className="q-eyebrow">{t.reports.empty.eyebrow}</p>
						<h1 id={`${id}-empty`} className="q-h2 mt-1">
							{t.reports.empty.title}
						</h1>
					</div>
				</div>
				<div className="q-card__body">
					<p className="q-p q-muted">{t.reports.empty.body}</p>
					<a href="/mapa" className="q-btn q-btn--primary">
						<ArrowLeft size={18} strokeWidth={1.75} aria-hidden="true" />
						{t.reports.backToMap}
					</a>
				</div>
			</section>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<a href="/mapa" className="q-btn q-btn--ghost q-btn--sm">
					<ArrowLeft size={18} strokeWidth={1.75} aria-hidden="true" />
					{t.reports.backToMap}
				</a>
				<span className="q-sim-tag">{t.reports.referenceData}</span>
			</div>

			{!isOnline && (
				<div
					role="status"
					className="flex items-center gap-3 rounded-[var(--radius-md)] bg-[var(--gold-soft)] px-4 py-3 text-sm text-[var(--ink)]"
				>
					<CloudOff
						size={20}
						strokeWidth={1.75}
						className="shrink-0 text-[var(--gold-text)]"
						aria-hidden="true"
					/>
					<span>{t.reports.offlineNotice}</span>
				</div>
			)}

			{pendingCount > 0 && isOnline && (
				<div
					role="status"
					className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] bg-[var(--gold-soft)] px-4 py-3 text-sm text-[var(--ink)]"
				>
					<span>{t.reports.pending(pendingCount)}</span>
					<button
						type="button"
						className="q-btn q-btn--secondary q-btn--sm"
						disabled={syncingPending}
						aria-busy={syncingPending}
						onClick={() => void syncPendingQueue()}
					>
						<RefreshCw size={16} strokeWidth={1.75} aria-hidden="true" />
						{syncingPending ? t.reports.resending : t.reports.resendNow}
					</button>
				</div>
			)}

			{status.kind === "saved" ? (
				<section
					className="q-card"
					role="status"
					aria-live="polite"
					aria-labelledby={`${id}-saved-title`}
				>
					<div className="q-band q-band--green" aria-hidden="true" />
					<div className="q-card__head">
						<div className="flex items-center gap-3">
							<CircleCheck
								size={24}
								strokeWidth={1.75}
								className="shrink-0 text-[var(--green-text)]"
								aria-hidden="true"
							/>
							<div>
								<p className="q-eyebrow">{t.reports.saved.eyebrow}</p>
								<h1 id={`${id}-saved-title`} className="q-h2 mt-0.5">
									{t.reports.saved.title}
								</h1>
							</div>
						</div>
						<span className="q-badge q-badge--alert">
							{t.reports.saved.badge}
						</span>
					</div>
					<div className="q-card__body space-y-4">
						<p className="q-p">
							{status.percent !== null && status.percent > 0
								? t.reports.saved.summaryOver(
										formatCop(status.chargedCop),
										status.percent,
										formatCop(status.referenceCop),
									)
								: t.reports.saved.summaryNormal(
										formatCop(status.chargedCop),
										formatCop(status.referenceCop),
									)}
						</p>
						<div className="rounded-[var(--radius-md)] bg-[var(--bg)] p-4 text-sm space-y-1.5">
							<p className="font-semibold text-[var(--ink)]">
								{status.routeLabel}
							</p>
							<p className="q-sm q-muted">
								{t.reports.saved.currentState}{" "}
								<strong>{t.reports.saved.stateNew}</strong> ·{" "}
								{t.reports.saved.willMoveTo}{" "}
								<strong>{t.reports.saved.stateReview}</strong>{" "}
								{t.reports.saved.and}{" "}
								<strong>{t.reports.saved.stateResolved}</strong>{" "}
								{t.reports.saved.onBoard}
							</p>
							<p className="font-mono text-xs text-[var(--ink-subtle)]">
								{t.reports.saved.referenceLabel} #{status.reportId.slice(0, 8)}
							</p>
						</div>
						<div className="q-row">
							<button
								type="button"
								className="q-btn q-btn--primary"
								onClick={resetForm}
							>
								{t.reports.saved.another}
							</button>
							<a href="/mapa" className="q-btn q-btn--secondary">
								{t.reports.backToMap}
							</a>
						</div>
					</div>
				</section>
			) : status.kind === "offline" ? (
				<section
					className="q-card"
					role="status"
					aria-live="polite"
					aria-labelledby={`${id}-offline-title`}
				>
					<div className="q-band q-band--gold" aria-hidden="true" />
					<div className="q-card__head">
						<div className="flex items-center gap-3">
							<CloudOff
								size={24}
								strokeWidth={1.75}
								className="shrink-0 text-[var(--gold-text)]"
								aria-hidden="true"
							/>
							<div>
								<p className="q-eyebrow">{t.reports.offline.eyebrow}</p>
								<h1 id={`${id}-offline-title`} className="q-h2 mt-0.5">
									{t.reports.offline.title}
								</h1>
							</div>
						</div>
					</div>
					<div className="q-card__body space-y-4">
						<p className="q-p q-muted">
							{t.reports.offline.body(status.queuedCount)}
						</p>
						<div className="q-row">
							<button
								type="button"
								className="q-btn q-btn--primary"
								disabled={syncingPending}
								onClick={() => void syncPendingQueue()}
							>
								<RefreshCw size={18} strokeWidth={1.75} aria-hidden="true" />
								{syncingPending
									? t.reports.offline.retrying
									: t.reports.offline.retry}
							</button>
							<button
								type="button"
								className="q-btn q-btn--secondary"
								onClick={resetForm}
							>
								{t.reports.offline.newReport}
							</button>
						</div>
					</div>
				</section>
			) : (
				<section className="q-card" aria-labelledby={`${id}-title`}>
					<div className="q-band q-band--gold" aria-hidden="true" />
					<div className="q-card__head">
						<div>
							<p className="q-eyebrow">{t.reports.form.eyebrow}</p>
							<h1 id={`${id}-title`} className="q-h1 mt-1">
								{t.reports.form.title}
							</h1>
						</div>
					</div>

					<form className="q-card__body space-y-5" onSubmit={handleSubmit}>
						<label className="block space-y-1.5" htmlFor={`${id}-route`}>
							<span className="q-sm font-semibold text-[var(--ink)]">
								{t.reports.form.route}
							</span>
							<select
								id={`${id}-route`}
								value={selectedRoute.segmentCode}
								onChange={(event) => handleRouteChange(event.target.value)}
								className="min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--line-control)] bg-[var(--surface-raised)] px-3.5 py-2.5 text-[15px] text-[var(--ink)]"
							>
								{routes.map((route) => (
									<option key={route.segmentCode} value={route.segmentCode}>
										{route.label} ({VEHICLE_LABELS[route.defaultVehicle]} ·{" "}
										{formatCop(route.referenceFareCop)})
									</option>
								))}
							</select>
						</label>

						<div
							className="rounded-[var(--radius-md)] bg-[var(--green-soft)] p-4"
							aria-live="polite"
						>
							<p className="q-eyebrow text-[var(--green-text)]">
								{t.reports.form.officialFare}
							</p>
							<div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
								<span className="q-num text-2xl font-bold text-[var(--ink)]">
									{formatCop(selectedRoute.referenceFareCop)}
								</span>
								{selectedRoute.fareMinCop !== selectedRoute.fareMaxCop && (
									<span className="q-sm q-muted">
										{t.reports.form.fairRange(
											formatCop(selectedRoute.fareMinCop),
											formatCop(selectedRoute.fareMaxCop),
										)}
									</span>
								)}
							</div>
						</div>

						<fieldset className="m-0 border-0 p-0 space-y-2">
							<legend className="q-sm font-semibold text-[var(--ink)]">
								{t.reports.form.vehicleQuestion}
							</legend>
							<div className="q-seg w-full">
								{REPORT_TRANSPORT_MODES.map((option) => (
									<button
										key={option}
										type="button"
										aria-pressed={vehicle === option}
										onClick={() => setVehicle(option)}
										className={`q-seg__opt min-h-11 flex-1 ${
											vehicle === option ? "is-on" : ""
										}`}
									>
										{VEHICLE_LABELS[option]}
									</button>
								))}
							</div>
						</fieldset>

						<div className="space-y-2">
							<label className="block space-y-1.5" htmlFor={`${id}-charged`}>
								<span className="q-sm font-semibold text-[var(--ink)]">
									{t.reports.form.charged}
								</span>
								<input
									id={`${id}-charged`}
									type="number"
									inputMode="numeric"
									min={1}
									max={2_000_000}
									step={1}
									required
									placeholder={t.reports.form.chargedPlaceholder}
									value={charged}
									onChange={(event) => setCharged(event.target.value)}
									className="min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--line-control)] bg-[var(--surface-raised)] px-3.5 py-2.5 text-[15px] text-[var(--ink)]"
								/>
							</label>

							{comparison && (
								<div
									aria-live="polite"
									className={`flex items-center gap-2 rounded-[var(--radius-md)] px-3.5 py-2.5 text-sm font-medium ${
										comparison.isOvercharge
											? "bg-[var(--red-soft)] text-[var(--red-text)]"
											: "bg-[var(--green-soft)] text-[var(--green-text)]"
									}`}
								>
									{comparison.isOvercharge ? (
										<AlertTriangle
											size={18}
											strokeWidth={1.75}
											className="shrink-0"
											aria-hidden="true"
										/>
									) : (
										<CircleCheck
											size={18}
											strokeWidth={1.75}
											className="shrink-0"
											aria-hidden="true"
										/>
									)}
									<span>
										{comparison.isOvercharge
											? `${t.reports.form.overcharge(formatCop(comparison.deltaCop))}${
													comparison.percent !== null
														? t.reports.form.overchargePercent(
																comparison.percent,
															)
														: ""
												}`
											: t.reports.form.withinFare}
									</span>
								</div>
							)}
						</div>

						<label className="block space-y-1.5" htmlFor={`${id}-driver`}>
							<span className="q-sm font-semibold text-[var(--ink)]">
								{t.reports.form.driverCode}{" "}
								<span className="font-normal text-[var(--ink-muted)]">
									{t.reports.form.optional}
								</span>
							</span>
							<input
								id={`${id}-driver`}
								type="text"
								maxLength={40}
								pattern="[A-Za-z0-9\-]+"
								placeholder={t.reports.form.driverPlaceholder}
								value={driverCode}
								onChange={(event) => setDriverCode(event.target.value)}
								className="min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--line-control)] bg-[var(--surface-raised)] px-3.5 py-2.5 text-[15px] text-[var(--ink)]"
							/>
						</label>

						<label className="block space-y-1.5" htmlFor={`${id}-notes`}>
							<span className="q-sm font-semibold text-[var(--ink)]">
								{t.reports.form.notes}{" "}
								<span className="font-normal text-[var(--ink-muted)]">
									{t.reports.form.optional}
								</span>
							</span>
							<textarea
								id={`${id}-notes`}
								rows={3}
								maxLength={280}
								placeholder={t.reports.form.notesPlaceholder}
								value={notes}
								onChange={(event) => setNotes(event.target.value)}
								className="min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--line-control)] bg-[var(--surface-raised)] px-3.5 py-2.5 text-[15px] text-[var(--ink)]"
							/>
						</label>

						{status.kind === "error" && (
							<p
								role="alert"
								className="rounded-[var(--radius-md)] bg-[var(--red-soft)] px-4 py-3 text-sm text-[var(--red-text)]"
							>
								{status.message}
							</p>
						)}

						<p className="q-sm q-subtle flex items-center gap-2">
							<ShieldCheck
								size={16}
								strokeWidth={1.75}
								className="shrink-0"
								aria-hidden="true"
							/>
							{t.reports.form.privacy}
						</p>

						<button
							type="submit"
							className="q-btn q-btn--primary q-btn--block"
							disabled={status.kind === "sending"}
							aria-busy={status.kind === "sending"}
						>
							<Send size={18} strokeWidth={1.75} aria-hidden="true" />
							{status.kind === "sending"
								? t.reports.form.sending
								: t.reports.form.submit}
						</button>
					</form>
				</section>
			)}
		</div>
	);
}
