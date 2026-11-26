// Agenda: upcoming community events grouped by day, with search and categories.

import { Plus, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { EVENT_CATEGORY_LABELS } from "../../lib/community/community-labels";
import { isoToBogotaLocal } from "../../lib/community/community-rules";
import type {
	CommunityEvent,
	EventCategory,
} from "../../lib/community/community-types";
import { AskQuillartButton } from "../assistant/ask-quillart-button";
import { CommunityShell } from "./community-shell";
import { EmptyState, Loaded, PageTitle } from "./community-ui";
import { EventCard } from "./event-card";
import { useLoad, useSession } from "./use-community";

const CATEGORIES = Object.keys(EVENT_CATEGORY_LABELS) as EventCategory[];
const DAY_MS = 24 * 60 * 60 * 1000;

interface EventGroup {
	title: string;
	events: CommunityEvent[];
}

/** Days between today and the event, both counted in Barranquilla time. */
function daysFromToday(iso: string, now: Date): number {
	const day = (value: string) =>
		Date.parse(`${isoToBogotaLocal(value).slice(0, 10)}T00:00:00Z`);
	return Math.round((day(iso) - day(now.toISOString())) / DAY_MS);
}

function groupEvents(events: CommunityEvent[], now: Date): EventGroup[] {
	const groups: EventGroup[] = [
		{ title: "Hoy y mañana", events: [] },
		{ title: "Esta semana", events: [] },
		{ title: "Más adelante", events: [] },
	];
	for (const event of events) {
		const days = daysFromToday(event.startsAt, now);
		const index = days <= 1 ? 0 : days <= 6 ? 1 : 2;
		groups[index].events.push(event);
	}
	return groups.filter((group) => group.events.length > 0);
}

function useDebounced<T>(value: T, delay = 250): T {
	const [debounced, setDebounced] = useState(value);
	useEffect(() => {
		const timer = window.setTimeout(() => setDebounced(value), delay);
		return () => window.clearTimeout(timer);
	}, [value, delay]);
	return debounced;
}

export interface AgendaPageProps {
	aiHref?: string;
}

export default function AgendaPage({ aiHref }: AgendaPageProps) {
	const { profile } = useSession();
	const [search, setSearch] = useState("");
	const [category, setCategory] = useState<EventCategory | null>(null);
	const query = useDebounced(search.trim());

	const { state } = useLoad(
		async (store) => {
			const [events, places, registrations] = await Promise.all([
				store.listEvents({ category: category ?? undefined, search: query }),
				store.listPlaces(),
				store.myRegistrations(),
			]);
			return {
				events,
				placeNames: new Map(places.map((place) => [place.id, place.name])),
				registered: new Set(registrations),
			};
		},
		[category, query, profile?.id],
		["events"],
	);

	const filtering = query !== "" || category !== null;
	const publishLink = (
		<a href="/agenda/nuevo" className="q-btn q-btn--primary">
			<Plus size={18} aria-hidden="true" />
			Publicar evento
		</a>
	);

	return (
		<CommunityShell current="agenda" aiHref={aiHref}>
			<PageTitle
				eyebrow="Agenda"
				title="Planes en Barranquilla"
				illustration="/illustrations/events-calendar.svg"
				action={publishLink}
			>
				Lo que la comunidad organiza en parques, barrios y el río.
			</PageTitle>

			<div className="flex flex-wrap items-center gap-3">
				<AskQuillartButton prompt="¿Qué planes hay este fin de semana?" />
			</div>

			<section aria-label="Buscar eventos" className="space-y-3">
				<label htmlFor="agenda-search" className="q-sr">
					Buscar eventos
				</label>
				<div className="q-search">
					<Search
						size={20}
						aria-hidden="true"
						className="ml-2 shrink-0 text-[var(--ink-muted)]"
					/>
					<input
						id="agenda-search"
						type="search"
						value={search}
						onChange={(event) => setSearch(event.target.value)}
						placeholder="Busca un plan: salsa, caminata, taller…"
						autoComplete="off"
					/>
				</div>
				<fieldset
					className="-mx-4 flex min-w-0 gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:px-0"
					aria-label="Filtrar por categoría"
				>
					<legend className="q-sr">Categoría</legend>
					<CategoryChip
						label="Todos"
						active={category === null}
						onClick={() => setCategory(null)}
					/>
					{CATEGORIES.map((item) => (
						<CategoryChip
							key={item}
							label={EVENT_CATEGORY_LABELS[item]}
							active={category === item}
							onClick={() => setCategory(category === item ? null : item)}
						/>
					))}
				</fieldset>
			</section>

			<Loaded state={state} loadingLabel="Buscando planes…">
				{({ events, placeNames, registered }) => {
					if (events.length === 0) {
						return filtering ? (
							<EmptyState
								title="No encontramos planes con ese filtro"
								illustration="/illustrations/the-search.svg"
								action={
									<button
										type="button"
										className="q-btn q-btn--secondary"
										onClick={() => {
											setSearch("");
											setCategory(null);
										}}
									>
										Ver todos los planes
									</button>
								}
							>
								Prueba con otra palabra u otra categoría.
							</EmptyState>
						) : (
							<EmptyState
								title="Todavía no hay planes en la agenda"
								illustration="/illustrations/celebration.svg"
								action={publishLink}
							>
								¿Organizas algo en tu barrio? Publícalo y la ciudad se entera.
							</EmptyState>
						);
					}
					return (
						<div className="space-y-6">
							{groupEvents(events, new Date()).map((group) => (
								<section key={group.title} className="space-y-3">
									<h2 className="q-h2">{group.title}</h2>
									<ul className="grid gap-3 lg:grid-cols-2">
										{group.events.map((event) => (
											<li key={event.id} className="grid">
												<EventCard
													event={event}
													placeName={
														event.placeId
															? (placeNames.get(event.placeId) ?? null)
															: null
													}
													registered={registered.has(event.id)}
												/>
											</li>
										))}
									</ul>
								</section>
							))}
						</div>
					);
				}}
			</Loaded>
		</CommunityShell>
	);
}

function CategoryChip({
	label,
	active,
	onClick,
}: {
	label: string;
	active: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			aria-pressed={active}
			onClick={onClick}
			className="q-chip shrink-0"
			style={
				active
					? { background: "var(--action)", color: "var(--on-action)" }
					: undefined
			}
		>
			{label}
		</button>
	);
}
