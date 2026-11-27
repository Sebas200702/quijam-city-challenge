import { X } from "lucide-react";
import { type ReactNode, useEffect, useId, useRef } from "react";

interface VisitorSheetProps {
	title: string;
	/** Decorative illustration next to the title. */
	hero?: ReactNode;
	closeLabel: string;
	onClose: () => void;
	/** Language of the sheet's copy (the page itself stays Spanish). */
	lang: string;
	children: ReactNode;
}

const FOCUSABLE =
	'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Bottom sheet over the dimmed home (q-sheet--dock, expanded). Modal: focus moves in,
 * Tab stays inside, Escape or the scrim closes it and focus goes back to the opener.
 */
export function VisitorSheet({
	title,
	hero,
	closeLabel,
	onClose,
	lang,
	children,
}: VisitorSheetProps) {
	const titleId = useId();
	const sheetRef = useRef<HTMLElement>(null);
	const closeRef = useRef<HTMLButtonElement>(null);
	const onCloseRef = useRef(onClose);
	onCloseRef.current = onClose;

	useEffect(() => {
		const opener =
			document.activeElement instanceof HTMLElement
				? document.activeElement
				: null;
		closeRef.current?.focus();
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				event.preventDefault();
				onCloseRef.current();
				return;
			}
			if (event.key !== "Tab" || !sheetRef.current) return;
			const items = [
				...sheetRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
			];
			const first = items[0];
			const last = items[items.length - 1];
			if (!first || !last) return;
			if (event.shiftKey && document.activeElement === first) {
				event.preventDefault();
				last.focus();
			} else if (!event.shiftKey && document.activeElement === last) {
				event.preventDefault();
				first.focus();
			}
		};
		document.addEventListener("keydown", onKey);
		return () => {
			document.removeEventListener("keydown", onKey);
			opener?.focus();
		};
	}, []);

	return (
		<>
			<button
				type="button"
				className="visitor-scrim"
				aria-label={closeLabel}
				tabIndex={-1}
				onClick={onClose}
			/>
			<section
				ref={sheetRef}
				className="q-sheet q-sheet--dock q-sheet--expanded visitor-sheet"
				role="dialog"
				aria-modal="true"
				aria-labelledby={titleId}
				lang={lang}
			>
				<span className="q-sheet__handle" aria-hidden="true" />
				<div className="visitor-sheet__head">
					<h2 className="q-h2" id={titleId}>
						{title}
					</h2>
					{hero ? (
						<span className="visitor-sheet__hero" aria-hidden="true">
							{hero}
						</span>
					) : null}
					<button
						ref={closeRef}
						type="button"
						className="q-btn q-btn--ghost q-btn--icon"
						aria-label={closeLabel}
						onClick={onClose}
					>
						<X size={20} strokeWidth={1.75} aria-hidden="true" />
					</button>
				</div>
				<div className="q-sheet__body">{children}</div>
			</section>
		</>
	);
}
