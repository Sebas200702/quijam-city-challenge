import { Check } from "lucide-react";

export interface StepTrackItem {
	label: string;
	done: boolean;
}

interface StepTrackProps {
	steps: readonly StepTrackItem[];
	/** Index of the current step, or -1 when every step is done or none started. */
	current: number;
	label: string;
}

/** Ordered steps of a flow (report triage, host dispatch). Done steps say so with an icon, not only colour. */
export function StepTrack({ steps, current, label }: StepTrackProps) {
	return (
		<ol aria-label={label} className="m-0 flex list-none flex-wrap gap-2 p-0">
			{steps.map((step, index) => {
				const isCurrent = index === current;
				const tone = isCurrent
					? "bg-[var(--gold-soft)] text-[var(--gold-text)]"
					: step.done
						? "bg-[var(--green-soft)] text-[var(--green-text)]"
						: "bg-[var(--line)] text-[var(--ink-muted)]";
				return (
					<li
						key={step.label}
						aria-current={isCurrent ? "step" : undefined}
						className={`inline-flex min-h-8 items-center gap-1.5 rounded-[var(--radius-pill)] px-3 text-[12px] font-semibold ${tone}`}
					>
						{step.done && !isCurrent && (
							<Check size={14} strokeWidth={1.75} aria-hidden="true" />
						)}
						{isCurrent && (
							<span
								className="size-1.5 rounded-full bg-current"
								aria-hidden="true"
							/>
						)}
						{step.label}
						{step.done && !isCurrent && <span className="q-sr">, hecho</span>}
					</li>
				);
			})}
		</ol>
	);
}
