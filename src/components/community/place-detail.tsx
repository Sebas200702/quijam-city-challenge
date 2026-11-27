// One public space or natural area: what it is, how to get there and what happens there.

import {
	ArrowLeft,
	CalendarPlus,
	Clock,
	Map as MapIcon,
	MapPin,
	MessageSquarePlus,
	Navigation,
	Sprout,
} from "lucide-react";
import { PLACE_ILLUSTRATIONS } from "../../lib/community/community-illustrations";
import {
	directionsUrl,
	PLACE_KIND_LABELS,
} from "../../lib/community/community-labels";
import { useT } from "../../lib/i18n/use-language";
import { mapHref } from "../../lib/map/map-url";
import { AskQuillartButton } from "../assistant/ask-quillart-button";
import { CommunityShell } from "./community-shell";
import { EmptyState, Loaded, SpotIllustration } from "./community-ui";
import { EventCard } from "./event-card";
import { isOnAmbMap, PlaceBadges, PlaceKindTile } from "./place-card";
import { ThreadCard } from "./thread-card";
import { useLoad } from "./use-community";

function BackLink() {
	const t = useT();
	return (
		<a
			href="/lugares"
			className="q-btn q-btn--ghost q-btn--sm min-h-11! self-start px-2 no-underline"
		>
			<ArrowLeft size={16} aria-hidden="true" />
			{t.places.allPlaces}
		</a>
	);
}

export function PlaceDetail({
	slug,
	aiHref,
}: {
	slug: string;
	aiHref?: string;
}) {
	const t = useT();
	const { state } = useLoad(
		async (store) => {
			const place = await store.getPlace(slug);
			if (!place) return null;
			const [events, threads] = await Promise.all([
				store.listEvents({ placeId: place.id }),
				store.listThreads({ placeId: place.id }),
			]);
			return { place, events, threads };
		},
		[slug],
		["events", "forum"],
	);

	return (
		<CommunityShell current="places" aiHref={aiHref}>
			<BackLink />
			<Loaded state={state} loadingLabel={t.places.loadingPlace}>
				{(data) => {
					if (!data)
						return (
							<EmptyState
								title={t.places.notFoundTitle}
								illustration="/illustrations/page-not-found.svg"
								action={
									<a href="/lugares" className="q-btn q-btn--primary">
										{t.places.notFoundAction}
									</a>
								}
							>
								{t.places.notFoundText}
							</EmptyState>
						);
					const { place, events, threads } = data;
					const tips =
						t.places.careTips[place.kind as keyof typeof t.places.careTips];
					return (
						<>
							<div className="q-illus py-5">
								<SpotIllustration
									src={PLACE_ILLUSTRATIONS[place.kind]}
									className="h-36! lg:h-56!"
								/>
							</div>
							<section className="flex flex-col gap-3">
								<div className="flex items-start gap-4">
									<PlaceKindTile kind={place.kind} />
									<div className="min-w-0">
										<p className="q-eyebrow">
											{PLACE_KIND_LABELS[place.kind]} · {place.neighborhood}
										</p>
										<h1 className="q-h1 mt-1 break-words">{place.name}</h1>
									</div>
								</div>
								<div className="flex flex-wrap gap-1.5">
									<PlaceBadges place={place} />
								</div>
								<p className="q-p">{place.description}</p>
								<dl className="q-card gap-3 p-4">
									<div className="flex items-start gap-2">
										<dt>
											<MapPin
												size={18}
												aria-hidden="true"
												className="mt-0.5 text-[var(--ink-muted)]"
											/>
											<span className="sr-only">{t.places.address}</span>
										</dt>
										<dd className="q-p">
											{place.address ??
												t.places.defaultAddress(place.neighborhood)}
										</dd>
									</div>
									<div className="flex items-start gap-2">
										<dt>
											<Clock
												size={18}
												aria-hidden="true"
												className="mt-0.5 text-[var(--ink-muted)]"
											/>
											<span className="sr-only">{t.places.hours}</span>
										</dt>
										<dd className="q-p">
											{place.openingHours ?? t.places.openAllDay}
										</dd>
									</div>
								</dl>
								<div className="flex flex-wrap gap-2">
									<a
										href={directionsUrl(
											place.name,
											place.latitude,
											place.longitude,
										)}
										target="_blank"
										rel="noopener noreferrer"
										className="q-btn q-btn--primary"
									>
										<Navigation size={18} aria-hidden="true" />
										{t.places.directions}
										<span className="sr-only">{t.places.opensNewTab}</span>
									</a>
									{isOnAmbMap(place) && (
										<a
											href={mapHref({ lugar: place.slug })}
											className="q-btn q-btn--secondary"
										>
											<MapIcon size={18} aria-hidden="true" />
											{t.places.viewOnMap}
										</a>
									)}
									<AskQuillartButton prompt={t.places.askAbout(place.name)} />
								</div>
								{!isOnAmbMap(place) && (
									<p className="q-sm q-muted">{t.places.outsideAmbNote}</p>
								)}
							</section>

							<section aria-labelledby="place-events" className="space-y-3">
								<div className="flex flex-wrap items-center justify-between gap-2">
									<h2 id="place-events" className="q-h2">
										{t.places.eventsTitle}
									</h2>
									<a
										href={`/agenda/nuevo?lugar=${encodeURIComponent(place.id)}`}
										className="q-btn q-btn--secondary q-btn--sm min-h-11!"
									>
										<CalendarPlus size={16} aria-hidden="true" />
										{t.places.organizeEvent}
									</a>
								</div>
								{events.length === 0 ? (
									<EmptyState
										illustration="/illustrations/events-calendar.svg"
										title={t.places.noEventsTitle}
									>
										{t.places.noEventsText}
									</EmptyState>
								) : (
									<ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
										{events.map((event) => (
											<li key={event.id} className="grid">
												<EventCard event={event} placeName={place.name} />
											</li>
										))}
									</ul>
								)}
							</section>

							<section aria-labelledby="place-threads" className="space-y-3">
								<div className="flex flex-wrap items-center justify-between gap-2">
									<h2 id="place-threads" className="q-h2">
										{t.places.threadsTitle}
									</h2>
									<a
										href={`/foro?nuevo=1&lugar=${encodeURIComponent(place.id)}`}
										className="q-btn q-btn--secondary q-btn--sm min-h-11!"
									>
										<MessageSquarePlus size={16} aria-hidden="true" />
										{t.places.openThread}
									</a>
								</div>
								{threads.length === 0 ? (
									<EmptyState
										illustration="/illustrations/share-opinion.svg"
										title={t.places.noThreadsTitle}
									>
										{t.places.noThreadsText}
									</EmptyState>
								) : (
									<ul className="space-y-3">
										{threads.map((thread) => (
											<li key={thread.id}>
												<ThreadCard thread={thread} />
											</li>
										))}
									</ul>
								)}
							</section>

							{tips && (
								<section
									aria-labelledby="place-care"
									className="q-card gap-3 bg-[var(--green-soft)]! p-5 text-[var(--green-text)]!"
								>
									<h2 id="place-care" className="q-h3 flex items-center gap-2">
										<Sprout size={20} aria-hidden="true" />
										{t.places.careTitle}
									</h2>
									<ul className="q-p list-disc space-y-1.5 pl-5">
										{tips.map((tip) => (
											<li key={tip}>{tip}</li>
										))}
									</ul>
								</section>
							)}
						</>
					);
				}}
			</Loaded>
		</CommunityShell>
	);
}
