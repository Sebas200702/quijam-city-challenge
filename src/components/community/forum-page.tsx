// Community forum: intro, rules, category filter, thread list and the new-thread form.

import { CalendarDays, MapPin, Plus, X } from "lucide-react";
import {
	type ReactNode,
	type SyntheticEvent,
	useEffect,
	useId,
	useState,
} from "react";
import { FORUM_CATEGORY_LABELS } from "../../lib/community/community-labels";
import { validateThreadInput } from "../../lib/community/community-rules";
import type {
	ForumCategory,
	ForumThread,
	PublishResult,
} from "../../lib/community/community-types";
import { useT } from "../../lib/i18n/use-language";
import { AskQuillartButton } from "../assistant/ask-quillart-button";
import { CommunityShell } from "./community-shell";
import {
	EmptyState,
	ErrorNote,
	Field,
	inputClass,
	Loaded,
	Loading,
	PageTitle,
	PublishNotice,
	textareaClass,
} from "./community-ui";
import { ThreadCard } from "./thread-card";
import { signInHref, useLoad, useSession, useStore } from "./use-community";

const CATEGORIES = Object.keys(FORUM_CATEGORY_LABELS) as ForumCategory[];

interface ForumLinks {
	open: boolean;
	placeId: string | null;
	eventId: string | null;
}

function readLinks(): ForumLinks {
	if (typeof window === "undefined")
		return { open: false, placeId: null, eventId: null };
	const params = new URLSearchParams(window.location.search);
	const placeId = params.get("lugar");
	const eventId = params.get("evento");
	return {
		open: params.get("nuevo") === "1" || Boolean(placeId || eventId),
		placeId: placeId || null,
		eventId: eventId || null,
	};
}

export default function ForumPage({ aiHref }: { aiHref?: string }) {
	const t = useT();
	const [initial] = useState(readLinks);
	const [category, setCategory] = useState<ForumCategory | null>(null);
	const [formOpen, setFormOpen] = useState(initial.open);
	const [notice, setNotice] = useState<PublishResult<ForumThread> | null>(null);
	const { state, reload } = useLoad(
		(store) => store.listThreads(category ? { category } : {}),
		[category],
		["forum"],
	);

	return (
		<CommunityShell current="forum" aiHref={aiHref}>
			<PageTitle
				eyebrow={t.forum.eyebrow}
				title={t.forum.title}
				illustration="/illustrations/public-discussion.svg"
				action={
					!formOpen && (
						<button
							type="button"
							className="q-btn q-btn--primary"
							onClick={() => {
								setFormOpen(true);
								setNotice(null);
							}}
						>
							<Plus size={18} aria-hidden="true" />
							{t.forum.newThread}
						</button>
					)
				}
			>
				{t.forum.intro}
			</PageTitle>

			<div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-8">
				<div className="flex min-w-0 flex-col gap-5">
					{formOpen && (
						<NewThreadForm
							initialPlaceId={initial.placeId}
							initialEventId={initial.eventId}
							onCancel={() => setFormOpen(false)}
							onDone={(result) => {
								setNotice(result);
								setFormOpen(false);
								reload();
							}}
						/>
					)}
					{notice && (
						<div className="space-y-2">
							<PublishNotice result={notice} />
							{notice.record && (
								<a
									href={`/foro/${encodeURIComponent(notice.record.id)}`}
									className="q-btn q-btn--secondary"
								>
									{t.forum.viewYourThread}
								</a>
							)}
						</div>
					)}

					<fieldset className="min-w-0">
						<legend className="q-eyebrow mb-2">{t.forum.filterByTopic}</legend>
						<div className="q-scroll-fade flex gap-2 overflow-x-auto pb-1">
							<CategoryChip
								label={t.forum.allTopics}
								selected={category === null}
								onSelect={() => setCategory(null)}
							/>
							{CATEGORIES.map((value) => (
								<CategoryChip
									key={value}
									label={FORUM_CATEGORY_LABELS[value]}
									selected={category === value}
									onSelect={() => setCategory(value)}
								/>
							))}
						</div>
					</fieldset>

					<section
						aria-label={t.forum.conversations}
						className="flex flex-col gap-3"
					>
						<Loaded state={state} loadingLabel={t.forum.loadingThreads}>
							{(threads) =>
								threads.length === 0 ? (
									<EmptyState
										illustration="/illustrations/online-community.svg"
										title={
											category
												? t.forum.emptyInCategory(
														FORUM_CATEGORY_LABELS[category].toLowerCase(),
													)
												: t.forum.empty
										}
										action={
											!formOpen && (
												<button
													type="button"
													className="q-btn q-btn--primary"
													onClick={() => setFormOpen(true)}
												>
													{t.forum.startOne}
												</button>
											)
										}
									>
										{t.forum.emptyHint}
									</EmptyState>
								) : (
									threads.map((thread) => (
										<ThreadCard key={thread.id} thread={thread} />
									))
								)
							}
						</Loaded>
					</section>
				</div>

				<aside className="flex flex-col gap-4">
					<CommunityRules />
					<div className="q-card space-y-3 px-5 py-4">
						<p className="q-p">{t.forum.reportPrompt}</p>
						<AskQuillartButton
							prompt={t.forum.reportWithQuillartPrompt}
							label={t.forum.reportWithQuillart}
						/>
					</div>
				</aside>
			</div>
		</CommunityShell>
	);
}

function CategoryChip({
	label,
	selected,
	onSelect,
}: {
	label: string;
	selected: boolean;
	onSelect: () => void;
}) {
	return (
		<button
			type="button"
			aria-pressed={selected}
			onClick={onSelect}
			className="q-chip shrink-0"
			style={
				selected
					? { background: "var(--gold)", color: "var(--on-gold)" }
					: undefined
			}
		>
			{label}
		</button>
	);
}

function CommunityRules() {
	const t = useT();
	return (
		<section className="q-card space-y-2 px-5 py-4" aria-labelledby="rules">
			<h2 id="rules" className="q-h3">
				{t.forum.rules.title}
			</h2>
			<ul className="q-sm q-muted list-disc space-y-1 pl-5">
				<li>{t.forum.rules.respect}</li>
				<li>{t.forum.rules.noPersonalData}</li>
				<li>{t.forum.rules.riskReports}</li>
				<li>
					{t.forum.rules.emergencyBefore}{" "}
					<strong className="text-[var(--ink)]">123</strong>
					{t.forum.rules.emergencyAfter}
				</li>
				<li>{t.forum.rules.moderation}</li>
			</ul>
		</section>
	);
}

interface Attachment {
	id: string;
	name: string | null;
}

function NewThreadForm({
	initialPlaceId,
	initialEventId,
	onCancel,
	onDone,
}: {
	initialPlaceId: string | null;
	initialEventId: string | null;
	onCancel: () => void;
	onDone: (result: PublishResult<ForumThread>) => void;
}) {
	const t = useT();
	const store = useStore();
	const session = useSession();
	const formId = useId();
	const [title, setTitle] = useState("");
	const [body, setBody] = useState("");
	const [category, setCategory] = useState<ForumCategory>(
		initialPlaceId ? "neighborhood" : "general",
	);
	const [place, setPlace] = useState<Attachment | null>(
		initialPlaceId ? { id: initialPlaceId, name: null } : null,
	);
	const [event, setEvent] = useState<Attachment | null>(
		initialEventId ? { id: initialEventId, name: null } : null,
	);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [rejected, setRejected] = useState<PublishResult<ForumThread> | null>(
		null,
	);

	useEffect(() => {
		if (!initialPlaceId) return;
		let active = true;
		store
			.listPlaces()
			.then((places) => {
				const found = places.find((item) => item.id === initialPlaceId);
				if (active)
					setPlace((current) =>
						current
							? found
								? { id: found.id, name: found.name }
								: null
							: current,
					);
			})
			.catch(() => undefined);
		return () => {
			active = false;
		};
	}, [store, initialPlaceId]);

	useEffect(() => {
		if (!initialEventId) return;
		let active = true;
		store
			.getEvent(initialEventId)
			.then((found) => {
				if (active)
					setEvent((current) =>
						current
							? found
								? { id: found.id, name: found.title }
								: null
							: current,
					);
			})
			.catch(() => undefined);
		return () => {
			active = false;
		};
	}, [store, initialEventId]);

	if (session.loading) return <Loading />;
	if (!session.profile)
		return (
			<div className="q-card space-y-3 px-5 py-5">
				<h2 className="q-h3">{t.forum.form.signInTitle}</h2>
				<p className="q-p q-muted">{t.forum.form.signInBody}</p>
				<div className="flex flex-wrap gap-2">
					<a href={signInHref()} className="q-btn q-btn--primary">
						{t.forum.form.signIn}
					</a>
					<button
						type="button"
						className="q-btn q-btn--ghost"
						onClick={onCancel}
					>
						{t.forum.form.notNow}
					</button>
				</div>
			</div>
		);

	async function submit(formEvent: SyntheticEvent<HTMLFormElement>) {
		formEvent.preventDefault();
		const input = {
			title,
			body,
			category,
			placeId: place?.id ?? null,
			eventId: event?.id ?? null,
		};
		const invalid = validateThreadInput(input);
		setRejected(null);
		if (invalid) {
			setError(invalid);
			return;
		}
		setError(null);
		setBusy(true);
		try {
			const result = await store.createThread({
				...input,
				title: title.trim(),
				body: body.trim(),
			});
			if (result.outcome === "rejected") setRejected(result);
			else onDone(result);
		} catch (caught) {
			setError(
				caught instanceof Error ? caught.message : t.forum.form.publishError,
			);
		} finally {
			setBusy(false);
		}
	}

	return (
		<form
			onSubmit={submit}
			className="q-card space-y-4 px-5 py-5"
			aria-labelledby={`${formId}-heading`}
			noValidate
		>
			<h2 id={`${formId}-heading`} className="q-h3">
				{t.forum.newThread}
			</h2>
			{(place || event) && (
				<div className="flex flex-wrap gap-2">
					{place && (
						<AttachmentChip
							icon={<MapPin size={16} aria-hidden="true" />}
							label={place.name ?? t.forum.form.place}
							onRemove={() => setPlace(null)}
						/>
					)}
					{event && (
						<AttachmentChip
							icon={<CalendarDays size={16} aria-hidden="true" />}
							label={event.name ?? t.forum.form.event}
							onRemove={() => setEvent(null)}
						/>
					)}
				</div>
			)}
			<Field id={`${formId}-title`} label={t.forum.form.titleLabel}>
				<input
					id={`${formId}-title`}
					className={inputClass}
					value={title}
					maxLength={140}
					required
					placeholder={t.forum.form.titlePlaceholder}
					onChange={(change) => setTitle(change.target.value)}
				/>
			</Field>
			<Field id={`${formId}-category`} label={t.forum.form.topic}>
				<select
					id={`${formId}-category`}
					className={inputClass}
					value={category}
					onChange={(change) =>
						setCategory(change.target.value as ForumCategory)
					}
				>
					{CATEGORIES.map((value) => (
						<option key={value} value={value}>
							{FORUM_CATEGORY_LABELS[value]}
						</option>
					))}
				</select>
			</Field>
			<Field
				id={`${formId}-body`}
				label={t.forum.form.message}
				hint={t.forum.form.messageHint}
			>
				<textarea
					id={`${formId}-body`}
					className={textareaClass}
					value={body}
					required
					placeholder={t.forum.form.messagePlaceholder}
					onChange={(change) => setBody(change.target.value)}
				/>
			</Field>
			{error && <ErrorNote message={error} />}
			{rejected && <PublishNotice result={rejected} />}
			<div className="flex flex-wrap gap-2">
				<button
					type="submit"
					className="q-btn q-btn--primary"
					disabled={busy}
					aria-busy={busy}
				>
					{busy ? t.forum.form.publishing : t.forum.form.publish}
				</button>
				<button
					type="button"
					className="q-btn q-btn--ghost"
					onClick={onCancel}
					disabled={busy}
				>
					{t.forum.form.cancel}
				</button>
			</div>
		</form>
	);
}

function AttachmentChip({
	icon,
	label,
	onRemove,
}: {
	icon: ReactNode;
	label: string;
	onRemove: () => void;
}) {
	const t = useT();
	return (
		<span className="q-badge q-badge--high min-h-11 gap-1.5 pr-1 pl-3">
			{icon}
			<span className="max-w-[16rem] truncate">{label}</span>
			<button
				type="button"
				onClick={onRemove}
				aria-label={t.forum.form.remove(label)}
				className="grid size-11 place-items-center rounded-full"
			>
				<X size={16} aria-hidden="true" />
			</button>
		</span>
	);
}
