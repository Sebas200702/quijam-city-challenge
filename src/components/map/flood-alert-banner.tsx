import { useT } from "../../lib/i18n/use-language";
import type { useFloodCountdown } from "./use-flood-countdown";

type FloodAlert = ReturnType<typeof useFloodCountdown>["alert"];

/**
 * The only alert allowed to interrupt (epic #57, rule 4): one arroyo at a time,
 * the most urgent. Says what happens and what to do, in one or two short lines.
 */
export function FloodAlertBanner({ alert }: { alert: FloodAlert }) {
	const t = useT();
	if (!alert) return null;
	const { zone, status } = alert;
	const title =
		status.kind === "active"
			? t.map.flood.active(zone.name)
			: t.map.flood.soon(zone.name, status.minutesLeft);
	const advice =
		status.kind === "active"
			? t.map.flood.adviceActive
			: t.map.flood.adviceSoon;
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
