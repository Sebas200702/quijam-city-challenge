import { MessageCircle, X } from "lucide-react";
import type { SelectionDetail } from "../../lib/corridor/corridor-selection";
import type {
	CorridorDataSource,
	StatusTone,
} from "../../lib/corridor/corridor-types";
import { ServiceTag } from "./service-icon";

const BADGE_CLASS: Record<StatusTone, string> = {
	green: "q-badge--optimal",
	gold: "q-badge--high",
	red: "q-badge--alert",
	neutral: "q-badge--neutral",
};

const BAND_CLASS: Record<StatusTone, string> = {
	green: "q-band--green",
	gold: "q-band--gold",
	red: "q-band--red",
	neutral: "q-band--gold",
};

interface DetailCardProps {
	detail: SelectionDetail | null;
	source: CorridorDataSource;
	onClose: () => void;
	onOpenGuide: () => void;
}

/**
 * QUILLART card (q-card) for the selected point. With nothing selected it shows
 * the brand empty state: tricolor flag, unDraw illustration and a hint.
 */
export function DetailCard({
	detail,
	source,
	onClose,
	onOpenGuide,
}: DetailCardProps) {
	if (!detail) {
		return (
			<section className="q-card corridor-detail corridor-detail--empty">
				<div className="q-flag" aria-hidden="true">
					<i />
					<i />
					<i />
				</div>
				<div className="q-card__body">
					<div className="q-illus">
						<img
							src="/illustrations/undraw-location-search.svg"
							alt=""
							width="240"
							height="186"
						/>
					</div>
					<div className="corridor-detail__intro">
						<h2 className="q-h2">Toca un punto del mapa</h2>
						<p className="q-sm q-muted">
							Verás sus servicios, alertas y cómo moverte sin trancón.
						</p>
						<p className="q-sm q-subtle">
							Datos simulados 2034
							{source === "seed" ? " · sin conexión a Supabase" : ""}
						</p>
					</div>
				</div>
				<div className="q-card__foot">
					<button
						type="button"
						className="q-btn q-btn--primary q-btn--block"
						onClick={onOpenGuide}
					>
						<MessageCircle size={20} strokeWidth={1.75} aria-hidden="true" />
						Pregúntale al Guía · Ask the Guide
					</button>
				</div>
			</section>
		);
	}

	return (
		<section
			className="q-card q-card--raised q-card--frame corridor-detail"
			aria-live="polite"
			aria-labelledby="corridor-detail-title"
		>
			<div className={`q-band ${BAND_CLASS[detail.status.tone]}`} />
			<div className="q-card__head">
				<div>
					<p className="q-eyebrow">{detail.eyebrow}</p>
					<h2 id="corridor-detail-title" className="q-h2">
						{detail.title}
					</h2>
				</div>
				<button
					type="button"
					className="q-btn q-btn--ghost q-btn--icon"
					aria-label="Cerrar detalle"
					onClick={onClose}
				>
					<X size={20} strokeWidth={1.75} aria-hidden="true" />
				</button>
			</div>
			<div className="q-card__body">
				<div className="q-row">
					<span className={`q-badge ${BADGE_CLASS[detail.status.tone]}`}>
						{detail.status.label}
					</span>
					{detail.simulated && (
						<span className="q-badge q-badge--neutral">Simulado</span>
					)}
				</div>
				{detail.description && (
					<p className="q-p q-muted">{detail.description}</p>
				)}
				{detail.facts.length > 0 && (
					<dl className="q-dl">
						{detail.facts.map((fact) => (
							<div key={fact.label}>
								<dt>{fact.label}</dt>
								<dd>{fact.value}</dd>
							</div>
						))}
					</dl>
				)}
				{detail.services.length > 0 && (
					<ul className="corridor-detail__tags" aria-label="Servicios">
						{detail.services.map((service) => (
							<ServiceTag key={service} service={service} />
						))}
					</ul>
				)}
			</div>
		</section>
	);
}
