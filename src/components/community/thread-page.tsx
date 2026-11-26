// One forum conversation: the opening message, its replies and the reply composer.

import { ArrowLeft, CalendarDays, MapPin } from "lucide-react";
import { type SyntheticEvent, useState } from "react";
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

	return (
		<CommunityShell current="forum" aiHref={aiHref}>
			<a
				href="/foro"
				className="q-btn q-btn--ghost -ml-3 self-start px-3"
				aria-label="Volver a Comunidad"
			>
				<ArrowLeft size={18} aria-hidden="true" />
				Comunidad
			</a>
			<Loaded state={state} loadingLabel="Cargando conversación…">
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
							title="No encontramos esta conversación"
							illustration="/illustrations/page-not-found.svg"
							action={
								<a href="/foro" className="q-btn q-btn--primary">
									Ver conversaciones
								</a>
							}
						>
							Puede que la hayan retirado o que el enlace esté incompleto.
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
	const replies =
		posts.length === 1 ? "1 respuesta" : `${posts.length} respuestas`;
	return (
		<div className="flex max-w-3xl flex-col gap-5">
			<article className="q-card space-y-3 px-5 py-5">
				<div className="flex flex-wrap items-center gap-2">
					<span className="q-badge q-badge--neutral">
						{FORUM_CATEGORY_LABELS[thread.category]}
					</span>
					{thread.moderationStatus === "held" && <HeldBadge />}
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
				<LinkedContent placeId={thread.placeId} eventId={thread.eventId} />
			</article>

			<section aria-labelledby="replies-heading" className="space-y-4">
				<h2 id="replies-heading" className="q-h3">
					{replies}
				</h2>
				{posts.length === 0 ? (
					<p className="q-p q-muted">
						Nadie ha respondido todavía. ¿Sabes algo? Cuéntalo.
					</p>
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
					<p className="q-p">Entra con tu cuenta para responder.</p>
					<a href={signInHref()} className="q-btn q-btn--primary self-start">
						Entrar o crear cuenta
					</a>
				</div>
			)}
		</div>
	);
}

function Reply({ post, own }: { post: ForumPost; own: boolean }) {
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
				<span className="q-msg__who">{own ? "Tú" : post.authorName}</span>
				<p className="q-bubble whitespace-pre-line break-words">{post.body}</p>
				<span className="q-msg__meta flex items-center gap-2">
					<time dateTime={post.createdAt}>
						{formatRelative(post.createdAt)}
					</time>
					{own && post.moderationStatus === "held" && <HeldBadge />}
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
	const store = useStore();
	const [body, setBody] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [notice, setNotice] = useState<PublishResult<ForumPost> | null>(null);

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
				caught instanceof Error
					? caught.message
					: "No pudimos enviar tu respuesta. Intenta de nuevo.",
			);
		} finally {
			setBusy(false);
		}
	}

	return (
		<form onSubmit={submit} className="q-card space-y-3 px-5 py-5" noValidate>
			<label htmlFor="reply-body" className="q-eyebrow block">
				Tu respuesta
			</label>
			<textarea
				id="reply-body"
				className={textareaClass}
				value={body}
				maxLength={5000}
				placeholder="Escribe con respeto y sin datos personales…"
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
				{busy ? "Enviando…" : "Responder"}
			</button>
		</form>
	);
}
