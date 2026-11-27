// Community forum: intro, rules, category filter, thread list and the new-thread form.

import { CalendarDays, MapPin, Plus, X } from "lucide-react";
import {
	type ReactNode,
	type SyntheticEvent,
	useEffect,
	useId,
	useState,
} from "react";
import { type GeoPoint, pointOf } from "../../lib/community/community-geo";
import { FORUM_CATEGORY_LABELS } from "../../lib/community/community-labels";
import { validateThreadInput } from "../../lib/community/community-rules";
import type {
	ForumCategory,
	ForumThread,
	PublishResult,
} from "../../lib/community/community-types";
import { readPrefill } from "../../lib/community/form-prefill";
import { useT } from "../../lib/i18n/use-language";
import { AgentMark } from "../agent-dock/agent-mark";
import { usePublishScreen } from "../agent-dock/use-screen-context";
import { useUiAction } from "../agent-dock/use-ui-action";
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
import { LazyPointPicker } from "./lazy-maps";
import { ThreadCard } from "./thread-card";
import { signInHref, useLoad, useSession, useStore } from "./use-community";

const CATEGORIES = Object.keys(FORUM_CATEGORY_LABELS) as ForumCategory[];

interface ForumLinks {
	open: boolean;
	placeId: string | null;
	eventId: string | null;
	/** `?titulo=&texto=&categoria=` (U16). */
	prefill: Record<string, string>;
}

function readLinks(): ForumLinks {
	if (typeof window === "undefined")
		return { open: false, placeId: null, eventId: null, prefill: {} };
	const params = new URLSearchParams(window.location.search);
	const placeId = params.get("lugar");
	const eventId = params.get("evento");
	return {
		open: params.get("nuevo") === "1" || Boolean(placeId || eventId),
		placeId: placeId || null,
		eventId: eventId || null,
		prefill: readPrefill("thread", window.location.search),
	};
}

/** The new-thread form's starting text, and whether Quillart AI wrote it. */
interface ThreadPrefill {
	fields: Record<string, string>;
	byAgent: boolean;
	/** Changes on every prefill so the form starts again with the new text. */
	version: number;
}

export default function ForumPage({ aiHref }: { aiHref?: string }) {
	const t = useT();
	const [initial] = useState(readLinks);
	const [category, setCategory] = useState<ForumCategory | null>(null);
	const [formOpen, setFormOpen] = useState(initial.open);
	const [prefill, setPrefill] = useState<ThreadPrefill>({
		fields: initial.prefill,
		byAgent: false,
		version: 0,
	});
	const [notice, setNotice] = useState<PublishResult<ForumThread> | null>(null);
	const { state, reload } = useLoad(
		(store) => store.listThreads(category ? { category } : {}),
		[category],
		["forum"],
	);

	usePublishScreen({
		route: "/foro",
		title: t.forum.title,
		...(category ? { filters: { categoria: category } } : {}),
	});

	useUiAction("form.prefill", (action) => {
		if (action.form !== "thread") return null;
		const before = { prefill, formOpen };
		setPrefill({
			fields: action.fields,
			byAgent: true,
			version: prefill.version + 1,
		});
		setFormOpen(true);
		return {
			labels: [t.dock.formFilled(Object.keys(action.fields).length)],
			undo: () => {
				setPrefill({ ...before.prefill, version: prefill.version + 2 });
				setFormOpen(before.formOpen);
			},
		};
	});

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
							key={prefill.version}
							prefill={prefill}
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
						className="lq-stagger flex flex-col gap-3"
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
										<div key={thread.id} className="l-rise">
											<ThreadCard thread={thread} />
										</div>
									))
								)
							}
						</Loaded>
					</section>
				</div>

				<aside className="flex flex-col gap-4">
					<CommunityRules />
					<div
						className="q-card l-rise space-y-3 rounded-[28px_28px_28px_6px]! bg-[var(--green-soft)]! px-5 py-5"
						style={{ ["--i" as string]: 2 }}
					>
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
			className="q-chip shrink-0 transition-transform! duration-300 lg:hover:-translate-y-0.5"
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
		<section
			className="q-card l-rise space-y-3 rounded-[10px_44px_10px_44px]! bg-[var(--ink)]! px-6 py-6 text-[var(--bg)]!"
			style={{ ["--i" as string]: 1 }}
			aria-labelledby="rules"
		>
			<span
				className="q-star absolute -right-8 -bottom-10 size-32! text-[color-mix(in_srgb,var(--bg)_9%,transparent)]"
				aria-hidden="true"
			/>
			<h2 id="rules" className="q-h3 lq-h2 relative pr-6">
				{t.forum.rules.title}
			</h2>
			<ul className="q-sm relative list-disc space-y-1.5 pl-5 text-[color-mix(in_srgb,var(--bg)_82%,transparent)]">
				<li>{t.forum.rules.respect}</li>
				<li>{t.forum.rules.noPersonalData}</li>
				<li>{t.forum.rules.riskReports}</li>
				<li>
					{t.forum.rules.emergencyBefore}{" "}
					<strong className="text-[var(--bg)]">123</strong>
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
	prefill,
	initialPlaceId,
	initialEventId,
	onCancel,
	onDone,
}: {
	prefill: ThreadPrefill;
	initialPlaceId: string | null;
	initialEventId: string | null;
	onCancel: () => void;
	onDone: (result: PublishResult<ForumThread>) => void;
}) {
	const t = useT();
	const store = useStore();
	const session = useSession();
	const formId = useId();
	const [title, setTitle] = useState(prefill.fields.title ?? "");
	const [body, setBody] = useState(prefill.fields.body ?? "");
	const [category, setCategory] = useState<ForumCategory>(() => {
		const asked = prefill.fields.category;
		if (asked && CATEGORIES.includes(asked as ForumCategory)) {
			return asked as ForumCategory;
		}
		return initialPlaceId ? "neighborhood" : "general";
	});
	const filled = (field: string) =>
		prefill.byAgent && prefill.fields[field] ? " q-agent-filled" : "";
	const [place, setPlace] = useState<Attachment | null>(
		initialPlaceId ? { id: initialPlaceId, name: null } : null,
	);
	const [event, setEvent] = useState<Attachment | null>(
		initialEventId ? { id: initialEventId, name: null } : null,
	);
	// Optional point of what the conversation is about; the place or event lends theirs.
	const [point, setPoint] = useState<GeoPoint | null>(null);
	const [pointNote, setPointNote] = useState<string | null>(null);
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
				const lent = found ? pointOf({}, found) : null;
				if (active && found && lent) {
					setPoint((current) => current ?? lent);
					setPointNote(t.geo.picker.fromPlace(found.name));
				}
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
	}, [store, initialPlaceId, t]);

	useEffect(() => {
		if (!initialEventId) return;
		let active = true;
		store
			.getEvent(initialEventId)
			.then((found) => {
				const lent = found ? pointOf(found) : null;
				if (active && found && lent) {
					setPoint((current) => current ?? lent);
					setPointNote(t.geo.picker.fromPlace(found.title));
				}
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
	}, [store, initialEventId, t]);

	if (session.loading) return <Loading />;
	if (!session.profile)
		return (
			<div className="q-card l-rise space-y-3 rounded-[28px_64px_28px_28px]! bg-[var(--gold-soft)]! px-5 py-5 pr-8">
				<h2 className="q-h3 lq-h2">{t.forum.form.signInTitle}</h2>
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
			latitude: point?.latitude ?? null,
			longitude: point?.longitude ?? null,
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
			id="thread-form"
			onSubmit={submit}
			className="q-card l-rise space-y-4 rounded-[32px_32px_32px_8px]! px-5 py-6 lg:px-7"
			aria-labelledby={`${formId}-heading`}
			noValidate
		>
			<h2 id={`${formId}-heading`} className="q-h3 lq-h2">
				{t.forum.newThread}
			</h2>
			{prefill.byAgent && <AgentMark text={t.dock.filledByAgent} />}
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
					className={`${inputClass}${filled("title")}`}
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
					className={`${inputClass}${filled("category")}`}
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
					className={`${textareaClass}${filled("body")}`}
					value={body}
					required
					placeholder={t.forum.form.messagePlaceholder}
					onChange={(change) => setBody(change.target.value)}
				/>
			</Field>
			<LazyPointPicker
				title={
					category === "safety"
						? t.geo.picker.safetyTitle
						: t.geo.picker.threadTitle
				}
				hint={t.geo.picker.threadHint}
				value={point}
				note={pointNote}
				onChange={(next) => {
					setPoint(next);
					setPointNote(null);
				}}
			/>
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
