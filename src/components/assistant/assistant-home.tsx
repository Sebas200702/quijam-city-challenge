// The app home: Quillart AI first, with the next events and the sections below
// while the conversation is still empty.

import {
	CalendarDays,
	ChevronRight,
	Map as MapIcon,
	MapPin,
	MessagesSquare,
} from "lucide-react";
import type { ReactNode } from "react";
import {
	formatEventDay,
	formatTime,
} from "../../lib/community/community-labels";
import type { Messages } from "../../lib/i18n/messages";
import { useT } from "../../lib/i18n/use-language";
import { Loaded } from "../community/community-ui";
import { useLoad } from "../community/use-community";
import { AssistantChat } from "./assistant-chat";

function sections(t: Messages): {
	href: string;
	label: string;
	hint: string;
	icon: ReactNode;
}[] {
	return [
		{
			href: "/agenda",
			label: t.nav.agenda,
			hint: t.home.agendaHint,
			icon: <CalendarDays size={20} aria-hidden="true" />,
		},
		{
			href: "/foro",
			label: t.nav.forum,
			hint: t.home.forumHint,
			icon: <MessagesSquare size={20} aria-hidden="true" />,
		},
		{
			href: "/lugares",
			label: t.nav.places,
			hint: t.home.placesHint,
			icon: <MapPin size={20} aria-hidden="true" />,
		},
		{
			href: "/mapa",
			label: t.nav.map,
			hint: t.home.mapHint,
			icon: <MapIcon size={20} aria-hidden="true" />,
		},
	];
}

function TodayStrip() {
	const t = useT();
	const { state } = useLoad(
		async (store) => {
			const [events, places] = await Promise.all([
				store.listEvents({ limit: 3 }),
				store.listPlaces(),
			]);
			const names = new Map(places.map((place) => [place.id, place.name]));
			return events.map((event) => ({
				event,
				place:
					(event.placeId && names.get(event.placeId)) || event.locationText,
			}));
		},
		[],
		["events"],
	);
	return (
		<section aria-labelledby="today-title" className="space-y-3">
			<div className="flex items-center justify-between gap-2">
				<h2 id="today-title" className="q-h2">
					{t.home.upcomingTitle}
				</h2>
				<a
					className="q-sm inline-flex min-h-11 items-center font-semibold text-[var(--ink)]"
					href="/agenda"
				>
					{t.home.seeAgenda}
				</a>
			</div>
			<Loaded state={state} loadingLabel={t.home.searching}>
				{(items) =>
					items.length === 0 ? (
						<p className="q-p q-muted">{t.home.noEvents}</p>
					) : (
						<ul className="grid gap-2 lg:grid-cols-3">
							{items.map(({ event, place }) => (
								<li key={event.id} className="min-w-0">
									<a
										href={`/agenda/${encodeURIComponent(event.id)}`}
										className="q-card h-full min-h-11 items-start gap-1.5 px-4 py-3 text-left text-inherit no-underline transition-shadow lg:hover:shadow-[var(--glow-gold)]"
									>
										<span className="q-badge q-badge--event">
											{formatEventDay(event.startsAt)}
										</span>
										<span className="q-h3 line-clamp-2">{event.title}</span>
										<span className="q-sm q-muted flex w-full items-center gap-1">
											<span className="min-w-0 flex-1 truncate">
												{formatTime(event.startsAt)}
												{place ? ` · ${place}` : ""}
											</span>
											<ChevronRight
												size={18}
												aria-hidden="true"
												className="shrink-0 text-[var(--ink-subtle)]"
											/>
										</span>
									</a>
								</li>
							))}
						</ul>
					)
				}
			</Loaded>
		</section>
	);
}

function SectionLinks() {
	const t = useT();
	return (
		<nav
			aria-label={t.nav.sections}
			className="grid grid-cols-2 gap-2 lg:grid-cols-4"
		>
			{sections(t).map((section) => (
				<a
					key={section.href}
					href={section.href}
					className="q-card min-h-11 flex-row! items-center gap-3 px-4 py-3 text-left text-inherit no-underline"
				>
					<span className="text-[var(--gold-text)]">{section.icon}</span>
					<span className="min-w-0">
						<span className="q-h3 block">{section.label}</span>
						<span className="q-sm q-muted block truncate">{section.hint}</span>
					</span>
				</a>
			))}
		</nav>
	);
}

export function AssistantHome() {
	const t = useT();
	return (
		<AssistantChat
			greeting={t.home.greeting}
			intro={t.home.intro}
			starters={t.home.starters}
			emptyState={
				<div className="mt-2 space-y-6">
					<TodayStrip />
					<SectionLinks />
				</div>
			}
		/>
	);
}
