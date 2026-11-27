import { Accessibility, Flag, Leaf, MessageCircle } from "lucide-react";
import type { ReactNode } from "react";
import type { CorridorStop } from "../../lib/corridor/corridor-types";
import type { PlanResponse } from "../../lib/routing/plan-route";
import type { RouteQuery } from "./use-route-plan";

const copFormatter = new Intl.NumberFormat("es-CO", {
	maximumFractionDigits: 0,
});
const fare = (cop: number) =>
	cop === 0 ? "Gratis" : `$${copFormatter.format(cop)}`;

const REASON_LABEL = {
	"active-flood": "cruza un arroyo activo",
	"not-accessible": "no es accesible",
} as const;

interface RouteCardProps {
	stops: CorridorStop[];
	query: RouteQuery;
	onQueryChange: (query: RouteQuery) => void;
	plan: PlanResponse | null;
	loading: boolean;
	error: string | null;
	/** The one interrupting alert (flood), shown on top of the card. */
	alert?: ReactNode;
	/** Opens the Guide. On wide screens the panel has its own button, so this one hides there. */
	onOpenGuide: () => void;
}

/** "Tu siguiente paso": one card, one decision. Details stay folded. */
export function RouteCard({
	stops,
	query,
	onQueryChange,
	plan,
	loading,
	error,
	alert,
	onOpenGuide,
}: RouteCardProps) {
	const route = plan?.route ?? null;
	const paidLeg = route?.legs.find((leg) => leg.fareCop > 0) ?? null;
	const reportHref = paidLeg
		? `/reportar?segment=${encodeURIComponent(paidLeg.code)}`
		: "/reportar";
	return (
		<section className="q-card corridor-detail route-card" aria-live="polite">
			{alert}
			<div className="q-card__head">
				<div>
					<p className="q-eyebrow">Tu siguiente paso</p>
					<h2 className="q-h">
						{route
							? route.label
							: loading
								? "Buscando tu ruta…"
								: "Elige tu destino"}
					</h2>
				</div>
				<span className="q-badge q-badge--neutral">Datos de referencia</span>
			</div>

			<div className="q-card__body route-card__body">
				<div className="route-card__fields">
					<label>
						<span className="q-sm q-muted">Estás en</span>
						<select
							value={query.origin}
							onChange={(event) =>
								onQueryChange({ ...query, origin: event.target.value })
							}
						>
							{stops.map((stop) => (
								<option key={stop.code} value={stop.code}>
									{stop.name}
								</option>
							))}
						</select>
					</label>
					<label>
						<span className="q-sm q-muted">Vas a</span>
						<select
							value={query.destination}
							onChange={(event) =>
								onQueryChange({ ...query, destination: event.target.value })
							}
						>
							{stops.map((stop) => (
								<option key={stop.code} value={stop.code}>
									{stop.name}
								</option>
							))}
						</select>
					</label>
				</div>

				<label className="route-card__toggle">
					<input
						type="checkbox"
						checked={query.accessibleMode}
						onChange={(event) =>
							onQueryChange({ ...query, accessibleMode: event.target.checked })
						}
					/>
					<Accessibility size={18} aria-hidden="true" />
					<span>Necesito una ruta accesible</span>
				</label>

				{error ? (
					<p className="q-p">
						No pudimos calcular la ruta. Revisa tu conexión e intenta de nuevo.
					</p>
				) : plan ? (
					<>
						<p className="q-p route-card__why">{plan.explanation}</p>
						{route ? (
							<div className="route-card__facts">
								<span className="q-chip">{route.durationMinutes} min</span>
								<span className="q-chip">
									Tarifa justa {fare(route.fareCop)}
								</span>
								{route.accessible ? (
									<span className="q-chip">Accesible</span>
								) : null}
								{route.isGreen ? (
									<span className="q-chip">
										<Leaf size={14} aria-hidden="true" /> Ruta verde
									</span>
								) : null}
							</div>
						) : null}
						<details className="route-card__details">
							<summary>Ver detalles</summary>
							<p className="q-sm">
								{plan.chosenBy === "openjev"
									? `Eligió el modelo de decisión OpenJev con ${Math.round(plan.confidence * 100)} % de confianza.`
									: plan.chosenBy === "weighted"
										? "Eligió el puntaje por tiempo, tarifa y congestión."
										: "Ninguna ruta pasó las reglas de seguridad."}
							</p>
							{plan.discarded.length > 0 ? (
								<ul className="q-sm">
									{plan.discarded.map((item) => (
										<li key={item.id}>
											Descartada: {item.label} ({REASON_LABEL[item.reason]})
										</li>
									))}
								</ul>
							) : null}
							{plan.alternatives.length > 0 ? (
								<ul className="q-sm">
									{plan.alternatives.map((item) => (
										<li key={item.id}>
											Otra opción: {item.label}, {item.durationMinutes} min,{" "}
											{fare(item.fareCop)}
										</li>
									))}
								</ul>
							) : null}
						</details>
						{route ? (
							<a
								href={reportHref}
								className="q-btn q-btn--ghost q-btn--sm min-h-11 justify-start px-3"
							>
								<Flag size={16} strokeWidth={1.75} aria-hidden="true" />
								¿Te cobraron de más? Reportar cobro abusivo
							</a>
						) : null}
					</>
				) : null}
			</div>
			<div className="q-card__foot route-card__guide">
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
