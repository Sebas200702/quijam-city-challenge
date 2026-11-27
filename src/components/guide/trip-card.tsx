import {
	Accessibility,
	Bike,
	Bus,
	CarTaxiFront,
	Flag,
	Footprints,
	Leaf,
	type LucideIcon,
	Map as MapIcon,
	MapPin,
	TramFront,
} from "lucide-react";
import type { TransportMode } from "../../lib/corridor/corridor-types";
import { formatFare, type GuideLanguage } from "../../lib/guide/guide-local";
import { useT } from "../../lib/i18n/use-language";
import {
	DESTINATIONS,
	type TripPlan,
	VISITOR_ORIGIN,
} from "../../lib/trip/trip-planner";

const MODE_ICONS: Record<TransportMode, LucideIcon> = {
	transmetro: TramFront,
	bus: Bus,
	taxi_verified: CarTaxiFront,
	walk: Footprints,
	bike: Bike,
};

const STROKE = 1.75;

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
	const text = useT().guide;
	const copy = text.trip;
	const { green, taxi } = plan;
	const destination = DESTINATIONS[plan.destination].name;
	const GreenIcon = green ? MODE_ICONS[green.transport_mode] : CarTaxiFront;
	const percent = Math.round(plan.confidence * 100);
	const level = copy.levels[percent >= 75 ? 2 : percent >= 50 ? 1 : 0];
	const money = (cop: number) =>
		cop === 0 ? text.free : formatFare(cop, language);
	const why =
		plan.blockedByFlood.length > 0
			? copy.whyFlood
			: green
				? copy.whyGreen
				: copy.whyTaxi;

	if (!green && !taxi) {
		return (
			<article className="guide-trip" aria-label={destination}>
				<div
					className="q-state q-state--empty"
					role="status"
					style={{ minHeight: 0, padding: "12px 8px" }}
				>
					<span className="q-state__glyph" aria-hidden="true">
						<Flag size={26} strokeWidth={STROKE} />
					</span>
					<p className="q-state__title">{copy.noRouteTitle}</p>
					<p className="q-state__text">{copy.noRouteText}</p>
				</div>
			</article>
		);
	}

	return (
		<article className="guide-trip" aria-label={destination}>
			<div className="q-next-step__head flex-wrap">
				<p className="q-next-step__eyebrow whitespace-nowrap">
					<span className="q-star" aria-hidden="true" />
					{copy.eyebrow}
				</p>
				<span className="flex flex-wrap gap-1.5">
					<span
						className={`q-badge ${green ? "q-badge--optimal" : "q-badge--neutral"}`}
					>
						{green ? (
							<Leaf size={14} strokeWidth={STROKE} aria-hidden="true" />
						) : null}
						{green ? text.greenRoute : text.noGreenRoute}
					</span>
					{green?.is_accessible ? (
						<span className="q-badge q-badge--optimal">
							<Accessibility
								size={14}
								strokeWidth={STROKE}
								aria-hidden="true"
							/>
							{copy.accessible}
						</span>
					) : null}
				</span>
			</div>

			<div className="guide-trip__main">
				<span className="guide-trip__icon" aria-hidden="true">
					<GreenIcon size={22} strokeWidth={STROKE} />
				</span>
				<div className="guide-trip__text">
					<span className="guide-trip__title">
						{green
							? `${text.modes[green.transport_mode]} · ${text.minutes(green.estimated_minutes)}`
							: `${copy.taxi} · ${text.minutes(taxi?.estimated_minutes ?? 0)}`}
					</span>
				</div>
				{green ? (
					<div className="guide-trip__fare">
						<span className="q-num guide-trip__amount">
							{money(green.reference_fare_cop)}
						</span>
						<span className="q-sm q-muted">{text.referenceFare}</span>
					</div>
				) : null}
			</div>

			<p className="q-sm q-muted m-0 flex items-center gap-1.5">
				<MapPin size={14} strokeWidth={STROKE} aria-hidden="true" />
				{VISITOR_ORIGIN.name} → {destination}
			</p>
			<p
				className="q-next-step__why"
				style={{ fontSize: 14, lineHeight: "20px" }}
			>
				{why}
			</p>

			{taxi ? (
				<p className="guide-trip__taxi">
					<CarTaxiFront size={16} strokeWidth={STROKE} aria-hidden="true" />
					<span className="min-w-0 flex-1">
						{copy.taxi} · {text.referenceFare.toLowerCase()}{" "}
						<strong className="q-num">{money(taxi.reference_fare_cop)}</strong>{" "}
						<span className="q-muted">
							({copy.range}{" "}
							<span className="q-num">
								{formatFare(taxi.fare_min_cop, language)} –{" "}
								{formatFare(taxi.fare_max_cop, language)}
							</span>
							)
						</span>
					</span>
				</p>
			) : null}

			{green ? (
				<details className="q-details">
					<summary>{copy.details}</summary>
					<div className="q-details__body">
						<dl className="m-0 flex flex-col gap-1.5">
							<div className="flex justify-between gap-3">
								<dt>{copy.confidence}</dt>
								<dd className="q-num m-0">
									{level} · {percent} %
								</dd>
							</div>
							<div className="flex justify-between gap-3">
								<dt>{copy.distance}</dt>
								<dd className="q-num m-0">
									{green.distance_km.toLocaleString(
										language === "es" ? "es-CO" : "en-US",
									)}{" "}
									km
								</dd>
							</div>
							<div className="flex justify-between gap-3">
								<dt>{copy.access}</dt>
								<dd className="m-0">
									{green.is_accessible ? copy.yes : copy.no}
								</dd>
							</div>
						</dl>
						{plan.blockedByFlood.length > 0 ? (
							<p className="m-0">{text.floodBlocked}</p>
						) : null}
						<p className="m-0">{copy.sources}</p>
					</div>
				</details>
			) : null}

			<div className="flex flex-col gap-1">
				<button
					type="button"
					className="q-btn q-btn--primary q-btn--block"
					onClick={onShowOnMap}
				>
					<MapIcon size={18} strokeWidth={STROKE} aria-hidden="true" />
					{copy.showRoute}
				</button>
				<button
					type="button"
					className="q-btn q-btn--ghost q-btn--sm q-btn--block"
					onClick={onReport}
				>
					<Flag size={16} strokeWidth={STROKE} aria-hidden="true" />
					{text.reportOvercharge}
				</button>
			</div>
		</article>
	);
}
