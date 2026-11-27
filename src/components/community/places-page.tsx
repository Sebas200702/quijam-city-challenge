// "Lugares y naturaleza": the city's public spaces and natural areas.

import { Map as MapIcon } from "lucide-react";
import { useState } from "react";
import type { PlaceKind } from "../../lib/community/community-types";
import { useT } from "../../lib/i18n/use-language";
import { AskQuillartButton } from "../assistant/ask-quillart-button";
import { CommunityShell } from "./community-shell";
import { EmptyState, Loaded, PageTitle } from "./community-ui";
import { PlaceCard } from "./place-card";
import { useLoad } from "./use-community";

type KindFilter = PlaceKind | "all";

const FILTERS: KindFilter[] = [
	"all",
	"nature",
	"park",
	"waterfront",
	"culture",
	"heritage",
	"sport",
];

export function PlacesPage({ aiHref }: { aiHref?: string }) {
	const t = useT();
	const [filter, setFilter] = useState<KindFilter>("all");
	const { state } = useLoad(
		async (store) => {
			const [places, events] = await Promise.all([
				store.listPlaces(),
				store.listEvents(),
			]);
			const upcoming = new Map<string, number>();
			for (const event of events) {
				if (!event.placeId || event.status === "cancelled") continue;
				upcoming.set(event.placeId, (upcoming.get(event.placeId) ?? 0) + 1);
			}
			return { places, upcoming };
		},
		[],
		["events"],
	);

	return (
		<CommunityShell current="places" aiHref={aiHref}>
			<PageTitle
				eyebrow={t.places.eyebrow}
				title={t.places.title}
				illustration="/illustrations/through-the-park.svg"
				action={
					<a
						href="/mapa"
						className="q-btn q-btn--secondary q-btn--sm min-h-11!"
					>
						<MapIcon size={16} aria-hidden="true" />
						{t.places.viewOnMap}
					</a>
				}
			>
				{t.places.intro}
			</PageTitle>

			<div className="flex flex-wrap items-center gap-2">
				<AskQuillartButton
					prompt={t.places.askPrompt}
					label={t.places.askLabel}
				/>
			</div>

			<fieldset>
				<legend className="sr-only">{t.places.filterLegend}</legend>
				<div className="flex flex-wrap gap-2">
					{FILTERS.map((option) => {
						const on = filter === option;
						return (
							<button
								key={option}
								type="button"
								aria-pressed={on}
								onClick={() => setFilter(option)}
								className={`q-chip ${on ? "bg-[var(--action)]! text-[var(--on-action)]!" : ""}`}
							>
								{t.places.filters[option]}
							</button>
						);
					})}
				</div>
			</fieldset>

			<Loaded state={state} loadingLabel={t.places.loading}>
				{({ places, upcoming }) => {
					const visible =
						filter === "all"
							? places
							: places.filter((place) => place.kind === filter);
					if (visible.length === 0)
						return (
							<EmptyState
								illustration="/illustrations/among-nature.svg"
								title={t.places.emptyTitle}
							>
								{t.places.emptyText}
							</EmptyState>
						);
					return (
						<ul className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
							{visible.map((place) => (
								<li key={place.id} className="grid">
									<PlaceCard
										place={place}
										upcomingCount={upcoming.get(place.id) ?? 0}
									/>
								</li>
							))}
						</ul>
					);
				}}
			</Loaded>
		</CommunityShell>
	);
}
