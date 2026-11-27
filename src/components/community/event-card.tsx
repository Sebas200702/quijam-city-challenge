// Link card for one event in the agenda and other lists.

import { CalendarClock, MapPin, Users } from "lucide-react";
import {
	EVENT_CATEGORY_LABELS,
	formatCop,
	formatEventDay,
	formatTimeRange,
} from "../../lib/community/community-labels";
import { spotsLeft } from "../../lib/community/community-rules";
import type { CommunityEvent } from "../../lib/community/community-types";
import type { Language } from "../../lib/i18n/languages";
import type { Messages } from "../../lib/i18n/messages";
import { useLanguage, useT } from "../../lib/i18n/use-language";
import { HeldBadge } from "./community-ui";
import { VerifiedOrganizerBadge } from "./trust-badges";

import "../../styles/life-events.css";

/** Stub colour of the ticket, one per category so neighbours differ. */
const TONES = ["", "ev-ticket--green", "ev-ticket--red", "ev-ticket--ink"];
const CATEGORY_ORDER: string[] = Object.keys(EVENT_CATEGORY_LABELS);

const TIME_ZONE = "America/Bogota";
const LOCALES: Record<Language, string> = {
	es: "es-CO",
	en: "en-US",
	pt: "pt-BR",
	fr: "fr-FR",
};

function DateBlock({ iso }: { iso: string }) {
	const locale = LOCALES[useLanguage()];
	const date = new Date(iso);
	const dayNumber = new Intl.DateTimeFormat(locale, {
		timeZone: TIME_ZONE,
		day: "numeric",
	});
	const monthShort = new Intl.DateTimeFormat(locale, {
		timeZone: TIME_ZONE,
		month: "short",
	});
	return (
		<div aria-hidden="true" className="ev-ticket__stub">
			<span className="ev-ticket__day">{dayNumber.format(date)}</span>
			<span className="ev-ticket__month">
				{monthShort.format(date).replace(/\./g, "")}
			</span>
			<span className="q-star" />
		</div>
	);
}

function spotsText(
	event: CommunityEvent,
	t: Messages,
): {
	text: string;
	tone: "neutral" | "alert" | "live";
} {
	if (event.status === "cancelled")
		return { text: t.agenda.cancelled, tone: "alert" };
	const left = spotsLeft(event);
	if (left === null) return { text: t.agenda.spotsUnlimited, tone: "neutral" };
	if (left === 0) return { text: t.agenda.spotsSoldOut, tone: "alert" };
	return {
		text: t.agenda.spotsLeft(left),
		tone: left <= 5 ? "live" : "neutral",
	};
}

export function EventCard({
	event,
	placeName,
	registered,
}: {
	event: CommunityEvent;
	placeName?: string | null;
	registered?: boolean;
}) {
	const t = useT();
	const spots = spotsText(event, t);
	const where = placeName ?? event.locationText ?? t.agenda.placeTbd;
	const cancelled = event.status === "cancelled";
	const tone =
		TONES[Math.max(CATEGORY_ORDER.indexOf(event.category), 0) % TONES.length];
	return (
		<a
			href={`/agenda/${encodeURIComponent(event.id)}`}
			className={`ev-ticket ${tone} ${cancelled ? "ev-ticket--off" : ""}`}
			aria-label={`${event.title}, ${formatEventDay(event.startsAt)}`}
		>
			<div className="ev-ticket__paper">
			<DateBlock iso={event.startsAt} />
			<div className="ev-ticket__body">
				<div className="flex flex-wrap items-center gap-1.5">
					<span className="q-eyebrow">
						{EVENT_CATEGORY_LABELS[event.category]}
					</span>
					{event.moderationStatus === "held" && <HeldBadge />}
					<VerifiedOrganizerBadge verified={event.organizerVerified} />
					{registered && !cancelled && (
						<span className="q-badge q-badge--optimal">
							{t.agenda.registered}
						</span>
					)}
				</div>
				<h3 className={`ev-ticket__title ${cancelled ? "line-through" : ""}`}>
					{event.title}
				</h3>
				<p className="q-sm q-muted flex items-center gap-1.5">
					<CalendarClock size={14} aria-hidden="true" className="shrink-0" />
					<span>
						{formatEventDay(event.startsAt)} ·{" "}
						{formatTimeRange(event.startsAt, event.endsAt)}
					</span>
				</p>
				<p className="q-sm q-muted flex items-center gap-1.5">
					<MapPin size={14} aria-hidden="true" className="shrink-0" />
					<span className="truncate">{where}</span>
				</p>
				<div className="flex flex-wrap items-center gap-1.5 pt-1">
					<span className={`q-badge q-badge--${spots.tone}`}>
						<Users size={12} aria-hidden="true" />
						{spots.text}
					</span>
					<span className="q-badge q-badge--neutral">
						{event.isFree || !event.priceCop
							? t.agenda.free
							: formatCop(event.priceCop)}
					</span>
				</div>
			</div>
			</div>
		</a>
	);
}
