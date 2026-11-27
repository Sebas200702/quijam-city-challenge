import { KeyRound, RefreshCw } from "lucide-react";
import "../../../styles/life-city-b.css";
import {
	CalmCorridorIllustration,
	MapErrorIllustration,
} from "./shell-illustrations";

type ShellStateKind = "loading" | "empty" | "error" | "setup";

interface ShellStateProps {
	kind: ShellStateKind;
	title: string;
	text: string;
	onRetry?: () => void;
}

/** Full-panel state for the city dashboard: never a blank screen. */
export function ShellState({ kind, title, text, onRetry }: ShellStateProps) {
	const stateClass = kind === "setup" ? "q-state--error" : `q-state--${kind}`;
	const isAlert = kind === "error" || kind === "setup";

	return (
		<div
			className="q-panel lcb-panel lcb-panel--corner lcb-panel--canvas l-rise"
			aria-busy={kind === "loading" ? true : undefined}
		>
			<span
				className="l-geo l-geo--ring l-geo--gold top-6 right-8 max-lg:hidden"
				aria-hidden="true"
			/>
			<span
				className="l-geo l-geo--plus l-geo--green bottom-8 left-8 max-lg:hidden"
				aria-hidden="true"
			/>
			<span
				className="l-geo l-geo--tri top-10 left-[14%] max-lg:hidden"
				aria-hidden="true"
			/>
			<div
				className={`q-state ${stateClass}`}
				role={isAlert ? "alert" : "status"}
			>
				{kind === "loading" && (
					<span className="q-state__glyph">
						<span className="q-star q-star--think" aria-hidden="true" />
					</span>
				)}
				{kind === "empty" && <CalmCorridorIllustration />}
				{kind === "error" && <MapErrorIllustration />}
				{kind === "setup" && (
					<span className="q-state__glyph">
						<KeyRound size={28} strokeWidth={1.75} aria-hidden="true" />
					</span>
				)}
				<p className="q-state__title">{title}</p>
				<p className="q-state__text">{text}</p>
				{onRetry && (
					<button
						type="button"
						className="q-btn q-btn--primary q-state__action l-cta"
						onClick={onRetry}
					>
						<RefreshCw size={18} strokeWidth={1.75} aria-hidden="true" />
						Reintentar
					</button>
				)}
			</div>
		</div>
	);
}
