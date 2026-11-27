// Small building blocks shared by the community screens.

import { CircleAlert, RefreshCw, WifiOff } from "lucide-react";
import { cloneElement, type ReactElement, type ReactNode } from "react";
import type { PublishResult } from "../../lib/community/community-types";
import { useT } from "../../lib/i18n/use-language";
import { useOnlineStatus } from "../visitor-home/use-online-status";
import type { LoadState } from "./use-community";
import "../../styles/life-community.css";

export const inputClass =
	"h-12 w-full rounded-[var(--radius-md)] border border-[var(--line-control)] bg-[var(--bg)] px-4 text-[15px] text-[var(--ink)] placeholder:text-[var(--ink-subtle)]";
export const textareaClass =
	"min-h-32 w-full rounded-[var(--radius-md)] border border-[var(--line-control)] bg-[var(--bg)] px-4 py-3 text-[15px] text-[var(--ink)] placeholder:text-[var(--ink-subtle)]";

/**
 * Label, control, hint and error of one form field. The hint and the error are
 * tied to the control (`aria-describedby`, `aria-invalid`), so a screen reader
 * reads them with it.
 */
export function Field({
	id,
	label,
	hint,
	error,
	children,
}: {
	id: string;
	label: string;
	hint?: string;
	/** Message for this field only; marks the control as invalid. */
	error?: string | null;
	children: ReactElement<{
		"aria-describedby"?: string;
		"aria-invalid"?: boolean;
	}>;
}) {
	const hintId = `${id}-hint`;
	const errorId = `${id}-error`;
	const describedBy =
		[hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") ||
		undefined;
	return (
		<div className="space-y-1.5">
			<label htmlFor={id} className="q-eyebrow block">
				{label}
			</label>
			{cloneElement(children, {
				"aria-describedby": describedBy,
				"aria-invalid": error ? true : undefined,
			})}
			{hint && (
				<p id={hintId} className="q-sm q-muted">
					{hint}
				</p>
			)}
			{error && (
				<p
					id={errorId}
					className="flex items-start gap-1.5 text-sm font-semibold text-[var(--red-text)]"
				>
					<CircleAlert
						size={16}
						strokeWidth={1.75}
						className="mt-0.5 shrink-0"
						aria-hidden="true"
					/>
					{error}
				</p>
			)}
		</div>
	);
}

/** Decorative unDraw illustration on the light panel (empty alt). */
export function SpotIllustration({
	src,
	className = "h-28! lg:h-40!",
}: {
	src: string;
	/** Height classes; `!` is needed to beat the design system's `height: auto`. */
	className?: string;
}) {
	return (
		<img
			src={src}
			alt=""
			aria-hidden="true"
			className={`w-auto! max-w-full object-contain ${className}`}
		/>
	);
}

export function PageTitle({
	eyebrow,
	title,
	action,
	children,
	illustration,
}: {
	eyebrow?: string;
	title: string;
	action?: ReactNode;
	children?: ReactNode;
	/** Path under /illustrations; turns the title into an illustrated banner. */
	illustration?: string;
}) {
	// A small rounded canvas: tinted gradient, eyebrow pill, big title, confetti.
	return (
		<div className="lq-canvas l-rise">
			<span
				className="l-geo l-geo--quarter l-geo--green top-0 right-0 rotate-180 opacity-80"
				aria-hidden="true"
			/>
			<span
				className="l-geo l-geo--ring top-5 left-[54%] max-lg:hidden"
				style={{ ["--i" as string]: 1 }}
				aria-hidden="true"
			/>
			<span
				className="l-geo l-geo--plus l-geo--gold bottom-5 left-[62%] rotate-12 max-lg:hidden"
				style={{ ["--i" as string]: 2 }}
				aria-hidden="true"
			/>
			<span
				className="l-geo l-geo--tri l-geo--ink bottom-7 left-[46%] -rotate-12 max-lg:hidden"
				style={{ ["--i" as string]: 3 }}
				aria-hidden="true"
			/>
			<div
				className={`lq-canvas__body flex gap-4 lg:gap-10 ${
					illustration
						? "items-center"
						: "flex-wrap items-end justify-between"
				}`}
			>
				<div className="flex min-w-0 flex-1 flex-col gap-3">
					{eyebrow && (
						<p className="l-eyebrow">
							<span className="q-star" aria-hidden="true" />
							{eyebrow}
						</p>
					)}
					<h1 className="q-h1 lq-title">{title}</h1>
					{children && <p className="q-p q-muted max-w-[56ch]">{children}</p>}
					{illustration && action && (
						<div className="flex flex-wrap gap-2">{action}</div>
					)}
				</div>
				{illustration ? (
					<div className="lq-art">
						<SpotIllustration
							src={illustration}
							className="h-16! sm:h-20! lg:h-32!"
						/>
					</div>
				) : (
					action
				)}
			</div>
		</div>
	);
}

export function ErrorNote({ message }: { message: string }) {
	return (
		<p
			role="alert"
			className="rounded-[18px_18px_18px_4px] bg-[var(--red-soft)] px-4 py-3 text-sm text-[var(--red-text)]"
		>
			{message}
		</p>
	);
}

export function EmptyState({
	title,
	children,
	action,
	illustration = "/illustrations/the-search.svg",
}: {
	title: string;
	children?: ReactNode;
	action?: ReactNode;
	/** Path under /illustrations; pass null for none. */
	illustration?: string | null;
}) {
	return (
		<div className="q-card l-rise items-center rounded-[28px_72px_28px_72px]! px-6 py-8 text-center">
			<span
				className="l-geo l-geo--ring l-geo--gold top-6 left-6"
				aria-hidden="true"
			/>
			<span
				className="l-geo l-geo--plus l-geo--green right-7 bottom-7 rotate-12"
				style={{ ["--i" as string]: 2 }}
				aria-hidden="true"
			/>
			<span
				className="l-geo l-geo--diamond top-10 right-[18%] max-lg:hidden"
				style={{ ["--i" as string]: 1 }}
				aria-hidden="true"
			/>
			{illustration && (
				<div className="lq-art lq-art--circle mb-4">
					<SpotIllustration src={illustration} className="h-20! lg:h-28!" />
				</div>
			)}
			<p className="q-h3 lq-h2 relative z-[2]">{title}</p>
			{children && <p className="q-p q-muted relative z-[2] mt-2">{children}</p>}
			{action && (
				<div className="relative z-[2] mt-4 flex justify-center">{action}</div>
			)}
		</div>
	);
}

export function Loading({ label }: { label?: string }) {
	const t = useT();
	return (
		<p className="q-p q-muted flex items-center gap-2" aria-live="polite">
			<span className="q-star q-star--think" aria-hidden="true" />
			{label ?? t.shared.ui.loading}
		</p>
	);
}

/** Failed load: says whether the connection is down and offers to try again. */
function LoadError({
	message,
	onRetry,
}: {
	message: string;
	onRetry?: () => void;
}) {
	const t = useT();
	const online = useOnlineStatus();
	const Glyph = online ? CircleAlert : WifiOff;
	return (
		<div
			className={`q-state q-state--${online ? "error" : "offline"}`}
			role="alert"
		>
			<span className="q-state__glyph" aria-hidden="true">
				<Glyph size={28} strokeWidth={1.75} />
			</span>
			<p className="q-state__title">
				{online ? t.shared.ui.errorTitle : t.offline.title}
			</p>
			<p className="q-state__text">
				{online ? message : t.shared.ui.offlineText}
			</p>
			<button
				type="button"
				className="q-btn q-btn--secondary q-state__action"
				onClick={onRetry ?? (() => window.location.reload())}
			>
				<RefreshCw size={18} aria-hidden="true" />
				{t.offline.retry}
			</button>
		</div>
	);
}

/** Renders loading and error states, and `children(data)` when ready. */
export function Loaded<T>({
	state,
	children,
	loadingLabel,
}: {
	state: LoadState<T>;
	children: (data: T) => ReactNode;
	loadingLabel?: string;
}) {
	if (state.status === "loading") return <Loading label={loadingLabel} />;
	if (state.status === "error")
		return <LoadError message={state.message} onRetry={state.retry} />;
	return <>{children(state.data)}</>;
}

/** Tells the author what the moderation triage did with their content. */
export function PublishNotice({
	result,
}: {
	result: Pick<PublishResult<unknown>, "outcome" | "message" | "priority">;
}) {
	const tone =
		result.outcome === "published"
			? "bg-[var(--green-soft)] text-[var(--green-text)]"
			: result.outcome === "held"
				? "bg-[var(--gold-soft)] text-[var(--gold-text)]"
				: "bg-[var(--red-soft)] text-[var(--red-text)]";
	return (
		<p
			role="status"
			className={`rounded-[18px_18px_18px_4px] px-4 py-3 text-sm ${tone}`}
		>
			{result.message}
		</p>
	);
}

/** Badge for the author's own content that is waiting for a moderator. */
export function HeldBadge() {
	const t = useT();
	return <span className="q-badge q-badge--high">{t.shared.ui.heldBadge}</span>;
}
