import { CircleAlert, Send, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { formatFare, type GuideLanguage } from "../../lib/guide/guide-local";
import { useLanguage } from "../../lib/i18n/use-language";
import {
	isValidDriverCode,
	parseFareAmount,
} from "../../lib/reports/fare-amount";
import {
	REPORT_TRANSPORT_MODES,
	type ReportTransportMode,
} from "../../lib/reports/overcharge-report";
import {
	evaluateOvercharge,
	queuePendingReport,
} from "../../lib/reports/overcharge-routes";
import { sendPendingReports } from "../../lib/reports/pending-report-sync";
import {
	DESTINATIONS,
	type TripPlan,
	VISITOR_ORIGIN,
} from "../../lib/trip/trip-planner";
import { ReportIllustration } from "../reports/report-illustration";
import { guideText } from "./guide-text";

type Status =
	| { kind: "idle" }
	| { kind: "sending" }
	| { kind: "saved"; percent: number | null }
	| { kind: "offline" }
	| { kind: "error" };

interface ReportFormProps {
	plan: TripPlan;
	language: GuideLanguage;
	onClose: () => void;
	onReportSaved?: (reportId: string) => void;
}

export function ReportForm({
	plan,
	language,
	onClose,
	onReportSaved,
}: ReportFormProps) {
	const text = guideText(useLanguage()).report;
	const id = useId();
	const [mode, setMode] = useState<ReportTransportMode>("taxi");
	const [charged, setCharged] = useState("");
	const [driverCode, setDriverCode] = useState("");
	const [notes, setNotes] = useState("");
	const [status, setStatus] = useState<Status>({ kind: "idle" });
	const [showErrors, setShowErrors] = useState(false);
	const amountRef = useRef<HTMLInputElement>(null);
	const driverRef = useRef<HTMLInputElement>(null);

	// Reports kept on the phone earlier go out as soon as the form opens online.
	const onSavedRef = useRef(onReportSaved);
	onSavedRef.current = onReportSaved;
	useEffect(() => {
		if (navigator.onLine) {
			void sendPendingReports({
				onSaved: (reportId) => onSavedRef.current?.(reportId),
			});
		}
	}, []);

	// The report points at the leg the visitor took: the taxi leg for taxis,
	// the green leg otherwise.
	const segment =
		mode === "taxi" ? (plan.taxi ?? plan.green) : (plan.green ?? plan.taxi);
	const routeLabel = `${VISITOR_ORIGIN.name} → ${DESTINATIONS[plan.destination].name}`;
	const amount = parseFareAmount(charged);
	const comparison =
		segment && amount.ok
			? evaluateOvercharge(amount.value, segment.reference_fare_cop)
			: null;
	const amountError =
		showErrors && !amount.ok
			? {
					empty: text.amountEmpty,
					format: text.amountFormat,
					range: text.amountRange,
				}[amount.reason]
			: null;
	const driverError =
		showErrors && !isValidDriverCode(driverCode)
			? text.driverCodeInvalid
			: null;

	const submit = async (event: { preventDefault: () => void }) => {
		event.preventDefault();
		if (!segment || status.kind === "sending") return;
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
		const report = {
			segmentCode: segment.code,
			transportMode: mode,
			chargedFareCop: amount.value,
			driverQrCode: driverCode.trim(),
			notes: notes.trim(),
		};
		const keepOnPhone = () =>
			queuePendingReport({ ...report, queuedAt: new Date().toISOString() });
		setStatus({ kind: "sending" });
		try {
			const response = await fetch("/api/reports", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(report),
			});
			if (response.ok) {
				const body = (await response.json()) as {
					reportId?: string;
					overchargePercent: number | null;
				};
				if (body.reportId) {
					onReportSaved?.(body.reportId);
				}
				setStatus({ kind: "saved", percent: body.overchargePercent });
			} else if (response.status >= 500) {
				keepOnPhone();
				setStatus({ kind: "offline" });
			} else {
				setStatus({ kind: "error" });
			}
		} catch {
			keepOnPhone();
			setStatus({ kind: "offline" });
		}
	};

	if (status.kind === "saved" || status.kind === "offline") {
		return (
			<div
				className={`guide-report guide-report--${status.kind}`}
				role="status"
			>
				<ReportIllustration
					kind={status.kind === "saved" ? "sent" : "saved"}
					className="w-16 shrink-0"
				/>
				<p className="q-p">
					{status.kind === "saved"
						? text.saved(status.percent)
						: text.savedOffline}
				</p>
				<button
					type="button"
					className="q-btn q-btn--ghost q-btn--sm guide-report__close"
					onClick={onClose}
				>
					<X size={16} strokeWidth={1.75} aria-hidden="true" />
					{text.close}
				</button>
			</div>
		);
	}

	return (
		<form
			className="guide-report"
			onSubmit={submit}
			noValidate
			aria-labelledby={`${id}-title`}
		>
			<h3 id={`${id}-title`} className="q-h3">
				{text.title}
			</h3>

			{segment && (
				<div className="rounded-[var(--radius-md)] bg-[var(--bg)] p-3 text-sm">
					<p className="q-sm q-muted">
						{text.route}:{" "}
						<strong className="text-[var(--ink)]">{routeLabel}</strong>
					</p>
					<p className="q-sm q-muted mt-1">
						{text.referenceFare}:{" "}
						<strong className="q-num text-[var(--green-text)]">
							{formatFare(segment.reference_fare_cop, language)}
						</strong>
						{segment.fare_min_cop !== segment.fare_max_cop && (
							<span>
								{" "}
								({formatFare(segment.fare_min_cop, language)} –{" "}
								{formatFare(segment.fare_max_cop, language)})
							</span>
						)}
					</p>
				</div>
			)}

			<fieldset className="guide-report__field">
				<legend className="q-sm q-muted">{text.vehicle}</legend>
				<div className="q-seg">
					{REPORT_TRANSPORT_MODES.map((option) => (
						<button
							key={option}
							type="button"
							className={`q-seg__opt${mode === option ? " is-on" : ""}`}
							aria-pressed={mode === option}
							onClick={() => setMode(option)}
						>
							{text.vehicles[option]}
						</button>
					))}
				</div>
			</fieldset>

			<label className="guide-report__field" htmlFor={`${id}-charged`}>
				<span className="q-sm q-muted">{text.charged}</span>
				<input
					ref={amountRef}
					id={`${id}-charged`}
					className="guide-input"
					type="text"
					inputMode="numeric"
					autoComplete="off"
					placeholder="35000"
					required
					aria-invalid={amountError !== null}
					aria-describedby={amountError ? `${id}-charged-error` : undefined}
					value={charged}
					onChange={(event) => setCharged(event.target.value)}
				/>
			</label>
			{amountError && (
				<p className="q-sm guide-report__error" id={`${id}-charged-error`}>
					<CircleAlert size={14} strokeWidth={1.75} aria-hidden="true" />
					{amountError}
				</p>
			)}

			{comparison && (
				<p
					className={`q-sm ${
						comparison.isOvercharge
							? "text-[var(--red-text)]"
							: "text-[var(--green-text)]"
					}`}
					aria-live="polite"
				>
					{comparison.isOvercharge
						? text.overchargeEstimate(
								comparison.percent,
								formatFare(comparison.deltaCop, language),
							)
						: text.withinReference}
				</p>
			)}

			<label className="guide-report__field" htmlFor={`${id}-driver`}>
				<span className="q-sm q-muted">
					{text.driverCode} ({text.optional})
				</span>
				<input
					ref={driverRef}
					id={`${id}-driver`}
					className="guide-input"
					type="text"
					maxLength={40}
					autoComplete="off"
					aria-invalid={driverError !== null}
					aria-describedby={driverError ? `${id}-driver-error` : undefined}
					value={driverCode}
					onChange={(event) => setDriverCode(event.target.value)}
				/>
			</label>
			{driverError && (
				<p className="q-sm guide-report__error" id={`${id}-driver-error`}>
					<CircleAlert size={14} strokeWidth={1.75} aria-hidden="true" />
					{driverError}
				</p>
			)}

			<label className="guide-report__field" htmlFor={`${id}-notes`}>
				<span className="q-sm q-muted">
					{text.notes} ({text.optional})
				</span>
				<textarea
					id={`${id}-notes`}
					className="guide-input"
					rows={2}
					maxLength={280}
					value={notes}
					onChange={(event) => setNotes(event.target.value)}
				/>
			</label>

			{status.kind === "error" && (
				<p className="q-sm guide-report__error" role="alert">
					{text.failed}
				</p>
			)}
			<p className="q-sm q-subtle">{text.privacy}</p>

			<div className="q-row">
				<button
					type="submit"
					className="q-btn q-btn--primary q-btn--sm"
					disabled={!segment || status.kind === "sending"}
					aria-busy={status.kind === "sending"}
				>
					<Send size={16} strokeWidth={1.75} aria-hidden="true" />
					{status.kind === "sending" ? text.sending : text.send}
				</button>
				<button
					type="button"
					className="q-btn q-btn--ghost q-btn--sm"
					onClick={onClose}
				>
					{text.cancel}
				</button>
			</div>
		</form>
	);
}
