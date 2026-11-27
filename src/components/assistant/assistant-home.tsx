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

/** Tone and shape of each section's icon chip: no two neighbours match. */
const SECTION_CHIPS = [
	"q-tile--gold l-ico--circle",
	"q-tile--green l-ico--hex",
	"q-tile--red l-ico--shield",
	"q-tile--gold l-ico--octagon",
];

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
				<h2
					id="today-title"
					className="q-h2 lg:text-[32px]! lg:leading-[36px]! lg:tracking-[-0.02em]"
				>
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
						<ul className="la-shapes grid gap-3 lg:grid-cols-3">
							{items.map(({ event, place }, index) => (
								<li
									key={event.id}
									className="l-rise min-w-0"
									style={{ ["--i" as string]: index }}
								>
									<a
										href={`/agenda/${encodeURIComponent(event.id)}`}
										className="q-card la-lift h-full min-h-11 items-start gap-1.5 px-5 py-4 text-left text-inherit no-underline lg:hover:shadow-[var(--glow-gold)]"
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
			className="la-nav grid grid-cols-2 gap-2 lg:grid-cols-4"
		>
			{sections(t).map((section, index) => (
				<a
					key={section.href}
					href={section.href}
					className="q-card la-lift min-h-11 flex-row! items-center gap-2.5 px-3 py-3 text-left text-inherit no-underline lg:gap-3 lg:px-4 lg:hover:shadow-[var(--shadow-modal)]"
				>
					<span
						className={`q-tile h-10! w-10! ${SECTION_CHIPS[index % SECTION_CHIPS.length]}`}
					>
						{section.icon}
					</span>
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
				<div className="relative mt-2 space-y-6">
					<span
						className="l-geo l-geo--tri l-geo--gold top-1 left-[46%] max-lg:hidden"
						aria-hidden="true"
					/>
					<TodayStrip />
					<SectionLinks />
				</div>
			}
		/>
	);
}
