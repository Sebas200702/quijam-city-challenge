import type { useFloodCountdown } from "./use-flood-countdown";

type FloodAlert = ReturnType<typeof useFloodCountdown>["alert"];

/**
 * The only alert allowed to interrupt (epic #57, rule 4): one arroyo at a time,
 * the most urgent. Says what happens and what to do, in one or two short lines.
 */
export function FloodAlertBanner({ alert }: { alert: FloodAlert }) {
	if (!alert) return null;
	const { zone, status } = alert;
	const title =
		status.kind === "active"
			? `${zone.name}: activo`
			: `${zone.name}: se activa en ${status.minutesLeft} min`;
	const advice =
		status.kind === "active"
			? "No cruces. El agua arrastra. Recalculamos tu ruta."
			: "Evita la zona desde ahora. Ya ajustamos tu ruta.";
	return (
		<div role="alert" className="corridor-alert">
			<div className="q-band q-band--red" aria-hidden="true" />
			<div className="corridor-alert__body">
				<p className="corridor-alert__title">{title}</p>
				<p className="corridor-alert__text">{advice}</p>
			</div>
		</div>
	);
}
