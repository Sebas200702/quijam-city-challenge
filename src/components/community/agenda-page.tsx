// Agenda: upcoming community events grouped by day, with search, categories
// and a date filter. The filters live in the URL (?q=&categoria=&fecha=) so a
// link or Quillart AI can open the agenda already filtered.

import { Plus, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { matchesWhen } from "../../lib/community/agenda-when";
import {
	EVENT_CATEGORY_LABELS,
	formatEventDay,
} from "../../lib/community/community-labels";
import { isoToBogotaLocal } from "../../lib/community/community-rules";
import type {
	CommunityEvent,
	EventCategory,
} from "../../lib/community/community-types";
import { useT } from "../../lib/i18n/use-language";
import { AGENDA_SCHEMA } from "../../lib/url-state/schemas";
import { useUrlState } from "../../lib/url-state/use-url-state";
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

export interface AgendaPageProps {
	aiHref?: string;
}

export default function AgendaPage({ aiHref }: AgendaPageProps) {
	const t = useT();
	const { profile } = useSession();
	const [filters, setFilters] = useUrlState(AGENDA_SCHEMA);
	const search = filters.q;
	const category: EventCategory | null = filters.categoria || null;
	const when = filters.fecha;
	const setCategory = (value: EventCategory | null) =>
		setFilters({ categoria: value ?? "" });
	const setWhen = (value: string) =>
		setFilters({ fecha: value === when ? "" : value });
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

	const filtering = query !== "" || category !== null || when !== "";
	const whenOptions: [string, string][] = [
		["hoy", t.agenda.whenToday],
		["manana", t.agenda.whenTomorrow],
		["finde", t.agenda.whenWeekend],
	];
	if (/^\d{4}-/.test(when))
		whenOptions.push([when, formatEventDay(`${when}T17:00:00Z`)]);
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
						onChange={(event) => setFilters({ q: event.target.value })}
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
				<fieldset
					className="-mx-4 flex min-w-0 gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:px-0"
					aria-label={t.agenda.filterByDate}
				>
					<legend className="q-sr">{t.agenda.when}</legend>
					<CategoryChip
						label={t.agenda.whenAny}
						active={when === ""}
						onClick={() => setFilters({ fecha: "" })}
					/>
					{whenOptions.map(([value, label]) => (
						<CategoryChip
							key={value}
							label={label}
							active={when === value}
							onClick={() => setWhen(value)}
						/>
					))}
				</fieldset>
			</section>

			<Loaded state={state} loadingLabel={t.agenda.loading}>
				{({ events: loaded, placeNames, registered }) => {
					const events = loaded.filter((event) =>
						matchesWhen(event.startsAt, when),
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
										onClick={() =>
											setFilters({ q: "", categoria: "", fecha: "" })
										}
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
						<div className="space-y-6">
							{groupEvents(events, new Date(), [
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
