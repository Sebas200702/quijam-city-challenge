import { Check, Route, TriangleAlert } from "lucide-react";
import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Notice } from "../../lib/notices/notice-types";
import { NoticeIllustration } from "./notice-illustration";

/** "mm:ss" until `activeAt`, refreshed every second; null without a target. */
function useClock(activeAt: number | undefined): string | null {
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		if (activeAt === undefined) return;
		const timer = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(timer);
	}, [activeAt]);
	if (activeAt === undefined) return null;
	const seconds = Math.max(0, Math.round((activeAt - now) / 1000));
	const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
	const ss = String(seconds % 60).padStart(2, "0");
	return `${mm}:${ss}`;
}

interface ArroyoModalProps {
	notice: Notice;
	onAction: (notice: Notice, actionId: string) => void;
	onDismiss: (notice: Notice) => void;
}

/**
 * The only interruption (epic #57, rule 4): `.q-backdrop > .q-alert--modal`
 * with role="alertdialog". Focus starts on "Cambiar ruta", stays inside the
 * dialog and goes back where it was on close. Escape means "Entendido".
 */
export function ArroyoModal({ notice, onAction, onDismiss }: ArroyoModalProps) {
	const id = useId();
	const dialogRef = useRef<HTMLDivElement>(null);
	const primaryRef = useRef<HTMLButtonElement>(null);
	const clock = useClock(notice.activeAt);

	useEffect(() => {
		const previous =
			document.activeElement instanceof HTMLElement
				? document.activeElement
				: null;
		primaryRef.current?.focus();
		return () => previous?.focus();
	}, []);

	const trapFocus = (event: KeyboardEvent<HTMLDivElement>) => {
		if (event.key === "Escape") {
			event.preventDefault();
			onDismiss(notice);
			return;
		}
		if (event.key !== "Tab") return;
		const buttons = dialogRef.current?.querySelectorAll<HTMLElement>("button");
		if (!buttons?.length) return;
		const first = buttons[0];
		const last = buttons[buttons.length - 1];
		if (event.shiftKey && document.activeElement === first) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault();
			first.focus();
		}
	};

	if (typeof document === "undefined") return null;
	return createPortal(
		<div className="q-backdrop">
			<div
				ref={dialogRef}
				className="q-alert q-alert--alert q-alert--modal q-notice"
				// Spanish-only copy for now (WCAG 3.1.2, language of parts).
				lang="es"
				role="alertdialog"
				aria-modal="true"
				aria-labelledby={`${id}-title`}
				aria-describedby={`${id}-text`}
				onKeyDown={trapFocus}
			>
				<div className="q-notice-modal__head">
					<span className="q-alert__icon" aria-hidden="true">
						<TriangleAlert size={26} strokeWidth={1.75} />
					</span>
					<span className="q-notice-modal__illus" aria-hidden="true">
						<NoticeIllustration kind="arroyo" />
					</span>
				</div>
				<div className="q-alert__body">
					<p className="q-eyebrow q-notice-modal__eyebrow">
						Alerta de seguridad
					</p>
					<h2 className="q-alert__title" id={`${id}-title`}>
						{notice.title}
					</h2>
					<p className="q-alert__text" id={`${id}-text`}>
						{notice.text}
					</p>
					{clock && (
						<p className="q-notice-modal__timer" aria-hidden="true">
							{clock}
						</p>
					)}
				</div>
				<div className="q-alert__actions">
					{notice.action && (
						<button
							ref={primaryRef}
							type="button"
							className="q-btn q-btn--primary q-btn--block"
							onClick={() => {
								if (notice.action) onAction(notice, notice.action.id);
							}}
						>
							<Route size={18} strokeWidth={1.75} aria-hidden="true" />
							{notice.action.label}
						</button>
					)}
					<button
						type="button"
						className="q-btn q-btn--ghost q-btn--block"
						onClick={() => onDismiss(notice)}
					>
						<Check size={18} strokeWidth={1.75} aria-hidden="true" />
						{notice.secondaryAction?.label ?? "Entendido"}
					</button>
				</div>
			</div>
		</div>,
		document.body,
	);
}
