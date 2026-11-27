import { ArrowRight, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useT } from "../../lib/i18n/use-language";
import "./map-chrome.css";
import type { MapPoint, PointLayer } from "./map-layer-registry";

interface PointCardProps {
	layer: PointLayer;
	point: MapPoint;
	onClose: () => void;
}

/** Card of a point from a registered layer (a place today): what it is and one way in. */
export function PointCard({ layer, point, onClose }: PointCardProps) {
	const t = useT();
	const headingRef = useRef<HTMLHeadingElement>(null);
	// Like the corridor card: focus goes to the heading of each new selection.
	useEffect(() => {
		if (point.id) headingRef.current?.focus({ preventScroll: true });
	}, [point.id]);
	const Icon = layer.Icon;

	return (
		<section
			className="q-card q-card--raised q-card--frame corridor-detail mc-detail"
			aria-labelledby="corridor-point-title"
		>
			<div className="q-card__head mc-detail-head">
				<span
					className={`q-tile mc-tile-sm mc-hero mc-hero--${layer.tone}`}
					aria-hidden="true"
				>
					<Icon size={22} strokeWidth={1.75} />
				</span>
				<div className="mc-detail-head__text">
					<p className="q-eyebrow">{point.eyebrow}</p>
					<h2
						id="corridor-point-title"
						className="q-h2"
						ref={headingRef}
						tabIndex={-1}
					>
						{point.name}
					</h2>
				</div>
				<button
					type="button"
					className="q-btn q-btn--ghost q-btn--icon"
					aria-label={t.map.close}
					onClick={onClose}
				>
					<X size={20} strokeWidth={1.75} aria-hidden="true" />
				</button>
			</div>
			{point.description && (
				<div className="q-card__body">
					<p className="q-sm q-muted">{point.description}</p>
				</div>
			)}
			{point.href && (
				<div className="q-card__foot">
					<a className="q-btn q-btn--primary q-btn--block" href={point.href}>
						{layer.openLabel(t)}
						<ArrowRight size={18} strokeWidth={1.75} aria-hidden="true" />
					</a>
				</div>
			)}
		</section>
	);
}
