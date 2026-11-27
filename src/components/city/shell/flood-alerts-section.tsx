import { CloudRain } from "lucide-react";
import type { FloodZone } from "../../../lib/city-dashboard-types";
import { CORRIDOR_SEED } from "../../../lib/corridor/corridor-seed";
import type { FloodCountdowns } from "../../../lib/flood-alert/flood-countdown";
import type { SectionLoadState } from "../sections/city-sections-types";
import { FloodResponseSection } from "../sections/flood-response-section";
import {
	toAffectedRoutes,
	toArroyoRows,
} from "../sections/flood-response-utils";

interface FloodAlertsSectionProps {
	floodZones: readonly FloodZone[];
	/** Countdowns from `aguacero` events and the codes they block (with DB alerts). */
	countdowns: FloodCountdowns;
	blockedFloodCodes: readonly string[];
	nowMs: number;
	/** Clock time the presenter sent the downpour, if any. */
	rainSentAt?: string;
	loadState: SectionLoadState;
	busyId: string | null;
	onToggle: (floodZoneId: string, nextActive: boolean) => void;
	onRetry: () => void;
}

/**
 * The arroyo section of /ciudad: the response panel from city/sections (arroyos,
 * affected routes, hosts) fed by live data, plus the city's switch per arroyo.
 */
export function FloodAlertsSection({
	floodZones,
	countdowns,
	blockedFloodCodes,
	nowMs,
	rainSentAt,
	loadState,
	busyId,
	onToggle,
	onRetry,
}: FloodAlertsSectionProps) {
	return (
		<section aria-labelledby="cs-floods-title" className="flex flex-col gap-4">
			<div>
				<p className="q-eyebrow">Resiliencia climática</p>
				<h2 className="q-h2 cs-ih mt-1" id="cs-floods-title">
					<CloudRain size={22} strokeWidth={1.75} aria-hidden="true" />
					Arroyos
				</h2>
			</div>
			<FloodResponseSection
				arroyos={toArroyoRows(floodZones, countdowns, nowMs)}
				routes={toAffectedRoutes(
					CORRIDOR_SEED.segments,
					CORRIDOR_SEED.stops,
					blockedFloodCodes,
				)}
				// No host assignments reach the dashboard yet (#50): the panel says so.
				hosts={[]}
				loadState={loadState}
				rainSentAt={rainSentAt}
				onRetry={onRetry}
			/>
			<fieldset className="q-row m-0 border-0 p-0">
				<legend className="q-sr">Alertas de arroyo de la ciudad</legend>
				{floodZones.map((zone) => (
					<button
						key={zone.id}
						type="button"
						disabled={busyId === zone.id || loadState === "offline"}
						onClick={() => onToggle(zone.id, !zone.alert_active)}
						className={`q-btn q-btn--sm ${
							zone.alert_active ? "q-btn--alert" : "q-btn--secondary"
						}`}
					>
						{zone.alert_active ? "Desactivar: " : "Activar alerta: "}
						{zone.name}
					</button>
				))}
			</fieldset>
		</section>
	);
}
