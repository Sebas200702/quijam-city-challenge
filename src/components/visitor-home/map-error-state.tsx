import { MessageCircle, RotateCcw } from "lucide-react";
import type { VisitorShellCopy } from "../../lib/home-content-types";
import { MapErrorIllustration } from "./visitor-illustrations";

interface MapErrorStateProps {
	copy: VisitorShellCopy;
	lang: string;
	/** Quillart AI keeps working without the map: it only needs the conversation. */
	askHref: string;
}

/** The map failed: one action (retry) and Quillart AI as a way out. Never a blank screen. */
export function MapErrorState({ copy, lang, askHref }: MapErrorStateProps) {
	return (
		<div
			className="q-state q-state--error visitor-fill"
			role="alert"
			lang={lang}
		>
			<span className="visitor-state__illus relative" aria-hidden="true">
				<span className="l-geo l-geo--ring l-geo--gold top-1 -left-5" />
				<span className="l-geo l-geo--plus l-geo--green -right-4 bottom-2" />
				<MapErrorIllustration />
			</span>
			<p className="q-state__title">{copy.mapErrorTitle}</p>
			<p className="q-state__text">{copy.mapErrorText}</p>
			<button
				type="button"
				className="q-btn q-btn--primary q-state__action"
				onClick={() => window.location.reload()}
			>
				<RotateCcw size={18} strokeWidth={1.75} aria-hidden="true" />
				{copy.retry}
			</button>
			<a className="q-btn q-btn--ghost" href={askHref}>
				<MessageCircle size={18} strokeWidth={1.75} aria-hidden="true" />
				{copy.talkToGuide}
			</a>
		</div>
	);
}
