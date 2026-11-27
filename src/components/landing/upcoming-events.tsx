// Next three events from the community agenda, loaded in the browser.

import { CalendarPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { getCommunityStore } from "../../lib/community/community-store";
import type { CommunityEvent } from "../../lib/community/community-types";
import { useT } from "../../lib/i18n/use-language";
import { EventCard } from "../community/event-card";

type State =
	| { status: "loading" }
	| { status: "error" }
	| {
			status: "ready";
			events: CommunityEvent[];
			placeNames: Map<string, string>;
	  };

const EVENT_LIMIT = 3;

export function UpcomingEvents() {
	const t = useT();
	const [state, setState] = useState<State>({ status: "loading" });

	useEffect(() => {
		let active = true;
		const store = getCommunityStore();
		Promise.all([store.listEvents({ limit: EVENT_LIMIT }), store.listPlaces()])
			.then(([events, places]) => {
				if (!active) return;
				setState({
					status: "ready",
					events: events.slice(0, EVENT_LIMIT),
					placeNames: new Map(places.map((place) => [place.id, place.name])),
				});
			})
			.catch(() => active && setState({ status: "error" }));
		return () => {
			active = false;
		};
	}, []);

	if (state.status === "loading") {
		return (
			<ul
				className="m-0 grid list-none gap-4 p-0 lg:grid-cols-3"
				aria-busy="true"
			>
				{Array.from({ length: EVENT_LIMIT }, (_, index) => (
					<li
						// biome-ignore lint/suspicious/noArrayIndexKey: static placeholders.
						key={index}
						className="h-[148px] animate-pulse rounded-[var(--radius-lg)] bg-[var(--surface)] shadow-[var(--shadow-card)]"
					>
						<span className="q-sr">{t.landing.upcoming.loading}</span>
					</li>
				))}
			</ul>
		);
	}

	if (state.status === "error" || state.events.length === 0) {
		return (
			<div className="q-card items-start gap-3 p-5">
				<p className="q-p">
					{state.status === "error"
						? t.landing.upcoming.error
						: t.landing.upcoming.empty}
				</p>
				<div className="flex flex-wrap gap-2">
					<a href="/agenda" className="q-btn q-btn--secondary">
						{t.landing.upcoming.viewAgenda}
					</a>
					<a href="/agenda/nuevo" className="q-btn q-btn--ghost">
						<CalendarPlus size={18} strokeWidth={1.75} aria-hidden="true" />
						{t.landing.upcoming.publish}
					</a>
				</div>
			</div>
		);
	}

	return (
		<ul className="m-0 grid list-none gap-4 p-0 lg:grid-cols-3">
			{state.events.map((event) => (
				<li key={event.id} className="flex min-w-0 flex-col [&>a]:flex-1">
					<EventCard
						event={event}
						placeName={
							event.placeId ? state.placeNames.get(event.placeId) : null
						}
					/>
				</li>
			))}
		</ul>
	);
}
