import type { DecisionWithSource } from "./decider-types";
import { isShadedRoute } from "./weighted-chooser";

const copFormatter = new Intl.NumberFormat("es-CO", {
	maximumFractionDigits: 0,
});

function formatFare(fareCop: number): string {
	return fareCop === 0 ? "gratis" : `$${copFormatter.format(fareCop)}`;
}

function plural(count: number, singular: string, pluralForm: string): string {
	return `${count} ${count === 1 ? singular : pluralForm}`;
}

/** One short sentence for the visitor. Details (probabilities, confidence) stay in a collapsible panel. */
export function explainDecision(decision: DecisionWithSource): string {
	if (!decision.option) {
		return "Ahora no hay una ruta segura. Espera en un lugar seco o pide un anfitrión.";
	}
	const { label, durationMinutes, fareCop } = decision.option;
	const parts = [
		`Te recomendamos ${label}: ${durationMinutes} min, ${formatFare(fareCop)}.`,
	];
	const floods = decision.discarded.filter(
		(item) => item.reason === "active-flood",
	).length;
	if (floods > 0) {
		parts.push(
			`Evitamos ${plural(floods, "ruta", "rutas")} por arroyo activo.`,
		);
	}
	if (decision.discarded.some((item) => item.reason === "not-accessible")) {
		parts.push("Solo mostramos rutas accesibles.");
	}
	if (isShadedRoute(decision.option)) {
		parts.push("Esta ruta tiene sombra en los paraderos.");
	}
	return parts.join(" ");
}
