import {
	Hand,
	Pause,
	Play,
	Route,
	Store,
	TrendingDown,
	Undo2,
} from "lucide-react";
import { getDensityVisualState } from "../../../lib/city-dashboard-utils";
import type { ActiveDiversion, SectionLoadState } from "./city-sections-types";
import { SectionRow } from "./section-row";
import { SectionState } from "./section-state";

interface ActiveDiversionCardProps {
	diversion: ActiveDiversion | null;
	loadState: SectionLoadState;
	busy?: boolean;
	/** Show the one "you applied it" confirmation right after applying. */
	justApplied?: boolean;
	onDismissApplied?: () => void;
	onRevert: (diversionId: string) => void;
	onTogglePause: (diversionId: string, paused: boolean) => void;
	onRetry?: () => void;
}

/**
 * Follow-up of an applied diversion: arrivals against the quota, the origin
 * going down, and the committee pause. No new primary action; revert is secondary.
 */
export function ActiveDiversionCard({
	diversion,
	loadState,
	busy = false,
	justApplied = false,
	onDismissApplied,
	onRevert,
	onTogglePause,
	onRetry,
}: ActiveDiversionCardProps) {
	if (loadState === "loading") {
		return (
			<div className="q-panel">
				<SectionState
					kind="loading"
					title="Cargando el desvío"
					text="Flujo del desvío y zonas."
				/>
			</div>
		);
	}
	if (loadState === "error") {
		return (
			<div className="q-panel">
				<SectionState
					kind="error"
					icon={Route}
					title="No pudimos leer el desvío"
					text="El desvío sigue como lo dejaste. Inténtalo otra vez para ver las cifras."
					onRetry={onRetry}
				/>
			</div>
		);
	}
	if (!diversion) {
		return (
			<div className="q-panel">
				<SectionState
					kind="empty"
					illustration="/illustrations/undraw-location-search.svg"
					title="No hay desvíos activos"
					text="Cuando apliques un desvío, aquí ves cuántos visitantes llegan."
				/>
			</div>
		);
	}

	const offline = loadState === "offline";
	const disabled = busy || offline;
	const fmt = new Intl.NumberFormat("es-CO");
	const arrivedPct =
		diversion.quota > 0
			? Math.min(100, Math.round((diversion.arrived / diversion.quota) * 100))
			: 0;
	const before = getDensityVisualState(diversion.fromPctBefore);
	const now = getDensityVisualState(diversion.fromPctNow);
	const paused = diversion.committeePaused;

	return (
		<div className="flex flex-col gap-4">
			{justApplied && !offline && (
				<div className="q-alert q-alert--safe" role="status" aria-live="polite">
					<span className="q-alert__icon" aria-hidden="true">
						✓
					</span>
					<div className="q-alert__body">
						<p className="q-alert__title">Aplicaste el desvío</p>
						<p className="q-alert__text">Puedes revertirlo cuando quieras.</p>
					</div>
					{onDismissApplied && (
						<button
							type="button"
							className="q-alert__close"
							aria-label="Cerrar aviso"
							onClick={onDismissApplied}
						>
							✕
						</button>
					)}
				</div>
			)}

			<article
				className="q-card lc-shape--leaf"
				aria-labelledby="active-diversion-title"
				aria-busy={busy}
			>
				<div
					className={`q-band ${paused ? "q-band--gold" : "q-band--green"}`}
					aria-hidden="true"
				/>
				<div className="q-card__head">
					<div className="min-w-0">
						<p className="l-eyebrow l-eyebrow--sunk lc-eb">
							<Route size={14} strokeWidth={1.75} aria-hidden="true" />
							{paused ? "Desvío en pausa" : "Desvío activo"} · desde{" "}
							{diversion.since}
						</p>
						<h2 id="active-diversion-title" className="q-h2 mt-1">
							{paused
								? `${diversion.toLabel} pausó el desvío`
								: `${diversion.toLabel} recibe visitantes de ${diversion.fromLabel}`}
						</h2>
					</div>
				</div>

				<div className="q-card__body">
					<div className="q-meter q-meter--green">
						<meter
							className="q-sr"
							min={0}
							max={diversion.quota}
							value={diversion.arrived}
							aria-label={`Visitantes que llegaron a ${diversion.toLabel}`}
						>
							{fmt.format(diversion.arrived)} de {fmt.format(diversion.quota)}{" "}
							del cupo
						</meter>
						<div className="q-meter__head" aria-hidden="true">
							<span>Llegaron a {diversion.toLabel}</span>
							<b>
								{fmt.format(diversion.arrived)} de {fmt.format(diversion.quota)}
							</b>
						</div>
						<div className="q-meter__track" aria-hidden="true">
							<div
								className="q-meter__fill"
								style={{ width: `${arrivedPct}%` }}
							/>
						</div>
					</div>

					<dl className="q-dl">
						<div>
							<dt>
								<TrendingDown size={14} strokeWidth={1.75} aria-hidden="true" />
								{diversion.fromLabel}
							</dt>
							<dd>
								{diversion.fromPctBefore} % → {diversion.fromPctNow} %
							</dd>
							<dd className="mt-0 text-[12px] font-medium text-[var(--ink-muted)]">
								{before.label} → {now.label}
							</dd>
						</div>
						{diversion.businessVisits !== undefined && (
							<div>
								<dt>
									<Store size={14} strokeWidth={1.75} aria-hidden="true" />
									Visitas a negocios
								</dt>
								<dd>+{fmt.format(diversion.businessVisits)}</dd>
							</div>
						)}
					</dl>

					<SectionRow
						icon={Hand}
						tone={paused ? "event" : "neutral"}
						title="Pausa del comité"
						detail={
							paused
								? `${diversion.toLabel} no aparece como destino mientras siga en pausa.`
								: `El comité de ${diversion.toLabel} puede pausar el desvío en cualquier momento.`
						}
						trailing={
							<span
								className={`q-badge ${paused ? "q-badge--high" : "q-badge--neutral"}`}
							>
								{paused ? "En pausa" : "Sin pausa"}
							</span>
						}
					/>

					{offline && (
						<p className="q-sm q-muted m-0">
							Necesitas conexión para revertir o pausar.
						</p>
					)}
				</div>

				<div className="q-card__foot">
					<button
						type="button"
						className="q-btn q-btn--secondary"
						disabled={disabled}
						onClick={() => onRevert(diversion.id)}
					>
						<Undo2 size={18} strokeWidth={1.75} aria-hidden="true" />
						Revertir desvío
					</button>
					<button
						type="button"
						className="q-btn q-btn--ghost"
						disabled={disabled}
						onClick={() => onTogglePause(diversion.id, !paused)}
					>
						{paused ? (
							<Play size={18} strokeWidth={1.75} aria-hidden="true" />
						) : (
							<Pause size={18} strokeWidth={1.75} aria-hidden="true" />
						)}
						{paused ? "Quitar pausa" : "Pausa del comité"}
					</button>
				</div>
			</article>
		</div>
	);
}
