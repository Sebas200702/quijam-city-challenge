// One forum conversation: the opening message, its replies and the reply composer.

import { ArrowLeft, CalendarDays, MapPin } from "lucide-react";
import { type SyntheticEvent, useState } from "react";
import { pointOf } from "../../lib/community/community-geo";
import {
	FORUM_CATEGORY_LABELS,
	formatRelative,
	initials,
} from "../../lib/community/community-labels";
import { validatePostBody } from "../../lib/community/community-rules";
import type {
	ForumPost,
	ForumThread,
	Profile,
	PublishResult,
} from "../../lib/community/community-types";
import { readPrefill } from "../../lib/community/form-prefill";
import { useT } from "../../lib/i18n/use-language";
import { mapHref } from "../../lib/map/map-url";
import { AgentMark } from "../agent-dock/agent-mark";
import { usePublishScreen } from "../agent-dock/use-screen-context";
import { useUiAction } from "../agent-dock/use-ui-action";
import { CommunityShell } from "./community-shell";
import {
	EmptyState,
	ErrorNote,
	HeldBadge,
	Loaded,
	Loading,
	PublishNotice,
	textareaClass,
} from "./community-ui";
import { LazyMiniMap } from "./lazy-maps";
import { ReportButton } from "./report-button";
import { CitizenReportBadge } from "./trust-badges";
import { signInHref, useLoad, useSession, useStore } from "./use-community";

interface ThreadData {
	thread: ForumThread | null;
	posts: ForumPost[];
}

export default function ThreadPage({
	threadId,
	aiHref,
}: {
	threadId: string;
	aiHref?: string;
}) {
	const t = useT();
	const session = useSession();
	const { state, reload } = useLoad<ThreadData>(
		async (store) => {
			const [thread, posts] = await Promise.all([
				store.getThread(threadId),
				store.listPosts(threadId),
			]);
			return { thread, posts };
		},
		[threadId, session.profile?.id],
		["forum"],
	);
	const shown = state.status === "ready" ? state.data.thread : null;
	usePublishScreen(
		shown
			? {
					route: "/foro/[id]",
					title: shown.title,
					entity: { kind: "thread", id: shown.id, name: shown.title },
				}
			: null,
	);

	return (
		<CommunityShell current="forum" aiHref={aiHref}>
			<a
				href="/foro"
				className="q-btn q-btn--ghost -ml-3 self-start px-3"
				aria-label={t.forum.thread.backAria}
			>
				<ArrowLeft size={18} aria-hidden="true" />
				{t.forum.thread.back}
			</a>
			<Loaded state={state} loadingLabel={t.forum.thread.loading}>
				{({ thread, posts }) =>
					thread ? (
						<ThreadView
							thread={thread}
							posts={posts}
							profile={session.profile}
							sessionLoading={session.loading}
							onPublished={reload}
						/>
					) : (
						<EmptyState
							title={t.forum.thread.notFound}
							illustration="/illustrations/page-not-found.svg"
							action={
								<a href="/foro" className="q-btn q-btn--primary">
									{t.forum.thread.viewThreads}
								</a>
							}
						>
							{t.forum.thread.notFoundHint}
						</EmptyState>
					)
				}
			</Loaded>
		</CommunityShell>
	);
}

function ThreadView({
	thread,
	posts,
	profile,
	sessionLoading,
	onPublished,
}: {
	thread: ForumThread;
	posts: ForumPost[];
	profile: Profile | null;
	sessionLoading: boolean;
	onPublished: () => void;
}) {
	const t = useT();
	const replies = t.forum.card.replies(posts.length);
	const point = pointOf(thread);
	// The "Comunidad" layer lists published conversations; a held one shows its point alone.
	const onMapHref = point
		? thread.moderationStatus === "published"
			? mapHref({ conversacion: thread.id })
			: mapHref({
					camera: { lat: point.latitude, lng: point.longitude, zoom: 16 },
				})
		: null;
	return (
		<div className="flex max-w-3xl flex-col gap-5">
			<article className="q-card l-rise relative space-y-3 overflow-hidden rounded-[36px_36px_36px_10px]! bg-[linear-gradient(135deg,var(--gold-soft),var(--surface)_70%)]! px-5 py-6">
				<span
					className="l-geo l-geo--ring l-geo--gold right-6 top-5 max-lg:hidden"
					aria-hidden="true"
				/>
				<span
					className="l-geo l-geo--plus l-geo--green bottom-5 right-20 max-lg:hidden"
					aria-hidden="true"
				/>
				<div className="relative z-[2] flex flex-wrap items-center gap-2">
					<span className="q-badge q-badge--neutral">
						{FORUM_CATEGORY_LABELS[thread.category]}
					</span>
					{thread.moderationStatus === "held" && <HeldBadge />}
					<CitizenReportBadge thread={thread} />
				</div>
				<h1 className="q-h1 break-words">{thread.title}</h1>
				<div className="q-sm q-muted flex items-center gap-2">
					<span className="q-avatar text-xs font-semibold" aria-hidden="true">
						{initials(thread.authorName) || "?"}
					</span>
					<span className="text-[var(--ink)]">{thread.authorName}</span>
					<span aria-hidden="true">·</span>
					<time dateTime={thread.createdAt}>
						{formatRelative(thread.createdAt)}
					</time>
				</div>
				<p className="q-p whitespace-pre-line break-words">{thread.body}</p>
				{point && onMapHref && (
					<LazyMiniMap
						latitude={point.latitude}
						longitude={point.longitude}
						name={thread.title}
						href={onMapHref}
						tone="neutral"
						glyph="chat"
					/>
				)}
				<LinkedContent placeId={thread.placeId} eventId={thread.eventId} />
				<ReportButton kind="thread" id={thread.id} ownerId={thread.authorId} />
			</article>

			<section aria-labelledby="replies-heading" className="space-y-4">
				<h2 id="replies-heading" className="q-h3">
					{replies}
				</h2>
				{posts.length === 0 ? (
					<p className="q-p q-muted">{t.forum.thread.noReplies}</p>
				) : (
					<ol className="flex flex-col gap-4">
						{posts.map((post) => (
							<Reply
								key={post.id}
								post={post}
								own={Boolean(profile && post.authorId === profile.id)}
							/>
						))}
					</ol>
				)}
			</section>

			{sessionLoading ? (
				<Loading />
			) : profile ? (
				<ReplyComposer threadId={thread.id} onPublished={onPublished} />
			) : (
				<div className="q-card space-y-3 px-5 py-5">
					<p className="q-p">{t.forum.thread.signInToReply}</p>
					<a href={signInHref()} className="q-btn q-btn--primary self-start">
						{t.forum.thread.signIn}
					</a>
				</div>
			)}
		</div>
	);
}

function Reply({ post, own }: { post: ForumPost; own: boolean }) {
	const t = useT();
	return (
		<li
			id={`respuesta-${post.id}`}
			className={`q-msg ${own ? "q-msg--user" : "q-msg--ai"} scroll-mt-24`}
		>
			{!own && (
				<span className="q-avatar text-xs font-semibold" aria-hidden="true">
					{initials(post.authorName) || "?"}
				</span>
			)}
			<div className="q-msg__col min-w-0">
				<span className="q-msg__who">
					{own ? t.forum.thread.you : post.authorName}
				</span>
				<p className="q-bubble whitespace-pre-line break-words">{post.body}</p>
				<span className="q-msg__meta flex items-center gap-2">
					<time dateTime={post.createdAt}>
						{formatRelative(post.createdAt)}
					</time>
					{own && post.moderationStatus === "held" && <HeldBadge />}
					<ReportButton
						kind="post"
						id={post.id}
						ownerId={post.authorId}
						compact
					/>
				</span>
			</div>
		</li>
	);
}

function LinkedContent({
	placeId,
	eventId,
}: {
	placeId: string | null;
	eventId: string | null;
}) {
	const { state } = useLoad(
		async (store) => {
			const [places, event] = await Promise.all([
				placeId ? store.listPlaces() : Promise.resolve([]),
				eventId ? store.getEvent(eventId) : Promise.resolve(null),
			]);
			return {
				place: places.find((item) => item.id === placeId) ?? null,
				event,
			};
		},
		[placeId, eventId],
	);
	if (!placeId && !eventId) return null;
	if (state.status !== "ready") return null;
	const { place, event } = state.data;
	if (!place && !event) return null;
	return (
		<div className="flex flex-wrap gap-2 pt-1">
			{place && (
				<a
					href={`/lugares/${encodeURIComponent(place.slug)}`}
					className="q-chip no-underline"
				>
					<MapPin size={16} aria-hidden="true" />
					{place.name}
				</a>
			)}
			{event && (
				<a
					href={`/agenda/${encodeURIComponent(event.id)}`}
					className="q-chip no-underline"
				>
					<CalendarDays size={16} aria-hidden="true" />
					{event.title}
				</a>
			)}
		</div>
	);
}

function ReplyComposer({
	threadId,
	onPublished,
}: {
	threadId: string;
	onPublished: () => void;
}) {
	const t = useT();
	const store = useStore();
	// `?respuesta=` (U16) or Quillart AI can leave the reply written.
	const [body, setBody] = useState(
		() => readPrefill("reply", window.location.search).body ?? "",
	);
	const [byAgent, setByAgent] = useState(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [notice, setNotice] = useState<PublishResult<ForumPost> | null>(null);

	useUiAction("form.prefill", (action) => {
		// Only this conversation's reply: never text meant for another thread.
		if (action.form !== "reply" || action.threadId !== threadId) return null;
		const before = body;
		setBody(action.fields.body ?? "");
		setByAgent(true);
		return {
			labels: [t.dock.formFilled(1)],
			undo: () => {
				setBody(before);
				setByAgent(false);
			},
		};
	});

	async function submit(formEvent: SyntheticEvent<HTMLFormElement>) {
		formEvent.preventDefault();
		const invalid = validatePostBody(body);
		setNotice(null);
		if (invalid) {
			setError(invalid);
			return;
		}
		setError(null);
		setBusy(true);
		try {
			const result = await store.createPost(threadId, body.trim());
			setNotice(result);
			if (result.outcome !== "rejected") {
				setBody("");
				onPublished();
			}
		} catch (caught) {
			setError(
				caught instanceof Error ? caught.message : t.forum.thread.replyError,
			);
		} finally {
			setBusy(false);
		}
	}

	return (
		<form
			id="reply-form"
			onSubmit={submit}
			className="q-card l-rise space-y-3 rounded-[10px_36px_36px_36px]! px-5 py-5"
			noValidate
		>
			<label htmlFor="reply-body" className="q-eyebrow block">
				{t.forum.thread.yourReply}
			</label>
			{byAgent && <AgentMark text={t.dock.filledByAgent} />}
			<textarea
				id="reply-body"
				className={`${textareaClass}${byAgent ? " q-agent-filled" : ""}`}
				value={body}
				maxLength={5000}
				placeholder={t.forum.thread.replyPlaceholder}
				onChange={(change) => setBody(change.target.value)}
			/>
			{error && <ErrorNote message={error} />}
			{notice && <PublishNotice result={notice} />}
			<button
				type="submit"
				className="q-btn q-btn--primary"
				disabled={busy}
				aria-busy={busy}
			>
				{busy ? t.forum.thread.sending : t.forum.thread.reply}
			</button>
		</form>
	);
}
