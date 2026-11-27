import {
	Check,
	CloudRain,
	Info,
	type LucideIcon,
	MapPin,
	X,
} from "lucide-react";
import type { Notice } from "../../lib/notices/notice-types";
import { NoticeIllustration } from "./notice-illustration";

const TONE_ICON: Record<Notice["tone"], LucideIcon> = {
	alert: CloudRain,
	safe: Check,
	info: Info,
};

interface NoticeCardProps {
	notice: Notice;
	onAction: (notice: Notice, actionId: string) => void;
	onDismiss: (notice: Notice) => void;
}

/** A discreet notice (`.q-alert --safe/--info`): never interrupts, closes with ✕. */
export function NoticeCard({ notice, onAction, onDismiss }: NoticeCardProps) {
	const Icon = TONE_ICON[notice.tone];
	return (
		// Notice copy is Spanish only for now (WCAG 3.1.2, language of parts).
		<div className={`q-alert q-alert--${notice.tone} q-notice`} lang="es">
			<span className="q-alert__icon" aria-hidden="true">
				<Icon size={18} strokeWidth={1.75} />
			</span>
			<div className="q-alert__body">
				<p className="q-alert__title">{notice.title}</p>
				<p className="q-alert__text">{notice.text}</p>
				{notice.action && (
					<div className="q-alert__actions">
						<button
							type="button"
							className="q-btn q-btn--secondary q-btn--sm"
							onClick={() => {
								if (notice.action) onAction(notice, notice.action.id);
							}}
						>
							<MapPin size={18} strokeWidth={1.75} aria-hidden="true" />
							{notice.action.label}
						</button>
					</div>
				)}
			</div>
			<span className="q-notice__illus" aria-hidden="true">
				<NoticeIllustration kind={notice.kind} />
			</span>
			<button
				type="button"
				className="q-alert__close"
				aria-label="Cerrar aviso"
				onClick={() => onDismiss(notice)}
			>
				<X size={18} strokeWidth={1.75} aria-hidden="true" />
			</button>
		</div>
	);
}
