import { Bell, CloudRain, Receipt } from "lucide-react";
import "../../../styles/life-city-b.css";
import type {
	FloodZone,
	OverchargeReport,
} from "../../../lib/city-dashboard-types";
import {
	getActiveFloodAlerts,
	summarizeReportsByStatus,
} from "../../../lib/city-dashboard-utils";

interface StatusRowsPanelProps {
	floodZones: readonly FloodZone[];
	reports: readonly OverchargeReport[];
}

/** "Avisos": one calm row per city event family, with a link to act on it. */
export function StatusRowsPanel({ floodZones, reports }: StatusRowsPanelProps) {
	const activeFloods = getActiveFloodAlerts(floodZones);
	const summary = summarizeReportsByStatus(reports);

	return (
		<section
			className="q-panel cs-panel lcb-panel lcb-panel--bubble l-rise"
			aria-labelledby="cs-notices-title"
		>
			<h2 className="q-h3 cs-ih" id="cs-notices-title">
				<span className="lcb-chip lcb-chip--circle">
					<Bell size={20} strokeWidth={1.75} aria-hidden="true" />
				</span>
				Avisos
			</h2>
			<ul className="cs-list" style={{ gap: 8 }}>
				<li
					className="cs-row lcb-row l-rise"
					style={{ gap: 12, ["--i" as string]: 1 }}
				>
					<div className="cs-rowl">
						<span className="cs-ico l-ico--octagon">
							<CloudRain size={20} strokeWidth={1.75} aria-hidden="true" />
						</span>
						<div>
							<b>Arroyos</b>
							<span className="cs-sub">
								{activeFloods.length > 0
									? activeFloods.map((flood) => flood.name).join(", ")
									: "Ninguno activo en el corredor"}
							</span>
						</div>
					</div>
					{activeFloods.length > 0 ? (
						<span className="q-badge q-badge--alert q-badge--solid">
							! {activeFloods.length} activo
							{activeFloods.length === 1 ? "" : "s"}
						</span>
					) : (
						<span className="q-badge q-badge--optimal">✓ Seguro</span>
					)}
				</li>
				<li
					className="cs-row lcb-row l-rise"
					style={{ gap: 12, ["--i" as string]: 2 }}
				>
					<div className="cs-rowl">
						<span className="cs-ico l-ico--circle">
							<Receipt size={20} strokeWidth={1.75} aria-hidden="true" />
						</span>
						<div>
							<b>Cobros abusivos</b>
							<span className="cs-sub">
								{summary.open === 0
									? "Ningún reporte nuevo"
									: `${summary.open} ${summary.open === 1 ? "nuevo" : "nuevos"}`}{" "}
								· {summary.in_review} en revisión
							</span>
						</div>
					</div>
					<a className="q-btn q-btn--ghost lcb-pill" href="#cobros">
						Ver cobros
					</a>
				</li>
			</ul>
		</section>
	);
}
