// One public space or natural area: what it is, how to get there and what happens there.

import {
	ArrowLeft,
	CalendarPlus,
	Clock,
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
import { usePublishScreen } from "../agent-dock/use-screen-context";
import { AskQuillartButton } from "../assistant/ask-quillart-button";
import { CommunityShell } from "./community-shell";
import { EmptyState, Loaded, SpotIllustration } from "./community-ui";
import { EventCard } from "./event-card";
import { LazyMiniMap } from "./lazy-maps";
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
	const shown = state.status === "ready" ? state.data : null;
	usePublishScreen(
		shown
			? {
					route: "/lugares/[slug]",
					title: shown.place.name,
					entity: {
						kind: "place",
						id: shown.place.slug,
						name: shown.place.name,
					},
					zone: shown.place.neighborhood,
				}
			: null,
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
							<div className="lq-canvas l-rise grid place-items-center">
								<span
									className="l-geo l-geo--quarter l-geo--green top-0 right-0 rotate-180 opacity-80"
									aria-hidden="true"
								/>
								<span
									className="l-geo l-geo--ring top-6 left-[12%]"
									style={{ ["--i" as string]: 1 }}
									aria-hidden="true"
								/>
								<span
									className="l-geo l-geo--half l-geo--gold bottom-6 left-[24%] -rotate-24 max-lg:hidden"
									style={{ ["--i" as string]: 2 }}
									aria-hidden="true"
								/>
								<span
									className="l-geo l-geo--plus l-geo--ink right-[22%] bottom-8 rotate-12 max-lg:hidden"
									style={{ ["--i" as string]: 3 }}
									aria-hidden="true"
								/>
								<div className="lq-canvas__body lq-art lq-art--leaf">
									<SpotIllustration
										src={PLACE_ILLUSTRATIONS[place.kind]}
										className="h-24! lg:h-40!"
									/>
								</div>
							</div>
							<section className="flex flex-col gap-3">
								<div className="flex items-start gap-4">
									<PlaceKindTile kind={place.kind} />
									<div className="min-w-0">
										<p className="q-eyebrow">
											{PLACE_KIND_LABELS[place.kind]} · {place.neighborhood}
										</p>
										<h1 className="q-h1 lq-title mt-1 break-words">{place.name}</h1>
									</div>
								</div>
								<div className="flex flex-wrap gap-1.5">
									<PlaceBadges place={place} />
								</div>
								{/* Main action above the fold on phones (audit U37). */}
								<div className="flex flex-wrap gap-2">
									{isOnAmbMap(place) ? (
										// In the app: /mapa selects the place and plans the way there.
										<a
											href={mapHref({ lugar: place.slug })}
											className="q-btn q-btn--primary"
										>
											<Navigation size={18} aria-hidden="true" />
											{t.places.directions}
										</a>
									) : (
										// Outside the AMB the app map cannot show it: an outside map can.
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
									)}
									<AskQuillartButton prompt={t.places.askAbout(place.name)} />
								</div>
								{!isOnAmbMap(place) && (
									<p className="q-sm q-muted">{t.places.outsideAmbNote}</p>
								)}
								<p className="q-p">{place.description}</p>
								<dl className="q-card l-rise gap-3 rounded-[28px_64px_28px_28px]! p-5">
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
								{isOnAmbMap(place) && (
									<LazyMiniMap
										latitude={place.latitude}
										longitude={place.longitude}
										name={place.name}
										href={mapHref({ lugar: place.slug })}
										tone="green"
										glyph="place"
									/>
								)}
							</section>

							<section aria-labelledby="place-events" className="space-y-3">
								<div className="flex flex-wrap items-center justify-between gap-2">
									<h2 id="place-events" className="q-h2 lq-h2">
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
									<h2 id="place-threads" className="q-h2 lq-h2">
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
									className="q-card l-rise gap-3 rounded-[64px_28px_64px_28px]! bg-[var(--green-soft)]! px-7 py-6 text-[var(--green-text)]!"
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
