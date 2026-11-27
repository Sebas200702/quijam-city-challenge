import { CircleCheck, CloudOff, Send, X } from "lucide-react";
import { useId, useState } from "react";
import { formatFare, type GuideLanguage } from "../../lib/guide/guide-local";
import { useLanguage } from "../../lib/i18n/use-language";
import {
	REPORT_TRANSPORT_MODES,
	type ReportTransportMode,
} from "../../lib/reports/overcharge-report";
import { evaluateOvercharge } from "../../lib/reports/overcharge-routes";
import {
	DESTINATIONS,
	type TripPlan,
	VISITOR_ORIGIN,
} from "../../lib/trip/trip-planner";
import { guideText } from "./guide-text";

const PENDING_KEY = "quillart-pending-reports";

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

/** Keeps a report on the phone when the server cannot save it. */
function keepOnPhone(report: unknown) {
	try {
		const pending = JSON.parse(localStorage.getItem(PENDING_KEY) ?? "[]");
		localStorage.setItem(PENDING_KEY, JSON.stringify([...pending, report]));
	} catch {
		// Storage blocked: nothing else to do; the visitor still sees the message.
	}
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

	// The report points at the leg the visitor took: the taxi leg for taxis,
	// the green leg otherwise.
	const segment =
		mode === "taxi" ? (plan.taxi ?? plan.green) : (plan.green ?? plan.taxi);
	const routeLabel = `${VISITOR_ORIGIN.name} → ${DESTINATIONS[plan.destination].name}`;
	const comparison =
		segment && charged.trim() !== ""
			? evaluateOvercharge(Number(charged), segment.reference_fare_cop)
			: null;

	const submit = async (event: { preventDefault: () => void }) => {
		event.preventDefault();
		if (!segment) return;
		const report = {
			segmentCode: segment.code,
			transportMode: mode,
			chargedFareCop: Number(charged),
			driverQrCode: driverCode,
			notes,
		};
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
				keepOnPhone(report);
				setStatus({ kind: "offline" });
			} else {
				setStatus({ kind: "error" });
			}
		} catch {
			keepOnPhone(report);
			setStatus({ kind: "offline" });
		}
	};

	if (status.kind === "saved" || status.kind === "offline") {
		return (
			<div
				className={`guide-report guide-report--${status.kind}`}
				role="status"
			>
				{status.kind === "saved" ? (
					<CircleCheck size={22} strokeWidth={1.75} aria-hidden="true" />
				) : (
					<CloudOff size={22} strokeWidth={1.75} aria-hidden="true" />
				)}
				<p className="q-p">
					{status.kind === "saved"
						? text.saved(status.percent)
						: text.savedOffline}
				</p>
				<button
					type="button"
					className="q-btn q-btn--ghost q-btn--sm"
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
					id={`${id}-charged`}
					className="guide-input"
					type="number"
					inputMode="numeric"
					min={1}
					max={2_000_000}
					step={1}
					required
					value={charged}
					onChange={(event) => setCharged(event.target.value)}
				/>
			</label>

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
					id={`${id}-driver`}
					className="guide-input"
					type="text"
					maxLength={40}
					pattern="[A-Za-z0-9\-]+"
					value={driverCode}
					onChange={(event) => setDriverCode(event.target.value)}
				/>
			</label>

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
