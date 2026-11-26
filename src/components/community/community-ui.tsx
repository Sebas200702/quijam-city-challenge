// Small building blocks shared by the community screens.

import type { ReactNode } from "react";
import type { PublishResult } from "../../lib/community/community-types";
import type { LoadState } from "./use-community";

export const inputClass =
	"h-12 w-full rounded-[var(--radius-md)] border border-[var(--line-control)] bg-[var(--bg)] px-4 text-[15px] text-[var(--ink)] placeholder:text-[var(--ink-subtle)]";
export const textareaClass =
	"min-h-32 w-full rounded-[var(--radius-md)] border border-[var(--line-control)] bg-[var(--bg)] px-4 py-3 text-[15px] text-[var(--ink)] placeholder:text-[var(--ink-subtle)]";

export function Field({
	id,
	label,
	hint,
	children,
}: {
	id: string;
	label: string;
	hint?: string;
	children: ReactNode;
}) {
	return (
		<div className="space-y-1.5">
			<label htmlFor={id} className="q-eyebrow block">
				{label}
			</label>
			{children}
			{hint && <p className="q-sm q-muted">{hint}</p>}
		</div>
	);
}

export function PageTitle({
	eyebrow,
	title,
	action,
	children,
}: {
	eyebrow?: string;
	title: string;
	action?: ReactNode;
	children?: ReactNode;
}) {
	return (
		<div className="flex flex-wrap items-end justify-between gap-3">
			<div className="min-w-0">
				{eyebrow && <p className="q-eyebrow">{eyebrow}</p>}
				<h1 className="q-h1 mt-1">{title}</h1>
				{children && <p className="q-p q-muted mt-1">{children}</p>}
			</div>
			{action}
		</div>
	);
}

export function ErrorNote({ message }: { message: string }) {
	return (
		<p
			role="alert"
			className="rounded-[var(--radius-md)] bg-[var(--red-soft)] px-4 py-3 text-sm text-[var(--red-text)]"
		>
			{message}
		</p>
	);
}

export function EmptyState({
	title,
	children,
	action,
}: {
	title: string;
	children?: ReactNode;
	action?: ReactNode;
}) {
	return (
		<div className="q-card px-5 py-8 text-center">
			<p className="q-h3">{title}</p>
			{children && <p className="q-p q-muted mt-2">{children}</p>}
			{action && <div className="mt-4 flex justify-center">{action}</div>}
		</div>
	);
}

export function Loading({ label = "Cargando…" }: { label?: string }) {
	return (
		<p className="q-p q-muted flex items-center gap-2" aria-live="polite">
			<span className="q-star q-star--think" aria-hidden="true" />
			{label}
		</p>
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
	if (state.status === "error") return <ErrorNote message={state.message} />;
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
			className={`rounded-[var(--radius-md)] px-4 py-3 text-sm ${tone}`}
		>
			{result.message}
		</p>
	);
}

/** Badge for the author's own content that is waiting for a moderator. */
export function HeldBadge() {
	return <span className="q-badge q-badge--high">En revisión</span>;
}
