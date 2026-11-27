// "Reportar": lets anyone with an account flag someone else's content. Three
// distinct reports hold it for a moderator (see trust-policy.ts).

import { Flag } from "lucide-react";
import { useId, useState } from "react";
import type { ReportReason } from "../../lib/community/community-types";
import type { ContentKind } from "../../lib/moderation/moderation-types";
import { signInHref, useSession, useStore } from "./use-community";

const REASONS: { value: ReportReason; label: string }[] = [
	{
		value: "misinformation",
		label: "Información falsa o alarma sin confirmar",
	},
	{ value: "scam", label: "Estafa o cobro sospechoso" },
	{ value: "impersonation", label: "Se hace pasar por otra persona o entidad" },
	{ value: "offensive", label: "Ofensivo o acoso" },
	{ value: "spam", label: "Publicidad o spam" },
	{ value: "other", label: "Otro motivo" },
];

interface ReportButtonProps {
	kind: ContentKind;
	id: string;
	/** Hide it on the person's own content. */
	ownerId: string | null;
	/** Compact link style for replies. */
	compact?: boolean;
}

export function ReportButton({
	kind,
	id,
	ownerId,
	compact,
}: ReportButtonProps) {
	const store = useStore();
	const { profile } = useSession();
	const formId = useId();
	const [open, setOpen] = useState(false);
	const [reason, setReason] = useState<ReportReason>("misinformation");
	const [state, setState] = useState<
		"idle" | "sending" | "sent" | { error: string }
	>("idle");

	if (profile && ownerId === profile.id) return null;

	const trigger = (
		<button
			type="button"
			className={
				compact
					? "inline-flex min-h-11 items-center gap-1 bg-transparent px-1 text-[13px] font-semibold text-[var(--ink-muted)] hover:text-[var(--red-text)]"
					: "q-btn q-btn--ghost q-btn--sm min-h-11!"
			}
			aria-expanded={open}
			aria-controls={formId}
			onClick={() => setOpen((value) => !value)}
		>
			<Flag size={compact ? 14 : 16} aria-hidden="true" />
			Reportar
		</button>
	);

	if (state === "sent") {
		return (
			<p role="status" className="q-sm q-muted">
				Gracias. Lo revisaremos; si varias personas lo reportan, se oculta
				mientras tanto.
			</p>
		);
	}

	return (
		<div className="flex flex-col items-start gap-2">
			{trigger}
			{open && (
				<div
					id={formId}
					className="q-card w-full max-w-md gap-3 border border-[var(--line)] p-4"
				>
					{!profile ? (
						<p className="q-sm">
							<a href={signInHref()} className="font-semibold">
								Entra con tu cuenta
							</a>{" "}
							para reportar.
						</p>
					) : (
						<form
							className="flex flex-col gap-3"
							onSubmit={async (submitEvent) => {
								submitEvent.preventDefault();
								setState("sending");
								try {
									await store.reportContent(kind, id, reason);
									setState("sent");
								} catch (error) {
									setState({
										error:
											error instanceof Error
												? error.message
												: "No pudimos enviar el reporte.",
									});
								}
							}}
						>
							<fieldset className="flex flex-col gap-1">
								<legend className="q-eyebrow mb-1">¿Qué pasa?</legend>
								{REASONS.map((item) => (
									<label
										key={item.value}
										className="flex min-h-11 items-center gap-3 text-[15px]"
									>
										<input
											type="radio"
											name={`${formId}-reason`}
											value={item.value}
											checked={reason === item.value}
											onChange={() => setReason(item.value)}
											className="h-5 w-5"
										/>
										{item.label}
									</label>
								))}
							</fieldset>
							{typeof state === "object" && (
								<p role="alert" className="q-sm text-[var(--red-text)]">
									{state.error}
								</p>
							)}
							<div className="flex flex-wrap gap-2">
								<button
									type="submit"
									className="q-btn q-btn--primary q-btn--sm min-h-11!"
									disabled={state === "sending"}
								>
									Enviar reporte
								</button>
								<button
									type="button"
									className="q-btn q-btn--secondary q-btn--sm min-h-11!"
									onClick={() => setOpen(false)}
								>
									Cancelar
								</button>
							</div>
							<p className="q-sm q-muted">
								¿Alguien está en peligro? Llama a la Línea 123.
							</p>
						</form>
					)}
				</div>
			)}
		</div>
	);
}
