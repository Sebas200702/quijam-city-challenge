import {
	Check,
	Footprints,
	Route,
	Sparkles,
	TrendingDown,
	X,
} from "lucide-react";
import type {
	DiversionProposal,
	SectionLoadState,
} from "./city-sections-types";
import { SectionState } from "./section-state";

const CHOSEN_BY_LABELS: Record<DiversionProposal["chosenBy"], string> = {
	openjev: "OpenJev",
	weighted: "puntaje ponderado",
	none: "sin opción segura",
};

function confidenceTone(confidence: number): "green" | "gold" | "red" {
	if (confidence >= 0.7) return "green";
	if (confidence >= 0.4) return "gold";
	return "red";
}

interface DiversionProposalCardProps {
	proposal: DiversionProposal | null;
	loadState: SectionLoadState;
	/** True while the apply or discard request is in flight. */
	busy?: boolean;
	onApply: (proposalId: string) => void;
	onDiscard: (proposalId: string) => void;
	onRetry?: () => void;
}

/**
 * Decider proposal to divert visitors: the why in one sentence, the impact,
 * rules and confidence in "Ver detalles", and "Aplicar desvío" as the one primary.
 */
export function DiversionProposalCard({
	proposal,
	loadState,
	busy = false,
	onApply,
	onDiscard,
	onRetry,
}: DiversionProposalCardProps) {
	if (loadState === "loading") {
		return (
			<div className="q-panel">
				<div
					className="q-state q-state--loading"
					role="status"
					aria-busy="true"
				>
					<span className="q-state__glyph" aria-hidden="true">
						<span className="q-star q-star--think" />
					</span>
					<p className="q-state__title">El Decisor revisa las reglas</p>
					<p className="q-state__text">
						Capacidad, cupo, horario, pausa del comité y arroyos.
					</p>
					<p className="q-thinking">
						Pensando
						<span className="q-thinking__dots" aria-hidden="true">
							<i />
							<i />
							<i />
						</span>
					</p>
				</div>
			</div>
		);
	}
	if (loadState === "error") {
		return (
			<div className="q-panel">
				<SectionState
					kind="error"
					icon={Sparkles}
					title="No pudimos cargar la propuesta"
					text="El Decisor no respondió. Inténtalo otra vez; el mapa sigue en vivo."
					onRetry={onRetry}
				/>
			</div>
		);
	}
	if (!proposal) {
		return (
			<div className="q-panel">
				<SectionState
					kind="empty"
					illustration="/illustrations/live-map.svg"
					title="Sin decisiones pendientes"
					text="Cuando una zona se sature, el Decisor te propone un desvío aquí."
				/>
			</div>
		);
	}

	const offline = loadState === "offline";
	const allRulesPass = proposal.rules.every((rule) => rule.passed);
	const confidencePct = Math.round(proposal.confidence * 100);
	const tone = confidenceTone(proposal.confidence);

	return (
		<article
			className="q-card lc-shape--bubble"
			aria-labelledby="diversion-proposal-title"
			aria-busy={busy}
		>
			<div className="q-band q-band--gold" aria-hidden="true" />
			<div className="q-card__head">
				<div className="min-w-0">
					<p className="l-eyebrow l-eyebrow--sunk lc-eb">
						<Sparkles size={14} strokeWidth={1.75} aria-hidden="true" />
						Decisión pendiente · Decisor
					</p>
					<h2 id="diversion-proposal-title" className="q-h2 mt-1">
						Desvía visitantes de {proposal.fromLabel} a {proposal.toLabel}
					</h2>
				</div>
			</div>

			<div className="q-card__body">
				<p className="q-p q-muted">{proposal.why}</p>

				<div className="flex flex-wrap gap-x-6 gap-y-3">
					<div>
						<span className="q-impact">
							{proposal.fromPctNow} % → {proposal.fromPctAfter} %
						</span>
						<p className="q-sm q-muted m-0 flex items-center gap-1.5">
							<TrendingDown size={14} strokeWidth={1.75} aria-hidden="true" />
							{proposal.fromLabel} si llega todo el cupo
						</p>
					</div>
					<div>
						<span className="q-impact">
							{new Intl.NumberFormat("es-CO").format(proposal.quota)}
						</span>
						<p className="q-sm q-muted m-0 flex items-center gap-1.5">
							<Footprints size={14} strokeWidth={1.75} aria-hidden="true" />
							cupo hacia {proposal.toLabel}, {proposal.walkMinutes} min a pie
						</p>
					</div>
				</div>

				<details className="q-details">
					<summary>Ver detalles</summary>
					<div className="q-details__body">
						<div className={`q-meter q-meter--${tone} q-meter--sm`}>
							<meter
								className="q-sr"
								min={0}
								max={100}
								value={confidencePct}
								aria-label="Confianza del Decisor"
							>
								{confidencePct} %
							</meter>
							<div className="q-meter__head" aria-hidden="true">
								<span>Confianza</span>
								<b>{confidencePct} %</b>
							</div>
							<div className="q-meter__track" aria-hidden="true">
								<div
									className="q-meter__fill"
									style={{ width: `${confidencePct}%` }}
								/>
							</div>
						</div>
						<p className="q-p">
							<b>
								{allRulesPass
									? "Reglas del barrio, todas cumplidas:"
									: "Reglas del barrio:"}
							</b>
						</p>
						<ul className="m-0 flex list-none flex-col gap-1 p-0">
							{proposal.rules.map((rule) => (
								<li key={rule.id} className="flex items-start gap-2">
									{rule.passed ? (
										<Check
											size={16}
											strokeWidth={1.75}
											className="mt-px flex-none text-[var(--green-text)]"
											aria-label="Cumplida"
										/>
									) : (
										<X
											size={16}
											strokeWidth={1.75}
											className="mt-px flex-none text-[var(--red-text)]"
											aria-label="No cumplida"
										/>
									)}
									<span>{rule.text}</span>
								</li>
							))}
						</ul>
						{proposal.alternatives.length > 0 && (
							<p className="q-p">
								<b>Opciones revisadas:</b> {proposal.alternatives.join(" ")}
							</p>
						)}
						<p className="q-p">
							Eligió: {CHOSEN_BY_LABELS[proposal.chosenBy]}.
						</p>
						<p className="q-p">
							Es una invitación: el visitante ve una sugerencia, nunca una
							orden.
						</p>
					</div>
				</details>

				{offline && (
					<p className="q-sm q-muted m-0">
						Necesitas conexión para aplicar el desvío.
					</p>
				)}
				{!allRulesPass && (
					<p className="q-sm m-0 text-[var(--red-text)]">
						No puedes aplicarlo: una regla del barrio no se cumple.
					</p>
				)}
			</div>

			<div className="q-card__foot">
				<button
					type="button"
					className="q-btn q-btn--primary"
					disabled={busy || offline || !allRulesPass}
					onClick={() => onApply(proposal.id)}
				>
					<Route size={18} strokeWidth={1.75} aria-hidden="true" />
					Aplicar desvío
				</button>
				<button
					type="button"
					className="q-btn q-btn--ghost"
					disabled={busy || offline}
					onClick={() => onDiscard(proposal.id)}
				>
					<X size={18} strokeWidth={1.75} aria-hidden="true" />
					Descartar
				</button>
			</div>
		</article>
	);
}
