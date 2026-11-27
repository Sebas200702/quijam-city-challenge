import type { ReactNode } from "react";
import type { CityDashboardSnapshot } from "../../../lib/city-dashboard-types";
import type {
	ConnectionView,
	DimensionKpi,
} from "../../../lib/city-dashboard-utils";
import "./city-shell.css";
import { CorridorZoneMap } from "./corridor-zone-map";
import { DimensionKpis } from "./dimension-kpis";
import { ShellNotice } from "./shell-notice";
import { ShellState } from "./shell-state";
import { StatusRowsPanel } from "./status-rows-panel";
import { ZoneMetersPanel } from "./zone-meters-panel";

interface CommandCenterProps {
	snapshot: CityDashboardSnapshot | null;
	kpis: readonly DimensionKpi[];
	connection: ConnectionView;
	lastDataLabel: string | null;
	loadError: string | null;
	actionError: string | null;
	onDismissActionError: () => void;
	onRetry: () => void;
	clockLabel: string;
	/** Decisor card from city/sections: the diversion proposal or the active diversion. */
	decisionSlot: ReactNode;
	/** Higher-priority notice (an active arroyo); see ShellNotice. */
	priorityNotice?: ReactNode;
	/** Match-day timeline (#44), shown under the map. */
	timelineSlot?: ReactNode;
}

/** Map on the left, indicators and panels on the right, with complete states. */
export function CommandCenter({
	snapshot,
	kpis,
	connection,
	lastDataLabel,
	loadError,
	actionError,
	onDismissActionError,
	onRetry,
	clockLabel,
	decisionSlot,
	priorityNotice,
	timelineSlot,
}: CommandCenterProps) {
	const zones = snapshot?.zones ?? [];
	const floodZones = snapshot?.floodZones ?? [];

	let right: ReactNode;
	if (!snapshot && loadError) {
		right = (
			<ShellState
				kind="error"
				title="No pudimos leer los datos del corredor"
				text="Revisa la conexión del tablero e inténtalo otra vez. El mapa sigue disponible."
				onRetry={onRetry}
			/>
		);
	} else if (!snapshot) {
		right = (
			<ShellState
				kind="loading"
				title="Cargando el corredor"
				text="Zonas, arroyos, decisiones e indicadores."
			/>
		);
	} else if (zones.length === 0) {
		right = (
			<ShellState
				kind="empty"
				title="Aún no hay conteos en el corredor"
				text="Llegan cuando abre la jornada, a las 8:00. El mapa ya muestra paraderos y arroyos."
			/>
		);
	} else {
		right = (
			<>
				<DimensionKpis kpis={kpis} />
				<div className="cs-panels">
					<div className="cs-col">
						<ShellNotice
							connection={connection}
							lastDataLabel={lastDataLabel}
							actionError={actionError}
							onDismissError={onDismissActionError}
							priority={priorityNotice}
						/>
						{decisionSlot}
						<StatusRowsPanel
							floodZones={floodZones}
							reports={snapshot.reports}
						/>
					</div>
					<div className="cs-col">
						<ZoneMetersPanel zones={zones} />
					</div>
				</div>
			</>
		);
	}

	return (
		<>
			<header className="lc-canvas cs-canvas l-rise">
				<span className="l-geo l-geo--ring l-geo--green right-[6%] top-3 max-lg:hidden" style={{ ["--i" as string]: 0 }} aria-hidden="true" />
				<span className="l-geo l-geo--half l-geo--gold right-[18%] bottom-0 max-lg:hidden" style={{ ["--i" as string]: 1 }} aria-hidden="true" />
				<span className="l-geo l-geo--plus right-[30%] top-4 max-lg:hidden" style={{ ["--i" as string]: 2 }} aria-hidden="true" />
				<span className="l-geo l-geo--diamond l-geo--ink right-[42%] bottom-4 max-lg:hidden" style={{ ["--i" as string]: 3 }} aria-hidden="true" />
				<p className="l-eyebrow lc-eb">
					<span className="q-star" aria-hidden="true" />
					Centro de Mando
				</p>
				<h1 className="lc-title">Lo que la ciudad aprende: mapa del corredor</h1>
			</header>
			<div className="cs-grid">
			<CorridorZoneMap
				zones={zones}
				floodZones={floodZones}
				clockLabel={clockLabel}
				timeline={timelineSlot}
			/>
			<div className="cs-right">{right}</div>
		</div>
		</>
	);
}
