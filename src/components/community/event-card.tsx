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
		<div
			aria-hidden="true"
			className="flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-[var(--radius-md)] bg-[var(--gold-soft)] text-[var(--gold-text)]"
		>
			<span className="font-[var(--font-display)] text-2xl leading-none font-bold">
				{dayNumber.format(date)}
			</span>
			<span className="mt-1 text-xs font-semibold uppercase">
				{monthShort.format(date).replace(/\./g, "")}
			</span>
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
	return (
		<a
			href={`/agenda/${encodeURIComponent(event.id)}`}
			className={`q-card flex-row! gap-4 p-4 text-inherit no-underline transition-shadow lg:hover:shadow-[var(--glow-gold)] ${cancelled ? "opacity-70" : ""}`}
			aria-label={`${event.title}, ${formatEventDay(event.startsAt)}`}
		>
			<DateBlock iso={event.startsAt} />
			<div className="min-w-0 flex-1 space-y-1.5">
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
				<h3 className={`q-h3 break-words ${cancelled ? "line-through" : ""}`}>
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
		</a>
	);
}
