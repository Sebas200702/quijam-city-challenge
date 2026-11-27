// Controls of the "Calor y sombra" layer (#46): its chip, the cited figure shown
// while it is on, and its part of the map legend. The figure always carries its source.

import { ThermometerSun, TreePalm } from "lucide-react";
import { HEAT_FIGURE } from "../../lib/corridor/heat-reference";
import { useT } from "../../lib/i18n/use-language";

interface HeatChipProps {
	on: boolean;
	/** Stops with shade or water. */
	count: number;
	onToggle: () => void;
}

/** Layer chip, off by default; sits with the other layer chips. */
export function HeatChip({ on, count, onToggle }: HeatChipProps) {
	const t = useT().map.heat;
	return (
		<button
			type="button"
			className="q-chip corridor-chip corridor-chip--gold corridor-chip--optin"
			aria-pressed={on}
			onClick={onToggle}
		>
			<ThermometerSun size={18} strokeWidth={1.75} aria-hidden="true" />
			{t.chip}
			<span className="corridor-chip__count">{count}</span>
		</button>
	);
}

/** The cited figure, over the map while the layer is on (context, not a menu). */
export function HeatNote() {
	const t = useT().map.heat;
	return (
		<p className="corridor-heat-note">
			<ThermometerSun size={16} strokeWidth={1.75} aria-hidden="true" />
			<span>
				{t.note(HEAT_FIGURE.maxDeltaCelsius)}{" "}
				<span className="corridor-heat-note__source">
					· {HEAT_FIGURE.shortCitation}
				</span>
			</span>
		</p>
	);
}

const HEAT_LEGEND = ["hotter", "middle", "cooler", "cool"] as const;

/** Legend items of the layer, the full figure and its source. */
export function HeatLegend() {
	const t = useT().map.heat;
	const labels = {
		hotter: t.hotter,
		middle: t.middle,
		cooler: t.cooler,
		cool: t.coolPoint,
	};
	return (
		<>
			<ul className="corridor-legend__list" aria-label={t.chip}>
				{HEAT_LEGEND.map((key) => (
					<li key={key} className="corridor-legend__item">
						<span
							className={`corridor-legend__swatch corridor-legend__swatch--${key}`}
							aria-hidden="true"
						>
							{key === "cool" && <TreePalm size={14} strokeWidth={2.25} />}
						</span>
						{labels[key]}
					</li>
				))}
			</ul>
			<p className="corridor-legend__note">
				{t.figure(HEAT_FIGURE.maxDeltaCelsius)} {t.source}:{" "}
				<a href={HEAT_FIGURE.url} target="_blank" rel="noopener noreferrer">
					{HEAT_FIGURE.citation}
				</a>
				. {t.guide}
			</p>
		</>
	);
}
