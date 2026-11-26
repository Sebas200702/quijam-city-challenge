import {
	Bike,
	Bus,
	CarTaxiFront,
	Flag,
	Footprints,
	type LucideIcon,
	Map as MapIcon,
	TramFront,
} from "lucide-react";
import type { TransportMode } from "../../lib/corridor/corridor-types";
import { formatFare, type GuideLanguage } from "../../lib/guide/guide-local";
import { DESTINATIONS, type TripPlan } from "../../lib/trip/trip-planner";
import { guideText } from "./guide-text";

const MODE_ICONS: Record<TransportMode, LucideIcon> = {
	transmetro: TramFront,
	bus: Bus,
	taxi_verified: CarTaxiFront,
	walk: Footprints,
	bike: Bike,
};

interface TripCardProps {
	plan: TripPlan;
	language: GuideLanguage;
	onShowOnMap: () => void;
	onReport: () => void;
}

/** The route the Guide recommends, always from our data, never from the model's text. */
export function TripCard({
	plan,
	language,
	onShowOnMap,
	onReport,
}: TripCardProps) {
	const text = guideText(language);
	const { green, taxi } = plan;
	const GreenIcon = green ? MODE_ICONS[green.transport_mode] : Flag;

	return (
		<article
			className="guide-trip"
			aria-label={DESTINATIONS[plan.destination].name}
		>
			<div className="guide-trip__main">
				<span className="guide-trip__icon" aria-hidden="true">
					<GreenIcon size={22} strokeWidth={1.75} />
				</span>
				<div className="guide-trip__text">
					<span
						className={`q-badge ${green ? "q-badge--optimal" : "q-badge--neutral"}`}
					>
						{green ? text.greenRoute : text.noGreenRoute}
					</span>
					<span className="guide-trip__title">
						{green
							? `${text.modes[green.transport_mode]} · ${text.minutes(green.estimated_minutes)}`
							: DESTINATIONS[plan.destination].name}
					</span>
				</div>
				{green && (
					<div className="guide-trip__fare">
						<span className="q-num guide-trip__amount">
							{green.reference_fare_cop === 0
								? text.free
								: formatFare(green.reference_fare_cop, language)}
						</span>
						<span className="q-sm q-muted">{text.referenceFare}</span>
					</div>
				)}
			</div>

			{taxi && (
				<p className="guide-trip__taxi">
					<CarTaxiFront size={16} strokeWidth={1.75} aria-hidden="true" />
					{text.fairTaxi}:{" "}
					<strong className="q-num">
						{formatFare(taxi.fare_min_cop, language)} –{" "}
						{formatFare(taxi.fare_max_cop, language)}
					</strong>
				</p>
			)}
			{plan.blockedByFlood.length > 0 && (
				<p className="q-sm q-muted">{text.floodBlocked}</p>
			)}

			<div className="q-row">
				<button
					type="button"
					className="q-btn q-btn--secondary q-btn--sm"
					onClick={onShowOnMap}
				>
					<MapIcon size={16} strokeWidth={1.75} aria-hidden="true" />
					{text.showOnMap}
				</button>
				<button
					type="button"
					className="q-btn q-btn--ghost q-btn--sm"
					onClick={onReport}
				>
					<Flag size={16} strokeWidth={1.75} aria-hidden="true" />
					{text.reportOvercharge}
				</button>
			</div>
		</article>
	);
}
