import type { useFloodAlerts } from "./use-flood-alerts";

type FloodAlertState = ReturnType<typeof useFloodAlerts>;

/**
 * The only alert allowed to interrupt (epic #57, rule 4): one arroyo at a time,
 * the most urgent. Says what happens and what to do, in one or two short lines.
 */
export function FloodAlertBanner({
	alert,
	recalc,
}: Pick<FloodAlertState, "alert" | "recalc">) {
	if (!alert) return null;
	const { zone, status } = alert;
	const title =
		status.kind === "active"
			? `${zone.name}: activo`
			: `${zone.name}: se activa en ${status.minutesLeft} min`;
	const advice =
		status.kind === "active"
			? "No cruces. El agua arrastra."
			: "Evita la zona desde ahora.";

	return (
		<div role="alert" className="corridor-alert q-card">
			<div className="q-band q-band--red" aria-hidden="true" />
			<div className="corridor-alert__body">
				<p className="corridor-alert__title">{title}</p>
				<p className="corridor-alert__text">{advice}</p>
				{recalc?.reason && (
					<p className="corridor-alert__text">{recalc.reason}</p>
				)}
			</div>
		</div>
	);
}
