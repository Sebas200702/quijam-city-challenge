// Compact card for a place Quillart AI found; opens the place page.

import { Accessibility, MapPin } from "lucide-react";
import { PLACE_KIND_LABELS } from "../../lib/community/community-labels";
import type { Place } from "../../lib/community/community-types";
import { useT } from "../../lib/i18n/use-language";

export function PlaceResultCard({ place }: { place: Place }) {
	const t = useT();
	return (
		<a
			href={`/lugares/${encodeURIComponent(place.slug)}`}
			className="q-card la-place la-lift gap-1.5 px-5 py-4 text-inherit no-underline lg:hover:shadow-[var(--glow-gold)]"
		>
			<span className="flex items-center justify-between gap-2">
				<span className="q-eyebrow">{PLACE_KIND_LABELS[place.kind]}</span>
				<span
					className="q-tile q-tile--green l-ico--hex h-9! w-9!"
					aria-hidden="true"
				>
					<MapPin size={16} />
				</span>
			</span>
			<h3 className="q-h3 break-words">{place.name}</h3>
			<p className="q-sm q-muted flex items-center gap-1.5">
				<MapPin size={14} aria-hidden="true" className="shrink-0" />
				<span className="truncate">{place.neighborhood}</span>
			</p>
			<div className="flex flex-wrap gap-1.5 pt-1">
				<span className="q-badge q-badge--neutral">
					{place.isFree ? t.places.freeShort : t.places.paid}
				</span>
				{place.isAccessible && (
					<span className="q-badge q-badge--optimal">
						<Accessibility size={12} aria-hidden="true" />
						{t.places.accessible}
					</span>
				)}
			</div>
		</a>
	);
}
