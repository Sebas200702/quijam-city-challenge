// Link card for one public space or natural area.

import {
	Accessibility,
	CalendarDays,
	Landmark,
	Leaf,
	type LucideIcon,
	MapPin,
	Palette,
	Trees,
	Trophy,
	Waves,
} from "lucide-react";
import { PLACE_KIND_LABELS } from "../../lib/community/community-labels";
import type { Place, PlaceKind } from "../../lib/community/community-types";

export const PLACE_KIND_ICONS: Record<PlaceKind, LucideIcon> = {
	nature: Leaf,
	park: Trees,
	waterfront: Waves,
	culture: Palette,
	heritage: Landmark,
	sport: Trophy,
};

const KIND_TILE: Record<PlaceKind, string> = {
	nature: "q-tile--green",
	park: "q-tile--green",
	waterfront: "q-tile--gold",
	culture: "q-tile--gold",
	heritage: "q-tile--red",
	sport: "q-tile--red",
};

export function PlaceKindTile({ kind }: { kind: PlaceKind }) {
	const Icon = PLACE_KIND_ICONS[kind];
	return (
		<span className={`q-tile ${KIND_TILE[kind]}`} aria-hidden="true">
			<Icon size={22} />
		</span>
	);
}

/** "Entrada libre" / "Con costo" and "Accesible" badges. */
export function PlaceBadges({ place }: { place: Place }) {
	return (
		<>
			<span
				className={`q-badge ${place.isFree ? "q-badge--optimal" : "q-badge--neutral"}`}
			>
				{place.isFree ? "Entrada libre" : "Con costo"}
			</span>
			{place.isAccessible && (
				<span className="q-badge q-badge--neutral">
					<Accessibility size={12} aria-hidden="true" />
					Accesible
				</span>
			)}
		</>
	);
}

function upcomingText(count: number): string {
	if (count === 0) return "Sin eventos próximos";
	return count === 1 ? "1 evento próximo" : `${count} eventos próximos`;
}

export function PlaceCard({
	place,
	upcomingCount,
}: {
	place: Place;
	upcomingCount?: number;
}) {
	return (
		<a
			href={`/lugares/${encodeURIComponent(place.slug)}`}
			className="q-card w-full flex-row! gap-4 p-4 text-inherit no-underline transition-shadow hover:shadow-[var(--glow-gold)]"
		>
			<PlaceKindTile kind={place.kind} />
			<div className="min-w-0 flex-1 space-y-1.5">
				<p className="q-eyebrow">{PLACE_KIND_LABELS[place.kind]}</p>
				<h3 className="q-h3 break-words">{place.name}</h3>
				<p className="q-sm q-muted flex items-center gap-1.5">
					<MapPin size={14} aria-hidden="true" className="shrink-0" />
					<span className="truncate">{place.neighborhood}</span>
				</p>
				<p className="q-p q-muted line-clamp-2 break-words">
					{place.description}
				</p>
				<div className="flex flex-wrap items-center gap-1.5 pt-1">
					<PlaceBadges place={place} />
					{upcomingCount !== undefined && (
						<span
							className={`q-badge ${upcomingCount > 0 ? "q-badge--event" : "q-badge--neutral"}`}
						>
							<CalendarDays size={12} aria-hidden="true" />
							{upcomingText(upcomingCount)}
						</span>
					)}
				</div>
			</div>
		</a>
	);
}
