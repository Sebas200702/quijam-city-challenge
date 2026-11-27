import {
	AlertTriangle,
	ArrowLeft,
	CircleAlert,
	CircleCheck,
	CloudOff,
	RefreshCw,
	Send,
	ShieldCheck,
} from "lucide-react";
import {
	useCallback,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
import { formatCop } from "../../lib/city-dashboard-utils";
import { useCityState } from "../../lib/city-events/use-city-state";
import { useT } from "../../lib/i18n/use-language";
import {
	isValidDriverCode,
	parseFareAmount,
} from "../../lib/reports/fare-amount";
import {
	REPORT_TRANSPORT_MODES,
	type ReportTransportMode,
} from "../../lib/reports/overcharge-report";
import type {
	OverchargeSubmitResponse,
	SelectableFareRoute,
} from "../../lib/reports/overcharge-report-types";
import {
	evaluateOvercharge,
	queuePendingReport,
	readPendingReports,
} from "../../lib/reports/overcharge-routes";
import { sendPendingReports } from "../../lib/reports/pending-report-sync";
import type { UrlValues } from "../../lib/url-state/params";
import type { REPORT_FORM_SCHEMA } from "../../lib/url-state/schemas";
import {
	PrefillNotice,
	SUGGESTED_CLASS,
	SuggestedTag,
	usePrefill,
} from "../prefill/prefill-ui";
import { ReportIllustration } from "./report-illustration";

/** Draft read from the URL by the page (see REPORT_FORM_SCHEMA). */
export type ReportDraft = UrlValues<typeof REPORT_FORM_SCHEMA>;

type DraftField = "route" | "vehicle" | "amount" | "driver" | "notes";

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
	/** Fields that came in the URL (Quillart AI or a shared link). */
	draft?: Partial<ReportDraft>;
}

const INPUT_CLASS =
	"min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--line-control)] bg-[var(--surface-raised)] px-3.5 py-2.5 text-[15px] text-[var(--ink)]";
const INVALID_CLASS = "border-2 border-[var(--red)]";

function FieldError({ id, message }: { id: string; message: string }) {
	return (
		<p
			id={id}
			className="flex items-start gap-1.5 text-sm font-semibold text-[var(--red-text)]"
		>
			<CircleAlert
				size={16}
				strokeWidth={1.75}
				className="mt-0.5 shrink-0"
				aria-hidden="true"
			/>
			{message}
		</p>
	);
}

export function OverchargeReportPage({
	routes,
	initialSegmentCode,
	draft = {},
}: OverchargeReportPageProps) {
	const t = useT().reports;
	const id = useId();
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
		draft.vehiculo || initialRoute?.defaultVehicle || "taxi",
	);
	const [charged, setCharged] = useState(draft.monto ?? "");
	const [driverCode, setDriverCode] = useState(draft.codigo ?? "");
	const [notes, setNotes] = useState(draft.notas ?? "");
	const prefill = usePrefill<DraftField>(
		(
			[
				["route", initialRoute && initialRoute.segmentCode === draft.segment],
				["vehicle", Boolean(draft.vehiculo)],
				["amount", Boolean(draft.monto)],
				["driver", Boolean(draft.codigo)],
				["notes", Boolean(draft.notas)],
			] as const
		)
			.filter(([, on]) => on)
			.map(([field]) => field),
	);
	// The tag sits inside each <label>, so it is already part of the name:
	// only the background changes here.
	const suggested = (
		field: DraftField,
		className: string,
		describedBy?: string,
	) => ({
		className: prefill.isSuggested(field)
			? `${className} ${SUGGESTED_CLASS}`
			: className,
		"aria-describedby": describedBy,
	});
	const [status, setStatus] = useState<FormStatus>({ kind: "idle" });
	const [isOnline, setIsOnline] = useState(true);
	const [pendingCount, setPendingCount] = useState(0);
	const [syncingPending, setSyncingPending] = useState(false);
	const [showErrors, setShowErrors] = useState(false);
	const amountRef = useRef<HTMLInputElement>(null);
	const driverRef = useRef<HTMLInputElement>(null);

	const syncPendingQueue = useCallback(async () => {
		setSyncingPending(true);
		const remaining = await sendPendingReports({
			onSaved: (reportId) => void publish({ type: "cobro_abusivo", reportId }),
		});
		setPendingCount(remaining);
		setSyncingPending(false);
		if (remaining === 0) {
			setStatus((current) =>
				current.kind === "offline" ? { kind: "idle" } : current,
			);
		}
	}, [publish]);

	// Reports kept on the phone go out by themselves on load and whenever the
	// connection comes back; "Reenviar ahora" stays as a manual fallback.
	useEffect(() => {
		setIsOnline(navigator.onLine);
		setPendingCount(readPendingReports().length);
		if (navigator.onLine) void syncPendingQueue();
		const onOnline = () => {
			setIsOnline(true);
			void syncPendingQueue();
		};
		const onOffline = () => setIsOnline(false);
		window.addEventListener("online", onOnline);
		window.addEventListener("offline", onOffline);
		return () => {
			window.removeEventListener("online", onOnline);
			window.removeEventListener("offline", onOffline);
		};
	}, [syncPendingQueue]);

	const selectedRoute = useMemo(
		() =>
			routes.find((route) => route.segmentCode === segmentCode) ??
			routes[0] ??
			null,
		[routes, segmentCode],
	);

	const amount = parseFareAmount(charged);
	const chargedCop = amount.ok ? amount.value : null;
	const comparison = useMemo(() => {
		if (!selectedRoute || chargedCop === null) return null;
		return evaluateOvercharge(chargedCop, selectedRoute.referenceFareCop);
	}, [selectedRoute, chargedCop]);
	const amountError =
		showErrors && !amount.ok ? t.amountErrors[amount.reason] : null;
	const driverError =
		showErrors && !isValidDriverCode(driverCode) ? t.driverCodeError : null;

	function handleRouteChange(nextCode: string) {
		setSegmentCode(nextCode);
		prefill.accept("route");
		prefill.accept("vehicle");
		const nextRoute = routes.find((route) => route.segmentCode === nextCode);
		if (nextRoute) {
			setVehicle(nextRoute.defaultVehicle);
		}
	}

	function resetForm() {
		for (const field of ["amount", "driver", "notes"] as const)
			prefill.accept(field);
		setCharged("");
		setDriverCode("");
		setNotes("");
		setShowErrors(false);
		setStatus({ kind: "idle" });
	}

	async function handleSubmit(event: { preventDefault: () => void }) {
		event.preventDefault();
		if (!selectedRoute || status.kind === "sending") return;

		// Field errors say how to fix them; focus goes to the first one.
		setShowErrors(true);
		if (!amount.ok) {
			amountRef.current?.focus();
			return;
		}
		if (!isValidDriverCode(driverCode)) {
			driverRef.current?.focus();
			return;
		}

		const payload = {
			segmentCode: selectedRoute.segmentCode,
			transportMode: vehicle,
			chargedFareCop: amount.value,
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
					chargedCop: amount.value,
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
				message: body?.error ?? t.serverFallbackError,
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
						<p className="q-eyebrow">{t.empty.eyebrow}</p>
						<h1 id={`${id}-empty`} className="q-h2 mt-1">
							{t.empty.title}
						</h1>
					</div>
				</div>
				<div className="q-card__body">
					<p className="q-p q-muted">{t.empty.body}</p>
					<a href="/mapa" className="q-btn q-btn--primary">
						<ArrowLeft size={18} strokeWidth={1.75} aria-hidden="true" />
						{t.backToMap}
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
					{t.backToMap}
				</a>
				<span className="q-sim-tag">{t.referenceData}</span>
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
					<span>{t.offlineBanner}</span>
				</div>
			)}

			{pendingCount > 0 && isOnline && (
				<div
					role="status"
					className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] bg-[var(--gold-soft)] px-4 py-3 text-sm text-[var(--ink)]"
				>
					<span>{t.pendingBanner(pendingCount)}</span>
					<button
						type="button"
						className="q-btn q-btn--secondary q-btn--sm"
						disabled={syncingPending}
						aria-busy={syncingPending}
						onClick={() => void syncPendingQueue()}
					>
						<RefreshCw size={16} strokeWidth={1.75} aria-hidden="true" />
						{syncingPending ? t.resending : t.resendNow}
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
								<p className="q-eyebrow">{t.saved.eyebrow}</p>
								<h1 id={`${id}-saved-title`} className="q-h2 mt-0.5">
									{t.saved.title}
								</h1>
							</div>
						</div>
						<span className="q-badge q-badge--alert">{t.status.new}</span>
					</div>
					<div className="q-card__body space-y-4">
						<ReportIllustration kind="sent" className="mx-auto w-36" />
						<p className="q-p">
							{status.percent !== null && status.percent > 0
								? t.saved.withPercent(
										formatCop(status.chargedCop),
										status.percent,
										formatCop(status.referenceCop),
									)
								: t.saved.withoutPercent(
										formatCop(status.chargedCop),
										formatCop(status.referenceCop),
									)}
						</p>
						<div className="rounded-[var(--radius-md)] bg-[var(--bg)] p-4 text-sm space-y-1.5">
							<p className="font-semibold text-[var(--ink)]">
								{status.routeLabel}
							</p>
							<p className="q-sm q-muted">
								{t.saved.currentStatus} <strong>{t.status.new}</strong> ·{" "}
								{t.saved.willMoveTo} <strong>{t.status.inReview}</strong>{" "}
								{t.saved.and} <strong>{t.status.resolved}</strong>{" "}
								{t.saved.onCityBoard}
							</p>
							<p className="font-mono text-xs text-[var(--ink-subtle)]">
								{t.saved.reference(status.reportId.slice(0, 8))}
							</p>
						</div>
						<div className="q-row">
							<button
								type="button"
								className="q-btn q-btn--primary"
								onClick={resetForm}
							>
								{t.saved.reportAnother}
							</button>
							<a href="/mapa" className="q-btn q-btn--secondary">
								{t.backToMap}
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
								<p className="q-eyebrow">{t.offline.eyebrow}</p>
								<h1 id={`${id}-offline-title`} className="q-h2 mt-0.5">
									{t.offline.title}
								</h1>
							</div>
						</div>
					</div>
					<div className="q-card__body space-y-4">
						<ReportIllustration kind="saved" className="mx-auto w-36" />
						<p className="q-p q-muted">{t.offline.body(status.queuedCount)}</p>
						<div className="q-row">
							<button
								type="button"
								className="q-btn q-btn--primary"
								disabled={syncingPending}
								onClick={() => void syncPendingQueue()}
							>
								<RefreshCw size={18} strokeWidth={1.75} aria-hidden="true" />
								{syncingPending ? t.offline.retrying : t.offline.retry}
							</button>
							<button
								type="button"
								className="q-btn q-btn--secondary"
								onClick={resetForm}
							>
								{t.offline.newReport}
							</button>
						</div>
					</div>
				</section>
			) : (
				<section className="q-card" aria-labelledby={`${id}-title`}>
					<div className="q-band q-band--gold" aria-hidden="true" />
					<div className="q-card__head">
						<div>
							<p className="q-eyebrow">{t.form.eyebrow}</p>
							<h1 id={`${id}-title`} className="q-h1 mt-1">
								{t.form.title}
							</h1>
						</div>
					</div>

					<form
						className="q-card__body space-y-5"
						onSubmit={handleSubmit}
						noValidate
					>
						<PrefillNotice count={prefill.total} />
						<label className="block space-y-1.5" htmlFor={`${id}-route`}>
							<span className="q-sm flex flex-wrap items-center gap-2 font-semibold text-[var(--ink)]">
								{t.form.route}
								{prefill.isSuggested("route") && (
									<SuggestedTag fieldId={`${id}-route`} />
								)}
							</span>
							<select
								id={`${id}-route`}
								value={selectedRoute.segmentCode}
								onChange={(event) => handleRouteChange(event.target.value)}
								{...suggested("route", INPUT_CLASS)}
							>
								{routes.map((route) => (
									<option key={route.segmentCode} value={route.segmentCode}>
										{route.label} ({t.vehicles[route.defaultVehicle]} ·{" "}
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
								{t.form.referenceFare}
							</p>
							<div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
								<span className="q-num text-2xl font-bold text-[var(--ink)]">
									{formatCop(selectedRoute.referenceFareCop)}
								</span>
								{selectedRoute.fareMinCop !== selectedRoute.fareMaxCop && (
									<span className="q-sm q-muted">
										{t.form.fairRange(
											formatCop(selectedRoute.fareMinCop),
											formatCop(selectedRoute.fareMaxCop),
										)}
									</span>
								)}
							</div>
						</div>

						<fieldset className="m-0 border-0 p-0 space-y-2">
							<legend className="q-sm flex flex-wrap items-center gap-2 font-semibold text-[var(--ink)]">
								{t.form.vehicleLegend}
								{prefill.isSuggested("vehicle") && (
									<SuggestedTag fieldId={`${id}-vehicle`} />
								)}
							</legend>
							<div className="q-seg w-full">
								{REPORT_TRANSPORT_MODES.map((option) => (
									<button
										key={option}
										type="button"
										aria-pressed={vehicle === option}
										onClick={() => {
											setVehicle(option);
											prefill.accept("vehicle");
										}}
										className={`q-seg__opt min-h-11 flex-1 ${
											vehicle === option ? "is-on" : ""
										}`}
									>
										{t.vehicles[option]}
									</button>
								))}
							</div>
						</fieldset>

						<div className="space-y-2">
							<label className="block space-y-1.5" htmlFor={`${id}-charged`}>
								<span className="q-sm flex flex-wrap items-center gap-2 font-semibold text-[var(--ink)]">
									{t.form.amountLabel}
									{prefill.isSuggested("amount") && (
										<SuggestedTag fieldId={`${id}-charged`} />
									)}
								</span>
								<input
									ref={amountRef}
									id={`${id}-charged`}
									type="text"
									inputMode="numeric"
									autoComplete="off"
									required
									placeholder={t.form.amountPlaceholder}
									aria-invalid={amountError !== null}
									value={charged}
									onChange={(event) => {
										setCharged(event.target.value);
										prefill.accept("amount");
									}}
									{...suggested(
										"amount",
										`${INPUT_CLASS} ${amountError ? INVALID_CLASS : ""}`,
										amountError ? `${id}-charged-error` : undefined,
									)}
								/>
							</label>
							{amountError && (
								<FieldError id={`${id}-charged-error`} message={amountError} />
							)}

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
											? `${t.form.overchargeEstimate(formatCop(comparison.deltaCop))}${
													comparison.percent !== null
														? t.form.overchargePercent(comparison.percent)
														: ""
												}`
											: t.form.withinReference}
									</span>
								</div>
							)}
						</div>

						<label className="block space-y-1.5" htmlFor={`${id}-driver`}>
							<span className="q-sm font-semibold text-[var(--ink)]">
								{t.form.driverLabel}{" "}
								<span className="font-normal text-[var(--ink-muted)]">
									{t.form.optional}
								</span>
								{prefill.isSuggested("driver") && (
									<>
										{" "}
										<SuggestedTag fieldId={`${id}-driver`} />
									</>
								)}
							</span>
							<input
								ref={driverRef}
								id={`${id}-driver`}
								type="text"
								maxLength={40}
								autoComplete="off"
								placeholder={t.form.driverPlaceholder}
								aria-invalid={driverError !== null}
								value={driverCode}
								onChange={(event) => {
									setDriverCode(event.target.value);
									prefill.accept("driver");
								}}
								{...suggested(
									"driver",
									`${INPUT_CLASS} ${driverError ? INVALID_CLASS : ""}`,
									driverError ? `${id}-driver-error` : undefined,
								)}
							/>
						</label>
						{driverError && (
							<FieldError id={`${id}-driver-error`} message={driverError} />
						)}

						<label className="block space-y-1.5" htmlFor={`${id}-notes`}>
							<span className="q-sm font-semibold text-[var(--ink)]">
								{t.form.notesLabel}{" "}
								<span className="font-normal text-[var(--ink-muted)]">
									{t.form.optional}
								</span>
								{prefill.isSuggested("notes") && (
									<>
										{" "}
										<SuggestedTag fieldId={`${id}-notes`} />
									</>
								)}
							</span>
							<textarea
								id={`${id}-notes`}
								rows={3}
								maxLength={280}
								placeholder={t.form.notesPlaceholder}
								value={notes}
								onChange={(event) => {
									setNotes(event.target.value);
									prefill.accept("notes");
								}}
								{...suggested("notes", INPUT_CLASS)}
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
							{t.form.privacy}
						</p>

						<button
							type="submit"
							className="q-btn q-btn--primary q-btn--block"
							disabled={status.kind === "sending"}
							aria-busy={status.kind === "sending"}
						>
							<Send size={18} strokeWidth={1.75} aria-hidden="true" />
							{status.kind === "sending" ? t.form.sending : t.form.submit}
						</button>
					</form>
				</section>
			)}
		</div>
	);
}
