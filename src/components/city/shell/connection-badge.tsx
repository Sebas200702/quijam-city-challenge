import { WifiOff } from "lucide-react";
import type { ConnectionView } from "../../../lib/city-dashboard-utils";

interface ConnectionBadgeProps {
	view: ConnectionView;
	/** "Actualizado hace 30 s" while live, "Último dato hace 8 min" while offline. */
	freshness: string | null;
}

/** Live status of the city dashboard plus how fresh the data on screen is. */
export function ConnectionBadge({ view, freshness }: ConnectionBadgeProps) {
	return (
		<span className="cs-conn" role="status" aria-live="polite">
			{view === "live" && (
				<span className="q-badge q-badge--live">
					<span className="q-dot" aria-hidden="true" />
					En vivo
				</span>
			)}
			{view === "connecting" && (
				<span className="q-badge q-badge--neutral">Conectando</span>
			)}
			{view === "offline" && (
				<span className="q-badge q-badge--neutral">
					<WifiOff
						className="cs-badge-icon"
						strokeWidth={1.75}
						aria-hidden="true"
					/>
					Sin conexión
				</span>
			)}
			{freshness && <span className="cs-fresh">{freshness}</span>}
		</span>
	);
}
