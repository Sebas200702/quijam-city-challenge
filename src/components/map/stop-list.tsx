import { stopServices } from "../../lib/corridor/corridor-geometry";
import {
	STOP_TYPE_LABELS,
	ZONE_LABELS,
} from "../../lib/corridor/corridor-selection";
import type { CorridorStop } from "../../lib/corridor/corridor-types";
import { ServiceIcon } from "./service-icon";

interface StopListProps {
	stops: CorridorStop[];
	selectedCode: string | null;
	onPick: (stop: CorridorStop) => void;
}

/** The corridor's stops in order, as a numbered line from south to north. */
export function StopList({ stops, selectedCode, onPick }: StopListProps) {
	return (
		<section
			className="q-card corridor-stops"
			aria-labelledby="corridor-stops-title"
		>
			<div className="q-card__head">
				<h2 id="corridor-stops-title" className="q-h2">
					Paradas del corredor
				</h2>
				<span className="q-sm q-subtle">De sur a norte</span>
			</div>
			<ol className="corridor-stops__list">
				{stops.map((stop, index) => (
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
							<span className="corridor-stop__text">
								<span className="corridor-stop__name">{stop.name}</span>
								<span className="corridor-stop__zone">
									{STOP_TYPE_LABELS[stop.stop_type]} · {ZONE_LABELS[stop.zone]}
								</span>
							</span>
							<span className="corridor-stop__services">
								{stopServices(stop)
									.filter((service) => service !== "recycling")
									.map((service) => (
										<ServiceIcon key={service} service={service} />
									))}
							</span>
						</button>
					</li>
				))}
			</ol>
		</section>
	);
}
