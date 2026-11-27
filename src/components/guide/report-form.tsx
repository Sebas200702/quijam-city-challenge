import { CircleCheck, CloudOff, Send, X } from "lucide-react";
import { useId, useState } from "react";
import type { GuideLanguage } from "../../lib/guide/guide-local";
import { useLanguage } from "../../lib/i18n/use-language";
import {
	REPORT_TRANSPORT_MODES,
	type ReportTransportMode,
} from "../../lib/reports/overcharge-report";
import type { TripPlan } from "../../lib/trip/trip-planner";
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

export function ReportForm({ plan, onClose }: ReportFormProps) {
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
					overchargePercent: number | null;
				};
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
