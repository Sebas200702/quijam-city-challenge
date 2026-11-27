import { CloudRain } from "lucide-react";
import type { FloodZone } from "../../../lib/city-dashboard-types";
import {
	getActiveFloodAlerts,
	ZONE_LABELS,
} from "../../../lib/city-dashboard-utils";

interface FloodAlertsSectionProps {
	floodZones: readonly FloodZone[];
	busyId: string | null;
	onToggle: (floodZoneId: string, nextActive: boolean) => void;
}

/**
 * Arroyo alerts with the simulate/deactivate controls. Interim section moved
 * out of city-dashboard.tsx unchanged in behaviour; the arroyo panel in
 * city/sections replaces it at integration.
 */
export function FloodAlertsSection({
	floodZones,
	busyId,
	onToggle,
}: FloodAlertsSectionProps) {
	const activeAlerts = getActiveFloodAlerts(floodZones);
	const hasAlerts = activeAlerts.length > 0;

	return (
		<section
			aria-labelledby="cs-floods-title"
			className={`q-card ${hasAlerts ? "shadow-[var(--glow-red)]" : ""}`}
		>
			<div
				className={`q-band ${hasAlerts ? "q-band--red" : "q-band--green"}`}
				aria-hidden="true"
			/>
			<div className="q-card__head">
				<div>
					<p className="q-eyebrow">Resiliencia climática · Arroyos</p>
					<h2 className="q-h2 cs-ih mt-1" id="cs-floods-title">
						<CloudRain size={22} strokeWidth={1.75} aria-hidden="true" />
						{hasAlerts
							? `Alerta de arroyos activa (${activeAlerts.length})`
							: "Sin alertas de arroyos activas"}
					</h2>
				</div>
				<span
					className={`q-badge ${
						hasAlerts ? "q-badge--alert q-badge--solid" : "q-badge--optimal"
					}`}
				>
					{hasAlerts ? "! Crítico" : "✓ Seguro"}
				</span>
			</div>

			<div className="q-card__body">
				{hasAlerts && (
					<ul className="space-y-2.5">
						{activeAlerts.map((alert) => (
							<li
								key={alert.id}
								className="rounded-[var(--radius-md)] bg-[var(--red-soft)] p-3.5"
							>
								<div className="flex flex-wrap items-center justify-between gap-2">
									<span className="font-semibold text-[var(--ink)]">
										{alert.name} · {ZONE_LABELS[alert.zone]}
									</span>
									<span className="q-badge q-badge--alert q-badge--solid">
										Riesgo {alert.risk_level}
									</span>
								</div>
								{alert.advisory_es && (
									<p className="q-sm mt-1.5 text-[var(--red-text)]">
										{alert.advisory_es}
									</p>
								)}
							</li>
						))}
					</ul>
				)}

				<div className="q-row">
					{floodZones.map((zone) => (
						<button
							key={zone.id}
							type="button"
							disabled={busyId === zone.id}
							onClick={() => onToggle(zone.id, !zone.alert_active)}
							className={`q-btn q-btn--sm ${
								zone.alert_active ? "q-btn--alert" : "q-btn--secondary"
							}`}
						>
							{zone.alert_active ? "Desactivar: " : "Activar alerta: "}
							{zone.name}
						</button>
					))}
				</div>
			</div>
		</section>
	);
}
