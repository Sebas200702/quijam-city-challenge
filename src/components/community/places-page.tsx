// "Lugares y naturaleza": the city's public spaces and natural areas.

import { Map as MapIcon } from "lucide-react";
import { useState } from "react";
import type { PlaceKind } from "../../lib/community/community-types";
import { AskQuillartButton } from "../assistant/ask-quillart-button";
import { CommunityShell } from "./community-shell";
import { EmptyState, Loaded, PageTitle } from "./community-ui";
import { PlaceCard } from "./place-card";
import { useLoad } from "./use-community";

type KindFilter = PlaceKind | "all";

const FILTERS: { value: KindFilter; label: string }[] = [
	{ value: "all", label: "Todos" },
	{ value: "nature", label: "Naturaleza" },
	{ value: "park", label: "Parques" },
	{ value: "waterfront", label: "Río y mar" },
	{ value: "culture", label: "Cultura" },
	{ value: "heritage", label: "Patrimonio" },
	{ value: "sport", label: "Deporte" },
];

export function PlacesPage({ aiHref }: { aiHref?: string }) {
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
				eyebrow="Barranquilla y su área"
				title="Lugares y naturaleza"
				action={
					<a
						href="/mapa"
						className="q-btn q-btn--secondary q-btn--sm min-h-11!"
					>
						<MapIcon size={16} aria-hidden="true" />
						Ver en el mapa
					</a>
				}
			>
				Parques, ciénagas, el río y los espacios de la ciudad. Mira qué pasa en
				cada uno y anímate a ir.
			</PageTitle>

			<div className="flex flex-wrap items-center gap-2">
				<AskQuillartButton
					prompt="Recomiéndame un plan de naturaleza para este fin de semana"
					label="Pídele un plan a Quillart"
				/>
			</div>

			<fieldset>
				<legend className="sr-only">Filtrar por tipo de lugar</legend>
				<div className="flex flex-wrap gap-2">
					{FILTERS.map((option) => {
						const on = filter === option.value;
						return (
							<button
								key={option.value}
								type="button"
								aria-pressed={on}
								onClick={() => setFilter(option.value)}
								className={`q-chip ${on ? "bg-[var(--action)]! text-[var(--on-action)]!" : ""}`}
							>
								{option.label}
							</button>
						);
					})}
				</div>
			</fieldset>

			<Loaded state={state} loadingLabel="Cargando lugares…">
				{({ places, upcoming }) => {
					const visible =
						filter === "all"
							? places
							: places.filter((place) => place.kind === filter);
					if (visible.length === 0)
						return (
							<EmptyState title="No hay lugares de este tipo por ahora">
								Prueba con otro filtro o mira todos los lugares.
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
