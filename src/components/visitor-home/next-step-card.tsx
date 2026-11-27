import {
	ArrowRight,
	ChevronDown,
	ChevronUp,
	Clock,
	Leaf,
	Mic,
	Route,
	Wallet,
	WifiOff,
} from "lucide-react";
import { useId, useState } from "react";
import type {
	MapNextStep,
	VisitorShellCopy,
} from "../../lib/home-content-types";
import { useT } from "../../lib/i18n/use-language";
import type { PlanResponse } from "../../lib/routing/plan-route";
import { openDock } from "../agent-dock/dock-control";

/** Phones start with the card as a peek, so it never covers most of the map (U10). */
const WIDE_QUERY = "(min-width: 640px)";

const copFormatter = new Intl.NumberFormat("es-CO", {
	maximumFractionDigits: 0,
});

interface NextStepCardProps {
	copy: VisitorShellCopy;
	lang: string;
	step: MapNextStep;
	/** The Decider's answer for `step`; null while it loads or when it failed. */
	plan: PlanResponse | null;
	/** The Decider could not answer (network or server): the card asks the Guide instead. */
	failed: boolean;
	online: boolean;
	/** "Ver la ruta": hides this card so the map's route card takes its place. */
	onShowRoute: () => void;
	/** Quillart AI with the trip question ready: Movilidad answers there (/inicio?q=). */
	askHref: string;
}

/**
 * The map section's one "Tu siguiente paso" card (q-next-step) plus the Quillart AI bar,
 * which hands questions to the conversation instead of running a second assistant here.
 * One primary action (rule 2), a one-sentence why from the Decider (rule 6), the
 * corridor seed (the map header carries the one "Datos de referencia" tag, rule 9) and every state (rule 8).
 */
export function NextStepCard({
	copy,
	lang,
	step,
	plan,
	failed,
	online,
	onShowRoute,
	askHref,
}: NextStepCardProps) {
	const t = useT().map.metro;
	const moreId = useId();
	// Peek on phones: title, time, fare and "Ver la ruta"; the rest when expanded.
	const [expanded, setExpanded] = useState(
		() => window.matchMedia(WIDE_QUERY).matches,
	);
	const route = plan?.route ?? null;
	const loading = !route && !failed && plan === null;
	// The dock on this screen answers (U03); /inicio only when there is none.
	const askInDock = (event: { preventDefault: () => void }) => {
		if (openDock()) event.preventDefault();
	};
	const fare = (cop: number) =>
		cop === 0 ? copy.free : `$${copFormatter.format(cop)}`;

	return (
		<div
			className={`visitor-bottom${expanded ? "" : " visitor-bottom--peek"}`}
			lang={lang}
		>
			<section
				className="q-next-step"
				aria-labelledby="visitor-next-title"
				aria-busy={loading}
			>
				<div className="q-next-step__head">
					<p className="q-next-step__eyebrow">
						<span className="q-star" aria-hidden="true" />
						{copy.nextStepEyebrow}
					</p>
					{route ? (
						<button
							type="button"
							className="q-btn q-btn--ghost q-btn--icon visitor-peek-toggle"
							aria-expanded={expanded}
							aria-controls={moreId}
							aria-label={expanded ? t.nextStepLess : t.nextStepMore}
							onClick={() => setExpanded((open) => !open)}
						>
							{expanded ? (
								<ChevronDown size={20} strokeWidth={1.75} aria-hidden="true" />
							) : (
								<ChevronUp size={20} strokeWidth={1.75} aria-hidden="true" />
							)}
						</button>
					) : null}
				</div>
				{route ? (
					<>
						<h2 className="q-next-step__title" id="visitor-next-title">
							{copy.nextStepTitle(step.destinationName)}
						</h2>
						{/* The Decider explains in Spanish, the corridor's language. */}
						<p className="q-next-step__why visitor-more" id={moreId} lang="es">
							{plan?.explanation}
						</p>
						<dl className="q-next-step__facts">
							<div className="visitor-more">
								<dt>{copy.nextStepRouteLabel}</dt>
								<dd className="visitor-fact">
									<Route size={16} strokeWidth={1.75} aria-hidden="true" />
									<span lang="es">{route.label}</span>
								</dd>
							</div>
							<div>
								<dt>{copy.nextStepTimeLabel}</dt>
								<dd className="visitor-fact">
									<Clock size={16} strokeWidth={1.75} aria-hidden="true" />
									{copy.minutes(route.durationMinutes)}
								</dd>
							</div>
							<div>
								<dt>{copy.nextStepFareLabel}</dt>
								<dd className="visitor-fact">
									<Wallet size={16} strokeWidth={1.75} aria-hidden="true" />
									{fare(route.fareCop)}
								</dd>
							</div>
						</dl>
						{route.isGreen ? (
							<span className="q-badge q-badge--optimal visitor-green visitor-more">
								<Leaf size={14} strokeWidth={1.75} aria-hidden="true" />
								{copy.greenRoute}
							</span>
						) : null}
						<button
							type="button"
							className="q-btn q-btn--primary q-btn--block"
							onClick={onShowRoute}
						>
							{copy.nextStepAction}
							<ArrowRight size={18} strokeWidth={1.75} aria-hidden="true" />
						</button>
					</>
				) : loading ? (
					<div
						className="q-state q-state--loading visitor-state--inline"
						role="status"
					>
						<span className="q-state__glyph" aria-hidden="true">
							<span className="q-star q-star--think" />
						</span>
						<p className="q-state__title" id="visitor-next-title">
							{copy.nextStepLoadingTitle}
						</p>
						<p className="q-state__text">{copy.nextStepLoadingText}</p>
					</div>
				) : (
					<>
						<h2 className="q-next-step__title" id="visitor-next-title">
							{copy.emptyTitle}
						</h2>
						<p className="q-next-step__why">{copy.emptyWhy}</p>
						<a
							className="q-btn q-btn--primary q-btn--block"
							href={askHref}
							onClick={askInDock}
						>
							<Mic size={18} strokeWidth={1.75} aria-hidden="true" />
							{copy.talkToGuide}
						</a>
					</>
				)}
			</section>

			{/* No second "Pregúntale a Quillart AI" bar here: the dock below is the one entry (U04). */}
			{online ? null : (
				<p className="q-sm q-muted visitor-note visitor-note--card">
					<WifiOff size={16} strokeWidth={1.75} aria-hidden="true" />
					{copy.offlineNote}
				</p>
			)}
		</div>
	);
}
