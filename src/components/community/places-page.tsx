// "Lugares y naturaleza": the city's public spaces and natural areas. The kind
// filter lives in the URL (`?tipo=`, plus `?q=` from Quillart AI), so it can be
// shared and the agent can leave the list filtered (U13).

import { Map as MapIcon } from "lucide-react";
import { useEffect, useState } from "react";
import type { Place, PlaceKind } from "../../lib/community/community-types";
import {
	activeFilters,
	filtersSearch,
	type PlacesFilters,
	readPlacesFilters,
} from "../../lib/community/list-filters";
import { useT } from "../../lib/i18n/use-language";
import { AgentMark } from "../agent-dock/agent-mark";
import { usePublishScreen } from "../agent-dock/use-screen-context";
import { useUiAction } from "../agent-dock/use-ui-action";
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

function normalize(text: string): string {
	return text
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase();
}

function matchesQuery(place: Place, q: string): boolean {
	if (!q) return true;
	const haystack = normalize(`${place.name} ${place.neighborhood}`);
	return normalize(q)
		.split(/\s+/)
		.filter((word) => word.length >= 3)
		.every((word) => haystack.includes(word));
}

export function PlacesPage({ aiHref }: { aiHref?: string }) {
	const t = useT();
	const [filters, setFilters] = useState<PlacesFilters>(() =>
		readPlacesFilters(window.location.search),
	);
	const [byAgent, setByAgent] = useState(false);
	const filter: KindFilter = filters.tipo ?? "all";

	const change = (next: PlacesFilters, agent = false) => {
		setFilters(next);
		setByAgent(agent);
	};

	useEffect(() => {
		window.history.replaceState(
			null,
			"",
			`${window.location.pathname}${filtersSearch({ tipo: filters.tipo, q: filters.q })}${window.location.hash}`,
		);
	}, [filters]);

	usePublishScreen({
		route: "/lugares",
		title: t.places.title,
		filters: activeFilters({ tipo: filters.tipo, q: filters.q }),
	});

	useUiAction("places.filter", (action) => {
		const before = filters;
		const next = { tipo: action.tipo ?? null, q: action.q ?? "" };
		change(next, true);
		return {
			labels: [
				next.tipo ? t.places.filters[next.tipo] : null,
				next.q ? t.dock.searchFor(next.q) : null,
			].filter((label): label is string => label !== null),
			undo: () => change(before),
		};
	});

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
								onClick={() =>
									change({
										tipo: option === "all" ? null : option,
										q: filters.q,
									})
								}
								className={`q-chip transition-transform lg:hover:-translate-y-0.5 ${on ? "bg-[var(--action)]! text-[var(--on-action)]! shadow-[var(--shadow-card)]" : ""}`}
							>
								{t.places.filters[option]}
							</button>
						);
					})}
				</div>
			</fieldset>
			{byAgent && (filters.tipo || filters.q) && (
				<AgentMark
					text={t.dock.filteredByAgent}
					actionLabel={t.dock.clear}
					onAction={() => change({ tipo: null, q: "" })}
				/>
			)}

			<Loaded state={state} loadingLabel={t.places.loading}>
				{({ places, upcoming }) => {
					const visible = places
						.filter((place) => filter === "all" || place.kind === filter)
						.filter((place) => matchesQuery(place, filters.q));
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
						<ul
							id="places-results"
							className="lq-stagger grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-5"
						>
							{visible.map((place) => (
								<li key={place.id} className="l-rise grid">
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
