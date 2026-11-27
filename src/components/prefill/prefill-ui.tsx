// Marks form fields that arrived filled from the URL (a shared link or
// Quillart AI): gold-soft background, a small "Sugerido por Quillart AI" tag
// tied to the control with aria-describedby, and one polite announcement.
// The person can edit everything; nothing is submitted on its own.

import { Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useT } from "../../lib/i18n/use-language";

/** Background for a suggested control (`!` beats the input's own background). */
export const SUGGESTED_CLASS = "bg-[var(--gold-soft)]!";

export function suggestedTagId(fieldId: string): string {
	return `${fieldId}-suggested`;
}

/**
 * Props for a control: its class (plus the suggested background) and the
 * aria-describedby that ties it to the "suggested" tag.
 */
export function suggestedProps(
	on: boolean,
	fieldId: string,
	className = "",
	describedBy?: string,
): { className: string; "aria-describedby": string | undefined } {
	const ids = [describedBy, on ? suggestedTagId(fieldId) : undefined]
		.filter(Boolean)
		.join(" ");
	return {
		className: on ? `${className} ${SUGGESTED_CLASS}` : className,
		"aria-describedby": ids || undefined,
	};
}

/**
 * Which fields still show the suggestion. A field stops being "suggested" as
 * soon as the person changes it (call `accept`).
 */
export function usePrefill<K extends string>(initial: Iterable<K>) {
	const [keys, setKeys] = useState<ReadonlySet<K>>(() => new Set(initial));
	const [total] = useState(() => keys.size);
	const accept = useCallback((key: K) => {
		setKeys((current) => {
			if (!current.has(key)) return current;
			const next = new Set(current);
			next.delete(key);
			return next;
		});
	}, []);
	const isSuggested = useCallback((key: K) => keys.has(key), [keys]);
	return { isSuggested, accept, total };
}

/** Small tag under the label of a suggested field. */
export function SuggestedTag({ fieldId }: { fieldId: string }) {
	const t = useT();
	return (
		<span
			id={suggestedTagId(fieldId)}
			className="inline-flex items-center gap-1 rounded-full bg-[var(--gold-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--gold-text)]"
		>
			<Sparkles size={12} aria-hidden="true" />
			{t.shared.prefill.suggested}
		</span>
	);
}

/**
 * Banner at the top of a prefilled form. Its text is set after mount so screen
 * readers announce it (a live region that renders already filled is silent).
 */
export function PrefillNotice({ count }: { count: number }) {
	const t = useT();
	const [text, setText] = useState("");
	const message = count > 0 ? t.shared.prefill.notice(count) : "";
	const shown = useRef(false);
	useEffect(() => {
		if (!message) return;
		const timer = window.setTimeout(
			() => {
				shown.current = true;
				setText(message);
			},
			shown.current ? 0 : 300,
		);
		return () => window.clearTimeout(timer);
	}, [message]);
	return (
		<div
			role="status"
			className={
				text
					? "flex items-start gap-2 rounded-[var(--radius-md)] bg-[var(--gold-soft)] px-4 py-3 text-sm text-[var(--ink)]"
					: "sr-only"
			}
		>
			{text && (
				<Sparkles
					size={16}
					className="mt-0.5 shrink-0 text-[var(--gold-text)]"
					aria-hidden="true"
				/>
			)}
			{text}
		</div>
	);
}
