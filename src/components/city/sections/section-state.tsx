import { type LucideIcon, RefreshCw, WifiOff } from "lucide-react";

export type SectionStateKind = "loading" | "empty" | "error" | "offline";

interface SectionStateProps {
	kind: SectionStateKind;
	title: string;
	text: string;
	/** Glyph for empty and error states; loading always shows the thinking star. */
	icon?: LucideIcon;
	/** Decorative illustration from /public/illustrations, shown instead of the glyph. */
	illustration?: string;
	/** Shown as the state's one action when given (error state). */
	onRetry?: () => void;
	/** Shorter block for side columns. */
	compact?: boolean;
}

/** Full-area block so a section is never blank: loading, empty, error or offline. */
export function SectionState({
	kind,
	title,
	text,
	icon: Icon,
	illustration,
	onRetry,
	compact = false,
}: SectionStateProps) {
	const GlyphIcon = kind === "offline" ? (Icon ?? WifiOff) : Icon;
	return (
		<div
			className={`q-state q-state--${kind}`}
			role={kind === "error" ? "alert" : "status"}
			aria-busy={kind === "loading" || undefined}
			style={compact ? { minHeight: 200, padding: "24px 16px" } : undefined}
		>
			{kind === "loading" ? (
				<span className="q-state__glyph" aria-hidden="true">
					<span className="q-star q-star--think" />
				</span>
			) : illustration ? (
				<div className="q-illus" aria-hidden="true" style={{ padding: 10 }}>
					<img
						src={illustration}
						alt=""
						style={{ height: compact ? 88 : 120, width: "auto" }}
					/>
				</div>
			) : GlyphIcon ? (
				<span className="q-state__glyph" aria-hidden="true">
					<GlyphIcon size={28} strokeWidth={1.75} />
				</span>
			) : null}
			<p className="q-state__title">{title}</p>
			<p className="q-state__text">{text}</p>
			{onRetry && (
				<button
					type="button"
					className="q-btn q-btn--primary q-state__action"
					onClick={onRetry}
				>
					<RefreshCw size={18} strokeWidth={1.75} aria-hidden="true" />
					Reintentar
				</button>
			)}
		</div>
	);
}
