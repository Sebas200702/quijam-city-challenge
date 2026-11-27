// Agenda: upcoming community events grouped by day, with search, categories
// and a date filter. The filters live in the URL (`?q=&categoria=&cuando=`),
// so they can be shared and Quillart AI can leave the list filtered (U13).

import { Plus, Search } from "lucide-react";
import { useEffect, useState } from "react";
import type { AgendaWhen } from "../../lib/assistant/ui-action-types";
import { EVENT_CATEGORY_LABELS } from "../../lib/community/community-labels";
import type {
	CommunityEvent,
	EventCategory,
} from "../../lib/community/community-types";
import {
	AGENDA_WHEN,
	type AgendaFilters,
	activeFilters,
	daysFromToday,
	filtersSearch,
	matchesWhen,
	NO_AGENDA_FILTERS,
	readAgendaFilters,
} from "../../lib/community/list-filters";
import { useT } from "../../lib/i18n/use-language";
import { AgentMark } from "../agent-dock/agent-mark";
import { usePublishScreen } from "../agent-dock/use-screen-context";
import { useUiAction } from "../agent-dock/use-ui-action";
import { AskQuillartButton } from "../assistant/ask-quillart-button";
import { CommunityShell } from "./community-shell";
import { EmptyState, Loaded, PageTitle } from "./community-ui";
import { EventCard } from "./event-card";
import { useLoad, useSession } from "./use-community";

const CATEGORIES = Object.keys(EVENT_CATEGORY_LABELS) as EventCategory[];

interface EventGroup {
	title: string;
	events: CommunityEvent[];
}

function groupEvents(
	events: CommunityEvent[],
	now: Date,
	titles: [string, string, string],
): EventGroup[] {
	const groups: EventGroup[] = titles.map((title) => ({ title, events: [] }));
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

/** Keeps the address bar in step with the filters, without a new history entry. */
function writeUrl(filters: AgendaFilters) {
	const search = filtersSearch({
		q: filters.q,
		categoria: filters.categoria,
		cuando: filters.cuando,
	});
	window.history.replaceState(
		null,
		"",
		`${window.location.pathname}${search}${window.location.hash}`,
	);
}

export interface AgendaPageProps {
	aiHref?: string;
}

export default function AgendaPage({ aiHref }: AgendaPageProps) {
	const t = useT();
	const { profile } = useSession();
	const [filters, setFilters] = useState<AgendaFilters>(() =>
		readAgendaFilters(window.location.search),
	);
	/** True while the current filters are the ones Quillart AI set. */
	const [byAgent, setByAgent] = useState(false);
	const { q: search, categoria: category, cuando } = filters;
	const query = useDebounced(search.trim());

	const change = (next: Partial<AgendaFilters>, agent = false) => {
		setFilters((current) => ({ ...current, ...next }));
		setByAgent(agent);
	};

	useEffect(() => writeUrl({ ...filters, q: query }), [filters, query]);

	usePublishScreen({
		route: "/agenda",
		title: t.agenda.title,
		filters: activeFilters({ q: query, categoria: category, cuando }),
	});

	useUiAction("agenda.filter", (action) => {
		const before = filters;
		const next: AgendaFilters = {
			q: action.q ?? "",
			categoria: action.categoria ?? null,
			cuando: action.cuando ?? null,
		};
		change(next, true);
		return {
			labels: [
				next.cuando ? t.dock.when[next.cuando] : null,
				next.categoria ? EVENT_CATEGORY_LABELS[next.categoria] : null,
				next.q ? t.dock.searchFor(next.q) : null,
			].filter((label): label is string => label !== null),
			undo: () => change(before),
		};
	});

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

	const filtering = query !== "" || category !== null || cuando !== null;
	const clearFilters = () => change(NO_AGENDA_FILTERS);
	const publishLink = (
		<a href="/agenda/nuevo" className="q-btn q-btn--primary">
			<Plus size={18} aria-hidden="true" />
			{t.agenda.publishEvent}
		</a>
	);

	return (
		<CommunityShell current="agenda" aiHref={aiHref}>
			<PageTitle
				eyebrow={t.agenda.eyebrow}
				title={t.agenda.title}
				illustration="/illustrations/events-calendar.svg"
				action={publishLink}
			>
				{t.agenda.intro}
			</PageTitle>

			<div className="flex flex-wrap items-center gap-3">
				<AskQuillartButton prompt={t.agenda.askPrompt} />
			</div>

			<section aria-label={t.agenda.searchLabel} className="space-y-3">
				<label htmlFor="agenda-search" className="q-sr">
					{t.agenda.searchLabel}
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
						onChange={(event) => change({ q: event.target.value })}
						placeholder={t.agenda.searchPlaceholder}
						autoComplete="off"
					/>
				</div>
				<fieldset
					className="-mx-4 flex min-w-0 gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:px-0"
					aria-label={t.agenda.filterByCategory}
				>
					<legend className="q-sr">{t.agenda.category}</legend>
					<CategoryChip
						label={t.agenda.all}
						active={category === null}
						onClick={() => change({ categoria: null })}
					/>
					{CATEGORIES.map((item) => (
						<CategoryChip
							key={item}
							label={EVENT_CATEGORY_LABELS[item]}
							active={category === item}
							onClick={() =>
								change({ categoria: category === item ? null : item })
							}
						/>
					))}
				</fieldset>
				<WhenChips
					value={cuando}
					onChange={(next) => change({ cuando: next })}
				/>
				{byAgent && filtering && (
					<AgentMark
						text={t.dock.filteredByAgent}
						actionLabel={t.dock.clear}
						onAction={clearFilters}
					/>
				)}
			</section>

			<Loaded state={state} loadingLabel={t.agenda.loading}>
				{({ events: loaded, placeNames, registered }) => {
					const now = new Date();
					const events = loaded.filter((event) =>
						matchesWhen(event.startsAt, cuando, now),
					);
					if (events.length === 0) {
						return filtering ? (
							<EmptyState
								title={t.agenda.emptyFilteredTitle}
								illustration="/illustrations/the-search.svg"
								action={
									<button
										type="button"
										className="q-btn q-btn--secondary"
										onClick={clearFilters}
									>
										{t.agenda.seeAllPlans}
									</button>
								}
							>
								{t.agenda.emptyFilteredText}
							</EmptyState>
						) : (
							<EmptyState
								title={t.agenda.emptyTitle}
								illustration="/illustrations/celebration.svg"
								action={publishLink}
							>
								{t.agenda.emptyText}
							</EmptyState>
						);
					}
					return (
						<div id="agenda-results" className="space-y-6">
							{groupEvents(events, now, [
								t.agenda.groupTodayTomorrow,
								t.agenda.groupThisWeek,
								t.agenda.groupLater,
							]).map((group) => (
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

/** "Hoy", "Este finde", "Esta semana": the date filter (`?cuando=`). */
function WhenChips({
	value,
	onChange,
}: {
	value: AgendaWhen | null;
	onChange: (next: AgendaWhen | null) => void;
}) {
	const t = useT();
	return (
		<fieldset className="-mx-4 flex min-w-0 gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:px-0">
			<legend className="q-sr">{t.dock.whenLegend}</legend>
			{AGENDA_WHEN.map((item) => (
				<CategoryChip
					key={item}
					label={t.dock.when[item]}
					active={value === item}
					onClick={() => onChange(value === item ? null : item)}
				/>
			))}
		</fieldset>
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
