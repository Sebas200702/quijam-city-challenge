import { Sparkles } from "lucide-react";
import { CalmCorridorIllustration } from "./shell-illustrations";

/** Empty "Decisiones" panel shown until the Decisor proposes something. */
export function DecisionsPlaceholder() {
	return (
		<section className="q-panel cs-panel" aria-labelledby="cs-decisions-title">
			<div className="cs-panel__head">
				<h2 className="q-h3 cs-ih" id="cs-decisions-title">
					<Sparkles size={20} strokeWidth={1.75} aria-hidden="true" />
					Decisiones
				</h2>
				<span className="cs-sub">Decisor</span>
			</div>
			<div
				className="q-state q-state--empty"
				role="status"
				style={{ minHeight: 0, padding: "12px 0" }}
			>
				<CalmCorridorIllustration width={96} height={60} />
				<p className="q-state__title">Sin decisiones pendientes</p>
				<p className="q-state__text">
					Te avisamos aquí cuando el Decisor proponga algo.
				</p>
			</div>
		</section>
	);
}
