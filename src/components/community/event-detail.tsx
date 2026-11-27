// One event: details, registration, organizer tools and related conversations.

import {
	ArrowLeft,
	CalendarClock,
	MapPin,
	MessageCirclePlus,
	Navigation,
	Share2,
	Ticket,
	UserRound,
	Users,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import { EVENT_ILLUSTRATIONS } from "../../lib/community/community-illustrations";
import {
	directionsUrl,
	EVENT_CATEGORY_LABELS,
	formatCop,
	formatEventLongDay,
	formatTimeRange,
} from "../../lib/community/community-labels";
import {
	canJoinWaitlist,
	isPastEvent,
	registrationBlocker,
	spotsLeft,
} from "../../lib/community/community-rules";
import type {
	CommunityEvent,
	ForumThread,
	Place,
	Profile,
} from "../../lib/community/community-types";
import { useT } from "../../lib/i18n/use-language";
import { usePublishScreen } from "../agent-dock/use-screen-context";
import { AskQuillartButton } from "../assistant/ask-quillart-button";
import { CommunityShell } from "./community-shell";
import {
	EmptyState,
	ErrorNote,
	HeldBadge,
	Loaded,
	SpotIllustration,
} from "./community-ui";
import { ReportButton } from "./report-button";
import { ThreadCard } from "./thread-card";
import { VerifiedOrganizerBadge } from "./trust-badges";
import { signInHref, useLoad, useSession, useStore } from "./use-community";

export interface EventDetailProps {
	id: string;
	aiHref?: string;
}

export default function EventDetail({ id, aiHref }: EventDetailProps) {
	const t = useT();
	const { profile, loading: sessionLoading } = useSession();
	const { state, reload } = useLoad(
		async (store) => {
			const event = await store.getEvent(id);
			if (!event) return null;
			const [places, registrations, waitlist, threads] = await Promise.all([
				event.placeId ? store.listPlaces() : Promise.resolve([] as Place[]),
				store.myRegistrations(),
				store.myWaitlist(),
				store.listThreads({ eventId: event.id }),
			]);
			return {
				event,
				place: places.find((place) => place.id === event.placeId) ?? null,
				registered: registrations.includes(event.id),
				waitlisted: waitlist.includes(event.id),
				threads,
			};
		},
		[id, profile?.id],
		["events", "forum"],
	);
	const shown = state.status === "ready" ? state.data : null;
	usePublishScreen(
		shown
			? {
					route: "/agenda/[id]",
					title: shown.event.title,
					entity: {
						kind: "event",
						id: shown.event.id,
						name: shown.event.title,
					},
					...(shown.place ? { zone: shown.place.neighborhood } : {}),
				}
			: null,
	);

	return (
		<CommunityShell current="agenda" aiHref={aiHref}>
			<a href="/agenda" className="q-btn q-btn--ghost self-start">
				<ArrowLeft size={18} aria-hidden="true" />
				{t.agenda.backToAgenda}
			</a>
			<Loaded state={state} loadingLabel={t.agenda.loadingEvent}>
				{(data) =>
					data ? (
						<EventView
							{...data}
							profile={profile}
							sessionLoading={sessionLoading}
							onChange={reload}
						/>
					) : (
						<EmptyState
							title={t.agenda.notFoundTitle}
							illustration="/illustrations/page-not-found.svg"
							action={
								<a href="/agenda" className="q-btn q-btn--primary">
									{t.agenda.seeAgenda}
								</a>
							}
						>
							{t.agenda.notFoundText}
						</EmptyState>
					)
				}
			</Loaded>
		</CommunityShell>
	);
}

interface EventViewProps {
	event: CommunityEvent;
	place: Place | null;
	registered: boolean;
	waitlisted: boolean;
	threads: ForumThread[];
	profile: Profile | null;
	sessionLoading: boolean;
	onChange: () => void;
}

function EventView({
	event,
	place,
	registered,
	waitlisted,
	threads,
	profile,
	sessionLoading,
	onChange,
}: EventViewProps) {
	const t = useT();
	const isOrganizer = !!profile && profile.id === event.organizerId;
	const cancelled = event.status === "cancelled";
	const where = place?.name ?? event.locationText ?? t.agenda.placeTbd;

	return (
		<>
			<article className="q-card space-y-4 p-5 lg:p-8">
				<div className="q-illus py-5">
					<SpotIllustration
						src={EVENT_ILLUSTRATIONS[event.category]}
						className="h-36! lg:h-56!"
					/>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<span className="q-badge q-badge--event">
						{EVENT_CATEGORY_LABELS[event.category]}
					</span>
					{event.moderationStatus === "held" && <HeldBadge />}
					{cancelled && (
						<span className="q-badge q-badge--alert">{t.agenda.cancelled}</span>
					)}
					{registered && !cancelled && (
						<span className="q-badge q-badge--optimal">
							{t.agenda.registered}
						</span>
					)}
				</div>
				<h1 className={`q-h1 break-words ${cancelled ? "line-through" : ""}`}>
					{event.title}
				</h1>
				{event.moderationStatus === "held" && (
					<p className="q-sm rounded-[var(--radius-md)] bg-[var(--gold-soft)] px-4 py-2 text-[var(--gold-text)]">
						{t.agenda.heldNote}
					</p>
				)}

				<dl className="space-y-3">
					<InfoRow icon={<CalendarClock size={18} />} label={t.agenda.when}>
						{formatEventLongDay(event.startsAt)}
						<br />
						{formatTimeRange(event.startsAt, event.endsAt)}
					</InfoRow>
					<InfoRow icon={<MapPin size={18} />} label={t.agenda.where}>
						{place ? (
							<a
								href={`/lugares/${encodeURIComponent(place.slug)}`}
								className="font-semibold text-[var(--ink)]"
							>
								{place.name}
							</a>
						) : (
							where
						)}
						{place && <span className="q-muted"> · {place.neighborhood}</span>}
					</InfoRow>
					<InfoRow icon={<UserRound size={18} />} label={t.agenda.organizer}>
						<span className="inline-flex flex-wrap items-center gap-2">
							{event.organizerName}
							<VerifiedOrganizerBadge verified={event.organizerVerified} />
						</span>
					</InfoRow>
					<InfoRow icon={<Ticket size={18} />} label={t.agenda.entry}>
						{event.isFree || !event.priceCop
							? t.agenda.free
							: formatCop(event.priceCop)}
					</InfoRow>
				</dl>

				{!cancelled && <Capacity event={event} />}

				<p className="q-p whitespace-pre-line break-words">
					{event.description}
				</p>

				<div className="flex flex-wrap gap-3">
					{place && (
						<a
							href={directionsUrl(place.name, place.latitude, place.longitude)}
							target="_blank"
							rel="noopener noreferrer"
							className="q-btn q-btn--secondary"
						>
							<Navigation size={18} aria-hidden="true" />
							{t.agenda.directions}
						</a>
					)}
					<ShareButton title={event.title} />
					<AskQuillartButton
						prompt={t.agenda.askDirectionsPrompt(event.title)}
					/>
				</div>
				<ReportButton kind="event" id={event.id} ownerId={event.organizerId} />
			</article>

			{isOrganizer ? (
				<OrganizerPanel event={event} onChange={onChange} />
			) : (
				<RegistrationPanel
					event={event}
					registered={registered}
					waitlisted={waitlisted}
					signedIn={!!profile}
					sessionLoading={sessionLoading}
					onChange={onChange}
				/>
			)}

			<section className="space-y-3" aria-labelledby="event-threads">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<h2 id="event-threads" className="q-h2">
						{t.agenda.conversations}
					</h2>
					<a
						href={`/foro?nuevo=1&evento=${encodeURIComponent(event.id)}`}
						className="q-btn q-btn--secondary"
					>
						<MessageCirclePlus size={18} aria-hidden="true" />
						{t.agenda.talkAboutEvent}
					</a>
				</div>
				{threads.length === 0 ? (
					<p className="q-p q-muted">{t.agenda.noConversations}</p>
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
		</>
	);
}

function InfoRow({
	icon,
	label,
	children,
}: {
	icon: ReactNode;
	label: string;
	children: ReactNode;
}) {
	return (
		<div className="flex gap-3">
			<span
				aria-hidden="true"
				className="mt-0.5 shrink-0 text-[var(--gold-text)]"
			>
				{icon}
			</span>
			<div className="min-w-0">
				<dt className="q-eyebrow">{label}</dt>
				<dd className="q-p break-words">{children}</dd>
			</div>
		</div>
	);
}

function Capacity({ event }: { event: CommunityEvent }) {
	const t = useT();
	const left = spotsLeft(event);
	const people = t.agenda.peopleRegistered(event.registeredCount);
	if (event.capacity === null || left === null) {
		return (
			<p className="q-sm q-muted flex items-center gap-2">
				<Users size={16} aria-hidden="true" />
				{people} · {t.agenda.unlimitedSuffix}
			</p>
		);
	}
	const ratio = Math.min(event.registeredCount / event.capacity, 1);
	const tone = left === 0 ? "red" : left <= 5 ? "gold" : "green";
	const state = left === 0 ? t.agenda.spotsSoldOut : t.agenda.spotsLeft(left);
	return (
		<div className={`q-meter q-meter--${tone}`}>
			<div className="q-meter__head">
				<span>
					<b>{event.registeredCount}</b> {t.agenda.spotsOutOf(event.capacity)}
				</span>
				<span className="q-meter__state font-semibold">{state}</span>
			</div>
			<div
				className="q-meter__track"
				role="progressbar"
				aria-label={t.agenda.spotsTaken}
				aria-valuemin={0}
				aria-valuemax={event.capacity}
				aria-valuenow={event.registeredCount}
			>
				<div
					className="q-meter__fill"
					style={{ width: `${Math.round(ratio * 100)}%` }}
				/>
			</div>
		</div>
	);
}

function RegistrationPanel({
	event,
	registered,
	waitlisted,
	signedIn,
	sessionLoading,
	onChange,
}: {
	event: CommunityEvent;
	registered: boolean;
	waitlisted: boolean;
	signedIn: boolean;
	sessionLoading: boolean;
	onChange: () => void;
}) {
	const t = useT();
	const store = useStore();
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const blocker =
		registrationBlocker(event) ??
		(event.moderationStatus === "held"
			? t.agenda.registrationOpensAfterApproval
			: null);

	async function toggle() {
		setBusy(true);
		setError(null);
		try {
			if (registered) await store.unregister(event.id);
			else if (waitlisted) await store.leaveWaitlist(event.id);
			else if (canJoinWaitlist(event)) await store.joinWaitlist(event.id);
			else await store.register(event.id);
			onChange();
		} catch (err) {
			setError(err instanceof Error ? err.message : t.agenda.saveError);
		} finally {
			setBusy(false);
		}
	}

	if (sessionLoading) return null;

	let content: ReactNode;
	if (!signedIn) {
		content = blocker ? (
			<p className="q-p q-muted">{blocker}</p>
		) : (
			<a href={signInHref()} className="q-btn q-btn--primary q-btn--block">
				{t.agenda.signInToRegister}
			</a>
		);
	} else if (registered) {
		const canLeave = !isPastEvent(event) && event.status !== "cancelled";
		content = (
			<>
				<p className="q-p">{t.agenda.registeredText}</p>
				{canLeave && (
					<button
						type="button"
						className="q-btn q-btn--secondary q-btn--block"
						onClick={() => void toggle()}
						disabled={busy}
					>
						{busy ? t.agenda.cancelling : t.agenda.cancelRegistration}
					</button>
				)}
			</>
		);
	} else if (waitlisted) {
		content = (
			<>
				<p className="q-p">{t.agenda.waitlistText}</p>
				<button
					type="button"
					className="q-btn q-btn--secondary q-btn--block"
					onClick={() => void toggle()}
					disabled={busy}
				>
					{busy ? t.agenda.leavingWaitlist : t.agenda.leaveWaitlist}
				</button>
			</>
		);
	} else if (canJoinWaitlist(event)) {
		content = (
			<>
				<p className="q-p q-muted">{t.agenda.waitlistHint}</p>
				<button
					type="button"
					className="q-btn q-btn--primary q-btn--block"
					onClick={() => void toggle()}
					disabled={busy}
				>
					{busy ? t.agenda.joiningWaitlist : t.agenda.joinWaitlist}
				</button>
			</>
		);
	} else if (blocker) {
		content = <p className="q-p q-muted">{blocker}</p>;
	} else {
		content = (
			<button
				type="button"
				className="q-btn q-btn--primary q-btn--block"
				onClick={() => void toggle()}
				disabled={busy}
			>
				{busy ? t.agenda.registering : t.agenda.register}
			</button>
		);
	}

	return (
		<section
			className="q-card space-y-3 p-5"
			aria-label={t.agenda.registrationLabel}
		>
			{content}
			{error && <ErrorNote message={error} />}
		</section>
	);
}

function OrganizerPanel({
	event,
	onChange,
}: {
	event: CommunityEvent;
	onChange: () => void;
}) {
	const t = useT();
	const store = useStore();
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const cancelled = event.status === "cancelled";
	const people = t.agenda.peopleRegistered(event.registeredCount);

	async function cancel() {
		if (!window.confirm(t.agenda.cancelConfirm)) return;
		setBusy(true);
		setError(null);
		try {
			await store.cancelEvent(event.id);
			onChange();
		} catch (err) {
			setError(err instanceof Error ? err.message : t.agenda.cancelEventError);
		} finally {
			setBusy(false);
		}
	}

	return (
		<section
			className="q-card space-y-3 p-5"
			aria-label={t.agenda.yourEventLabel}
		>
			<p className="q-eyebrow">{t.agenda.youOrganize}</p>
			<p className="q-h3">{people}</p>
			{cancelled ? (
				<p className="q-p q-muted">{t.agenda.youCancelled}</p>
			) : (
				!isPastEvent(event) && (
					<button
						type="button"
						className="q-btn q-btn--alert q-btn--block"
						onClick={() => void cancel()}
						disabled={busy}
					>
						{busy ? t.agenda.cancelling : t.agenda.cancelEvent}
					</button>
				)
			)}
			{error && <ErrorNote message={error} />}
		</section>
	);
}

function ShareButton({ title }: { title: string }) {
	const t = useT();
	const [copied, setCopied] = useState(false);

	async function share() {
		const url = window.location.href;
		if (navigator.share) {
			try {
				await navigator.share({ title, text: title, url });
				return;
			} catch (err) {
				if (err instanceof DOMException && err.name === "AbortError") return;
			}
		}
		try {
			await navigator.clipboard.writeText(url);
			setCopied(true);
			window.setTimeout(() => setCopied(false), 2500);
		} catch {
			window.prompt(t.agenda.copyLinkPrompt, url);
		}
	}

	return (
		<button
			type="button"
			className="q-btn q-btn--secondary"
			onClick={() => void share()}
		>
			<Share2 size={18} aria-hidden="true" />
			<span aria-live="polite">
				{copied ? t.agenda.linkCopied : t.agenda.share}
			</span>
		</button>
	);
}
