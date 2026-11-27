// City moderation queue: urgent reports, reports for the city and held content.

import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import { formatRelative } from "../../lib/community/community-labels";
import type {
	ModerationAction,
	ModerationQueueItem,
} from "../../lib/community/community-types";
import { useT } from "../../lib/i18n/use-language";
import type {
	ModerationLabel,
	ModerationStatus,
} from "../../lib/moderation/moderation-types";
import { CommunityShell } from "./community-shell";
import {
	EmptyState,
	ErrorNote,
	Loaded,
	Loading,
	PageTitle,
} from "./community-ui";
import { signInHref, useLoad, useSession, useStore } from "./use-community";

/** Local result of an action while the queue reloads. */
type Override = ModerationStatus | "resolved";

function keyOf(item: Pick<ModerationQueueItem, "kind" | "id">): string {
	return `${item.kind}:${item.id}`;
}

function contentHref(item: ModerationQueueItem): string | null {
	if (item.kind === "event") return `/agenda/${encodeURIComponent(item.id)}`;
	if (item.kind === "thread") return `/foro/${encodeURIComponent(item.id)}`;
	if (item.threadId)
		return `/foro/${encodeURIComponent(item.threadId)}#respuesta-${encodeURIComponent(item.id)}`;
	return null;
}

export default function ModerationPage({ aiHref }: { aiHref?: string }) {
	const t = useT();
	const session = useSession();
	return (
		<CommunityShell current="forum" aiHref={aiHref}>
			<PageTitle
				eyebrow={t.forum.moderation.eyebrow}
				title={t.forum.moderation.title}
				illustration="/illustrations/for-review.svg"
			>
				{t.forum.moderation.intro}
			</PageTitle>
			{session.loading ? (
				<Loading />
			) : session.profile ? (
				<ModerationGate profileId={session.profile.id} />
			) : (
				<EmptyState
					title={t.forum.moderation.signInTitle}
					illustration="/illustrations/secure-login.svg"
					action={
						<a href={signInHref()} className="q-btn q-btn--primary">
							{t.forum.moderation.signIn}
						</a>
					}
				>
					{t.forum.moderation.signInHint}
				</EmptyState>
			)}
		</CommunityShell>
	);
}

function ModerationGate({ profileId }: { profileId: string }) {
	const t = useT();
	const { state } = useLoad((store) => store.canModerate(), [profileId]);
	return (
		<Loaded state={state} loadingLabel={t.forum.moderation.checkingPermissions}>
			{(allowed) =>
				allowed ? (
					<ModerationQueue profileId={profileId} />
				) : (
					<EmptyState
						title={t.forum.moderation.noAccessTitle}
						illustration="/illustrations/security-on.svg"
						action={
							<a href="/foro" className="q-btn q-btn--secondary">
								{t.forum.moderation.goToForum}
							</a>
						}
					>
						{t.forum.moderation.noAccessHint}
					</EmptyState>
				)
			}
		</Loaded>
	);
}

function ModerationQueue({ profileId }: { profileId: string }) {
	const t = useT();
	const store = useStore();
	const { state, reload } = useLoad(
		(current) => current.listModerationQueue(),
		[profileId],
		["forum", "events"],
	);
	const [overrides, setOverrides] = useState<Record<string, Override>>({});
	const [pending, setPending] = useState<Record<string, boolean>>({});
	const [error, setError] = useState<string | null>(null);

	async function act(item: ModerationQueueItem, action: ModerationAction) {
		const key = keyOf(item);
		// Confirming a citizen report keeps it in the queue until it is attended.
		const next: Override | null =
			action === "approve"
				? "published"
				: action === "remove"
					? "removed"
					: action === "resolve"
						? "resolved"
						: null;
		setError(null);
		setPending((value) => ({ ...value, [key]: true }));
		if (next) setOverrides((value) => ({ ...value, [key]: next }));
		try {
			await store.moderate(item.kind, item.id, action);
			reload();
		} catch (caught) {
			setOverrides((value) => {
				const { [key]: _dropped, ...rest } = value;
				return rest;
			});
			setError(
				caught instanceof Error ? caught.message : t.forum.moderation.saveError,
			);
		} finally {
			setPending((value) => ({ ...value, [key]: false }));
		}
	}

	return (
		<div className="flex max-w-3xl flex-col gap-6">
			{error && <ErrorNote message={error} />}
			<Loaded state={state} loadingLabel={t.forum.moderation.loadingQueue}>
				{(items) => {
					const visible = items.flatMap((item) => {
						const override = overrides[keyOf(item)];
						if (override === "removed" || override === "resolved") return [];
						if (
							override === "published" &&
							item.priority === "none" &&
							item.communityReports === 0
						)
							return [];
						return [override ? { ...item, status: override } : item];
					});
					if (visible.length === 0)
						return (
							<EmptyState
								illustration="/illustrations/celebration.svg"
								title={t.forum.moderation.allClear}
							>
								{t.forum.moderation.allClearHint}
							</EmptyState>
						);
					const appeals = visible.filter((item) => item.appeal);
					const rest = visible.filter((item) => !item.appeal);
					const emergency = rest.filter(
						(item) => item.priority === "emergency",
					);
					const city = rest.filter(
						(item) => item.priority === "city_attention",
					);
					const held = rest.filter(
						(item) => item.priority === "none" && item.status === "held",
					);
					const reported = rest.filter(
						(item) =>
							item.priority === "none" &&
							item.status === "published" &&
							item.communityReports > 0,
					);
					return (
						<>
							{appeals.length > 0 && (
								<QueueSection
									id="appeals"
									title={t.forum.moderation.appealsTitle}
									hint={t.forum.moderation.appealsHint}
									items={appeals}
									pending={pending}
									onAct={act}
								/>
							)}
							<QueueSection
								id="urgent"
								title={t.forum.moderation.urgentTitle}
								hint={t.forum.moderation.urgentHint}
								items={emergency}
								pending={pending}
								onAct={act}
							/>
							<QueueSection
								id="city"
								title={t.forum.moderation.cityTitle}
								hint={t.forum.moderation.cityHint}
								items={city}
								pending={pending}
								onAct={act}
							/>
							<QueueSection
								id="held"
								title={t.forum.moderation.heldTitle}
								hint={t.forum.moderation.heldHint}
								items={held}
								pending={pending}
								onAct={act}
							/>
							<QueueSection
								id="reported"
								title={t.forum.moderation.reportedTitle}
								hint={t.forum.moderation.reportedHint}
								items={reported}
								pending={pending}
								onAct={act}
							/>
						</>
					);
				}}
			</Loaded>
		</div>
	);
}

function QueueSection({
	id,
	title,
	hint,
	items,
	pending,
	onAct,
}: {
	id: string;
	title: string;
	hint: string;
	items: ModerationQueueItem[];
	pending: Record<string, boolean>;
	onAct: (item: ModerationQueueItem, action: ModerationAction) => void;
}) {
	const t = useT();
	return (
		<section aria-labelledby={`queue-${id}`} className="space-y-3">
			<div>
				<h2 id={`queue-${id}`} className="q-h2 flex items-center gap-2">
					{title}
					<span className="q-badge q-badge--neutral">{items.length}</span>
				</h2>
				<p className="q-sm q-muted mt-1">{hint}</p>
			</div>
			{items.length === 0 ? (
				<p className="q-p q-muted flex items-center gap-2">
					<ShieldCheck size={18} aria-hidden="true" />
					{t.forum.moderation.nothingPending}
				</p>
			) : (
				<ul className="flex flex-col gap-3">
					{items.map((item) => (
						<QueueItem
							key={keyOf(item)}
							item={item}
							busy={Boolean(pending[keyOf(item)])}
							onAct={onAct}
						/>
					))}
				</ul>
			)}
		</section>
	);
}

function QueueItem({
	item,
	busy,
	onAct,
}: {
	item: ModerationQueueItem;
	busy: boolean;
	onAct: (item: ModerationQueueItem, action: ModerationAction) => void;
}) {
	const t = useT();
	const m = t.forum.moderation;
	const href = contentHref(item);
	const held = item.status === "held";
	const flagged = item.labels.filter((label) => label !== "ok");
	// Show "Sin problemas" only when the triage said so explicitly.
	const labels: ModerationLabel[] =
		flagged.length > 0 ? flagged : item.labels.length > 0 ? ["ok"] : [];
	return (
		<li className="q-card space-y-3 px-5 py-4">
			<div className="flex flex-wrap items-center gap-2">
				<span className="q-eyebrow">{m.kinds[item.kind]}</span>
				{item.priority === "emergency" && (
					<span className="q-badge q-badge--live">{m.urgent}</span>
				)}
				{item.priority === "city_attention" && (
					<span className="q-badge q-badge--high">{m.forCity}</span>
				)}
				{held ? (
					<span className="q-badge q-badge--high">{m.held}</span>
				) : (
					<span className="q-badge q-badge--optimal">{m.published}</span>
				)}
				{item.appeal && (
					<span className="q-badge q-badge--high">{m.appealBadge}</span>
				)}
				{item.communityReports > 0 && (
					<span className="q-badge q-badge--alert">
						{m.reportedBy(item.communityReports)}
					</span>
				)}
			</div>
			<h3 className="q-h3 break-words">{item.title || m.untitled}</h3>
			<p className="q-p q-muted line-clamp-3 whitespace-pre-line break-words">
				{item.body}
			</p>
			{item.appeal && (
				<p className="q-p whitespace-pre-line break-words rounded-[var(--radius-md)] bg-[var(--bg-soft)] p-3">
					<b>{m.appealSays}</b> {item.appeal.message}
				</p>
			)}
			{labels.length > 0 && (
				<div className="flex flex-wrap gap-1.5">
					{labels.map((label) => (
						<span
							key={label}
							className={`q-badge ${label === "ok" ? "q-badge--optimal" : "q-badge--alert"}`}
						>
							{m.labels[label]}
						</span>
					))}
				</div>
			)}
			<p className="q-sm q-muted">
				{item.authorName} ·{" "}
				<time dateTime={item.createdAt}>{formatRelative(item.createdAt)}</time>{" "}
				· {m.decidedBy} {m.sources[item.source]}
			</p>
			<div className="flex flex-wrap gap-2">
				{item.appeal ? (
					<button
						type="button"
						className="q-btn q-btn--primary"
						disabled={busy}
						onClick={() => onAct(item, "approve")}
					>
						{m.restore}
					</button>
				) : held ? (
					<button
						type="button"
						className="q-btn q-btn--primary"
						disabled={busy}
						onClick={() => onAct(item, "approve")}
					>
						{m.approve}
					</button>
				) : (
					<button
						type="button"
						className="q-btn q-btn--primary"
						disabled={busy}
						onClick={() => onAct(item, "resolve")}
					>
						{m.markAttended}
					</button>
				)}
				{item.kind === "thread" && item.priority !== "none" && !held && (
					<button
						type="button"
						className="q-btn q-btn--secondary"
						disabled={busy}
						onClick={() => onAct(item, "verify")}
					>
						{m.confirmReport}
					</button>
				)}
				<button
					type="button"
					className="q-btn q-btn--alert"
					disabled={busy}
					onClick={() => onAct(item, "remove")}
				>
					{item.appeal ? m.keepRemoved : m.remove}
				</button>
				{href && (
					<a href={href} className="q-btn q-btn--ghost">
						{m.viewContent}
					</a>
				)}
			</div>
		</li>
	);
}
