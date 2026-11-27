import { Users } from "lucide-react";
import "../../../styles/life-city-b.css";
import type { ZoneVisitorCount } from "../../../lib/city-dashboard-types";
import {
	CITY_MODE_LABELS,
	calculateOccupancyPercent,
	getDensityVisualState,
	SATURATION_GLYPHS,
} from "../../../lib/city-dashboard-utils";

const numberEs = new Intl.NumberFormat("es-CO");

interface ZoneMetersPanelProps {
	zones: readonly ZoneVisitorCount[];
}

/** "Gente por zona": anonymous count per zone against the threshold of the city mode. */
export function ZoneMetersPanel({ zones }: ZoneMetersPanelProps) {
	const mode = zones[0] ? CITY_MODE_LABELS[zones[0].city_mode] : null;

	return (
		<section
			className="q-panel cs-panel lcb-panel lcb-panel--leaf l-rise"
			aria-labelledby="cs-zones-title"
		>
			<div className="cs-panel__head">
				<h2 className="q-h3 cs-ih" id="cs-zones-title">
					<span className="lcb-chip lcb-chip--green lcb-chip--hex">
						<Users size={20} strokeWidth={1.75} aria-hidden="true" />
					</span>
					Gente por zona
				</h2>
				<span className="cs-sub">
					Conteos anónimos{mode ? ` · umbral del modo ${mode}` : ""}
				</span>
			</div>
			<ul className="cs-list">
				{zones.map((zone, index) => {
					const pct = calculateOccupancyPercent(zone);
					const visual = getDensityVisualState(pct);
					const glyph = SATURATION_GLYPHS[visual.tone];
					const people = `${numberEs.format(zone.active_visitors)} de ${numberEs.format(zone.capacity_threshold)} personas`;
					return (
						<li
							key={zone.zone}
							className="lcb-meter l-rise"
							style={{ ["--i" as string]: index + 1 }}
						>
							<div className={`q-meter q-meter--${visual.tone} q-meter--sm`}>
								<meter
									className="q-sr"
									min={0}
									max={zone.capacity_threshold}
									value={zone.active_visitors}
									aria-label={`${zone.zone_label}: ${pct} %, ${visual.label}. ${people}`}
								>
									{pct} % {visual.label}
								</meter>
								<div className="q-meter__head" aria-hidden="true">
									<span>{zone.zone_label}</span>
									<b>
										{pct} %{" "}
										<span className="q-meter__state">
											{glyph} {visual.label}
										</span>
									</b>
								</div>
								<div className="q-meter__track" aria-hidden="true">
									<div
										className="q-meter__fill"
										style={{ width: `${Math.min(pct, 100)}%` }}
									/>
								</div>
								<span className="cs-sub" aria-hidden="true">
									{people}
								</span>
							</div>
						</li>
					);
				})}
			</ul>
		</section>
	);
}
