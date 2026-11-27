import { Route } from "lucide-react";
import { stopServices } from "../../lib/corridor/corridor-geometry";
import {
	STOP_TYPE_LABELS,
	ZONE_LABELS,
} from "../../lib/corridor/corridor-selection";
import type { CorridorStop } from "../../lib/corridor/corridor-types";
import {
	MAP_COPY,
	type MapLang,
	STOP_TYPE_LABELS_EN,
	ZONE_LABELS_EN,
} from "./map-chrome-copy";
import "./map-chrome.css";
import { CorridorArt } from "./map-illustrations";
import { ServiceIcon, STOP_TYPE_ICONS } from "./service-icon";

interface StopListProps {
	stops: CorridorStop[];
	selectedCode: string | null;
	onPick: (stop: CorridorStop) => void;
	/** Copy language. Defaults to Spanish. */
	lang?: MapLang;
}

/** The corridor's stops in order, as a numbered line from south to north. */
export function StopList({
	stops,
	selectedCode,
	onPick,
	lang = "es",
}: StopListProps) {
	const copy = MAP_COPY[lang];
	const typeLabels = lang === "en" ? STOP_TYPE_LABELS_EN : STOP_TYPE_LABELS;
	const zoneLabels = lang === "en" ? ZONE_LABELS_EN : ZONE_LABELS;

	return (
		<section
			className="q-card corridor-stops"
			aria-labelledby="corridor-stops-title"
		>
			<div className="q-card__head mc-stops-head">
				<span className="q-tile q-tile--gold mc-tile-sm" aria-hidden="true">
					<Route size={20} strokeWidth={1.75} />
				</span>
				<div className="mc-stops-head__text">
					<h2 id="corridor-stops-title" className="q-h2">
						{copy.stopsTitle}
					</h2>
					<span className="q-sm q-subtle">
						{copy.stopsOrder} · {copy.stopsCount(stops.length)}
					</span>
				</div>
			</div>

			{stops.length === 0 ? (
				<div className="q-state q-state--empty mc-state">
					<CorridorArt className="mc-state__illus" />
					<p className="q-state__title">{copy.stopsEmptyTitle}</p>
					<p className="q-state__text">{copy.stopsEmptyText}</p>
				</div>
			) : (
				<ol className="corridor-stops__list">
					{stops.map((stop, index) => {
						const TypeIcon = STOP_TYPE_ICONS[stop.stop_type];
						return (
							<li key={stop.code}>
								<button
									type="button"
									className="corridor-stop"
									aria-pressed={stop.code === selectedCode}
									onClick={() => onPick(stop)}
								>
									<span className="corridor-stop__n" aria-hidden="true">
										{index + 1}
									</span>
									<span className="q-sr">{copy.stopNumber(index + 1)}:</span>
									<span className="corridor-stop__text">
										<span className="corridor-stop__name">{stop.name}</span>
										<span className="corridor-stop__zone mc-stop-zone">
											<TypeIcon
												size={14}
												strokeWidth={1.75}
												aria-hidden="true"
											/>
											<span className="mc-stop-zone__text">
												{typeLabels[stop.stop_type]} · {zoneLabels[stop.zone]}
											</span>
										</span>
									</span>
									<span className="corridor-stop__services">
										{stopServices(stop)
											.filter((service) => service !== "recycling")
											.map((service) => (
												<ServiceIcon
													key={service}
													service={service}
													lang={lang}
												/>
											))}
									</span>
								</button>
							</li>
						);
					})}
				</ol>
			)}
		</section>
	);
}
