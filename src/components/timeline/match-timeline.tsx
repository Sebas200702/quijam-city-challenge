import { CalendarDays, ChevronUp, Clock, Pause, Play } from "lucide-react";
import { type CSSProperties, useEffect, useId, useRef, useState } from "react";
import { useLanguage, useT } from "../../lib/i18n/use-language";
import {
	formatHour,
	hourToPercent,
	MATCH_DAY_END,
	MATCH_DAY_START,
} from "../../lib/timeline/timeline";
import { markHours, marksAtHour } from "../../lib/timeline/timeline-agenda";
import type { AgendaDay, AgendaMark } from "../../lib/timeline/timeline-types";
import { type AgendaStatus, useAgendaDay } from "./use-agenda-day";
import { useMatchTimeline } from "./use-match-timeline";
import "./match-timeline.css";

const ICON = { size: 20, strokeWidth: 1.75, "aria-hidden": true } as const;
/** Open at start only where the card fits above the next-step card. */
const WIDE_QUERY = "(min-width: 1024px) and (min-height: 860px)";
const SCALE = [MATCH_DAY_START, 15, MATCH_DAY_END];

interface MatchTimelineProps {
	/** "map": floating over /mapa, folds into a pill. "city": under the dashboard map. */
	variant: "map" | "city";
}

/**
 * Match-day timeline (#44): a slider from 8:00 to 23:00 of the 2034 match day, a play
 * button, and the community's real agenda on the hours. It publishes `tiempo` on
 * `city-events`, so /mapa and the city dashboard move together. The day is a reference
 * scenario; the screen's single "datos de referencia" tag already says so (rule 9).
 */
export default function MatchTimeline({ variant }: MatchTimelineProps) {
	const t = useT().timeline;
	const ids = useId();
	const { hour, playing, seek, play, pause } = useMatchTimeline();
	const agenda = useAgendaDay();
	const foldable = variant === "map";
	// Phones and short screens start folded so the map stays visible.
	const [open, setOpen] = useState(
		() => !foldable || window.matchMedia(WIDE_QUERY).matches,
	);
	const label = formatHour(hour);
	const now = marksAtHour(agenda.day, hour);
	// Folding swaps the pill and the card: keep the keyboard focus on what replaced it.
	const pillRef = useRef<HTMLButtonElement>(null);
	const sliderRef = useRef<HTMLInputElement>(null);
	const toggled = useRef(false);
	useEffect(() => {
		if (!toggled.current) return;
		(open ? sliderRef : pillRef).current?.focus();
	}, [open]);
	const toggle = (next: boolean) => {
		toggled.current = true;
		setOpen(next);
	};

	if (!open) {
		return (
			<section className={`match-timeline match-timeline--${variant}`}>
				<button
					ref={pillRef}
					type="button"
					className="q-btn match-timeline__pill"
					aria-expanded={false}
					onClick={() => toggle(true)}
				>
					<Clock {...ICON} />
					{t.open(label)}
				</button>
			</section>
		);
	}

	return (
		<section
			className={`match-timeline match-timeline--${variant}`}
			aria-labelledby={`${ids}-title`}
		>
			<div className="q-card match-timeline__card">
				<div className="match-timeline__head">
					<div className="match-timeline__titles">
						<h2 id={`${ids}-title`} className="q-h3">
							{t.title}
						</h2>
						<p className="match-timeline__scenario">{t.scenario}</p>
					</div>
					{foldable && (
						<button
							type="button"
							className="q-btn q-btn--ghost q-btn--icon"
							aria-expanded={true}
							aria-label={t.collapse}
							onClick={() => toggle(false)}
						>
							<ChevronUp {...ICON} />
						</button>
					)}
				</div>

				<div className="match-timeline__controls">
					<button
						type="button"
						className="q-btn q-btn--primary q-btn--icon"
						aria-label={playing ? t.pause : t.play}
						onClick={playing ? pause : play}
					>
						{playing ? <Pause {...ICON} /> : <Play {...ICON} />}
					</button>
					{/* Announces a hour picked by hand; silent while the day plays. */}
					<output
						className="match-timeline__hour"
						htmlFor={`${ids}-slider`}
						aria-live={playing ? "off" : "polite"}
					>
						{label}
					</output>
				</div>

				<div className="match-timeline__track">
					<input
						ref={sliderRef}
						id={`${ids}-slider`}
						className="match-timeline__slider"
						type="range"
						min={MATCH_DAY_START}
						max={MATCH_DAY_END}
						step={1}
						value={hour}
						onChange={(event) => seek(Number(event.currentTarget.value))}
						aria-label={t.sliderLabel}
						aria-valuetext={t.valueText(label, now.length)}
						style={{ "--progress": `${hourToPercent(hour)}%` } as CSSProperties}
					/>
					<div className="match-timeline__marks" aria-hidden="true">
						{markHours(agenda.day).map((mark) => (
							<span
								key={mark}
								className="match-timeline__mark"
								style={{ left: `${hourToPercent(mark)}%` }}
							/>
						))}
					</div>
					<div className="match-timeline__scale" aria-hidden="true">
						{SCALE.map((value) => (
							<span key={value}>{formatHour(value)}</span>
						))}
					</div>
				</div>

				<AgendaAtHour
					status={agenda.status}
					day={agenda.day}
					now={now}
					limit={variant === "map" ? 2 : 4}
				/>
			</div>
		</section>
	);
}

interface AgendaAtHourProps {
	status: AgendaStatus;
	day: AgendaDay | null;
	now: AgendaMark[];
	limit: number;
}

/** The community's real events during the chosen hour, with every state (rule 8). */
function AgendaAtHour({ status, day, now, limit }: AgendaAtHourProps) {
	const t = useT().timeline;
	const language = useLanguage();

	if (status !== "ready" || !day) {
		const text =
			status === "loading"
				? t.loading
				: status === "offline"
					? t.offline
					: status === "error"
						? t.error
						: t.emptyDay;
		return (
			<p className="match-timeline__note" role="status">
				{text}
			</p>
		);
	}

	const date = new Intl.DateTimeFormat(language, {
		weekday: "short",
		day: "numeric",
		month: "short",
		timeZone: "UTC",
	}).format(new Date(`${day.date}T12:00:00Z`));
	const shown = now.slice(0, limit);
	const hidden = now.length - shown.length;

	return (
		<div className="match-timeline__agenda">
			<p className="match-timeline__agenda-head">
				<CalendarDays size={16} strokeWidth={1.75} aria-hidden="true" />
				<span>
					{day.isToday ? t.agendaToday : t.agendaOn(date)} ·{" "}
					{t.eventCount(day.marks.length)}
				</span>
			</p>
			{shown.length === 0 ? (
				<p className="match-timeline__note">{t.emptyHour}</p>
			) : (
				<ul className="match-timeline__events">
					{shown.map((mark) => (
						<li key={mark.id}>
							<a
								className="match-timeline__event"
								href={`/agenda/${encodeURIComponent(mark.id)}`}
							>
								<span className="match-timeline__event-time">
									{mark.startLabel}
								</span>
								<span className="match-timeline__event-title">
									{mark.title}
								</span>
							</a>
						</li>
					))}
				</ul>
			)}
			<a className="match-timeline__more" href="/agenda">
				{hidden > 0 ? `${t.more(hidden)} · ${t.seeAgenda}` : t.seeAgenda}
			</a>
		</div>
	);
}
