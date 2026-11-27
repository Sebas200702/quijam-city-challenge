// Compact card for a place Quillart AI found; opens the place page.

import { Accessibility, MapPin } from "lucide-react";
import { PLACE_KIND_LABELS } from "../../lib/community/community-labels";
import type { Place } from "../../lib/community/community-types";

export function PlaceResultCard({ place }: { place: Place }) {
	return (
		<a
			href={`/lugares/${encodeURIComponent(place.slug)}`}
			className="q-card gap-1.5 px-4 py-3 text-inherit no-underline transition-shadow lg:hover:shadow-[var(--glow-gold)]"
		>
			<span className="q-eyebrow">{PLACE_KIND_LABELS[place.kind]}</span>
			<h3 className="q-h3 break-words">{place.name}</h3>
			<p className="q-sm q-muted flex items-center gap-1.5">
				<MapPin size={14} aria-hidden="true" className="shrink-0" />
				<span className="truncate">{place.neighborhood}</span>
			</p>
			<div className="flex flex-wrap gap-1.5 pt-1">
				<span className="q-badge q-badge--neutral">
					{place.isFree ? "Gratis" : "Con costo"}
				</span>
				{place.isAccessible && (
					<span className="q-badge q-badge--optimal">
						<Accessibility size={12} aria-hidden="true" />
						Accesible
					</span>
				)}
			</div>
		</a>
	);
}
