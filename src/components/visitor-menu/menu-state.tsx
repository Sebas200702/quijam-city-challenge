import { RotateCw, WifiOff } from "lucide-react";
import type { ReactNode } from "react";
import { LoadErrorIllustration } from "./illustrations";

interface MenuLoadingProps {
	title: string;
	text: string;
}

/** Loading block with the thinking star. Never a blank screen. */
export function MenuLoading({ title, text }: MenuLoadingProps) {
	return (
		<div className="q-state q-state--loading" role="status" aria-busy="true">
			<span className="q-state__glyph" aria-hidden="true">
				<span className="q-star q-star--think" />
			</span>
			<p className="q-state__title">{title}</p>
			<p className="q-state__text">{text}</p>
		</div>
	);
}

interface MenuErrorProps {
	title: string;
	text: string;
	onRetry: () => void;
}

/** Error block: says what failed, reassures, offers one retry. */
export function MenuError({ title, text, onRetry }: MenuErrorProps) {
	return (
		<div className="q-state q-state--error" role="alert">
			<span className="vm-illus">
				<LoadErrorIllustration />
			</span>
			<p className="q-state__title">{title}</p>
			<p className="q-state__text">{text}</p>
			<button
				type="button"
				className="q-btn q-btn--primary q-state__action"
				onClick={onRetry}
			>
				<RotateCw size={18} strokeWidth={1.75} aria-hidden="true" />
				Reintentar
			</button>
		</div>
	);
}

interface MenuEmptyProps {
	illustration: ReactNode;
	title: string;
	text: string;
	action?: ReactNode;
}

/** Empty block with an illustration and an optional next action. */
export function MenuEmpty({
	illustration,
	title,
	text,
	action,
}: MenuEmptyProps) {
	return (
		<div className="q-state q-state--empty" role="status">
			<span className="vm-illus">{illustration}</span>
			<p className="q-state__title">{title}</p>
			<p className="q-state__text">{text}</p>
			{action}
		</div>
	);
}

interface OfflineNoteProps {
	children: ReactNode;
}

/** One-line note shown while offline, explaining what still works. */
export function OfflineNote({ children }: OfflineNoteProps) {
	return (
		<p className="q-sm q-muted vm-note" role="status">
			<WifiOff size={16} strokeWidth={1.75} aria-hidden="true" />
			{children}
		</p>
	);
}
