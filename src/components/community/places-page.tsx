// "Lugares y naturaleza": the city's public spaces and natural areas.
// Search and kind live in the URL (?q=&tipo=) so a link can open them filtered.

import { Map as MapIcon, Search } from "lucide-react";
import type { Place, PlaceKind } from "../../lib/community/community-types";
import { useT } from "../../lib/i18n/use-language";
import { PLACES_SCHEMA } from "../../lib/url-state/schemas";
import { useUrlState } from "../../lib/url-state/use-url-state";
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

/** Lowercase without accents, so "cienaga" finds "Ciénaga". */
function fold(text: string): string {
	return text
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase();
}

function matchesSearch(place: Place, query: string): boolean {
	if (!query) return true;
	const haystack = fold(
		`${place.name} ${place.neighborhood} ${place.description}`,
	);
	return fold(query)
		.split(/\s+/)
		.every((word) => haystack.includes(word));
}

export function PlacesPage({ aiHref }: { aiHref?: string }) {
	const t = useT();
	const [params, setParams] = useUrlState(PLACES_SCHEMA);
	const filter: KindFilter = params.tipo || "all";
	const setFilter = (value: KindFilter) =>
		setParams({ tipo: value === "all" ? "" : value });
	const query = params.q.trim();
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

			<div>
				<label htmlFor="places-search" className="q-sr">
					{t.places.searchLabel}
				</label>
				<div className="q-search">
					<Search
						size={20}
						aria-hidden="true"
						className="ml-2 shrink-0 text-[var(--ink-muted)]"
					/>
					<input
						id="places-search"
						type="search"
						value={params.q}
						onChange={(event) => setParams({ q: event.target.value })}
						placeholder={t.places.searchPlaceholder}
						autoComplete="off"
					/>
				</div>
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
					const visible = places.filter(
						(place) =>
							(filter === "all" || place.kind === filter) &&
							matchesSearch(place, query),
					);
					if (visible.length === 0)
						return (
							<EmptyState
								illustration="/illustrations/among-nature.svg"
								title={t.places.emptyTitle}
								action={
									<button
										type="button"
										className="q-btn q-btn--secondary"
										onClick={() => setParams({ q: "", tipo: "" })}
									>
										{t.places.seeAll}
									</button>
								}
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
