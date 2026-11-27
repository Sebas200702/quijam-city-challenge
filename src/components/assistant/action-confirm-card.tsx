// Asks the person to confirm an action Quillart AI proposed, in the interface language.
// Anything that will be published is shown word for word (speech-to-text
// slips and injected text become visible) and can be edited before confirming.

import { LogIn, TriangleAlert } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { AGENT_LABELS } from "../../lib/assistant/assistant-labels";
import type {
	AssistantToolArgs,
	AssistantToolCall,
} from "../../lib/assistant/assistant-types";
import { eventWhen } from "../../lib/assistant/tool-executor";
import {
	EVENT_CATEGORY_LABELS,
	FORUM_CATEGORY_LABELS,
	formatCop,
	formatEventDay,
	formatTime,
} from "../../lib/community/community-labels";
import { bogotaLocalToIso } from "../../lib/community/community-rules";
import type { CommunityStore } from "../../lib/community/community-types";
import { messages } from "../../lib/i18n/messages";
import { getLanguage, useT } from "../../lib/i18n/use-language";
import { inputClass, textareaClass } from "../community/community-ui";
import { signInHref, useStore } from "../community/use-community";
import {
	EDITABLE_TEXT_FIELDS,
	type EditableText,
	type PendingAction,
} from "./use-assistant";

/** The exact text that will be published, shown in full. */
export interface PublishedText {
	title: string | null;
	body: string;
}

export interface ActionText {
	title: string;
	/** Present for actions that publish text. */
	quote: PublishedText | null;
}

/** Exact title and body an action will publish, or null when it publishes none. */
export function publishedText(call: AssistantToolCall): PublishedText | null {
	switch (call.name) {
		case "create_event": {
			const args = call.args as AssistantToolArgs["create_event"];
			return { title: args.title, body: args.description };
		}
		case "create_thread": {
			const args = call.args as AssistantToolArgs["create_thread"];
			return { title: args.title, body: args.body };
		}
		case "reply_to_thread": {
			const args = call.args as AssistantToolArgs["reply_to_thread"];
			return { title: null, body: args.body };
		}
		case "report_issue": {
			const args = call.args as AssistantToolArgs["report_issue"];
			return { title: null, body: args.description };
		}
		default:
			return null;
	}
}

function localWhen(value: string): string | null {
	const iso = bogotaLocalToIso(value);
	return iso ? `${formatEventDay(iso)}, ${formatTime(iso)}` : null;
}

async function placeName(store: CommunityStore, slug?: string) {
	if (!slug) return null;
	return (await store.getPlace(slug))?.name ?? null;
}

async function eventLine(store: CommunityStore, id: string) {
	const event = await store.getEvent(id);
	return event
		? `«${event.title}» · ${eventWhen(event)}`
		: messages[getLanguage()].shared.confirm.thisEvent;
}

/** One clear sentence of what will happen, plus a short detail. */
export async function describeAction(
	call: AssistantToolCall,
	store: CommunityStore,
): Promise<ActionText> {
	const c = messages[getLanguage()].shared.confirm;
	switch (call.name) {
		case "register_for_event": {
			const args = call.args as AssistantToolArgs["register_for_event"];
			return {
				title: c.register(await eventLine(store, args.event_id)),
				quote: null,
			};
		}
		case "unregister_from_event": {
			const args = call.args as AssistantToolArgs["unregister_from_event"];
			return {
				title: c.unregister(await eventLine(store, args.event_id)),
				quote: null,
			};
		}
		case "create_event": {
			const args = call.args as AssistantToolArgs["create_event"];
			const where =
				(await placeName(store, args.place_slug)) ?? args.location_text ?? null;
			const agenda = messages[getLanguage()].agenda;
			const parts = [
				localWhen(args.starts_at_local),
				where,
				EVENT_CATEGORY_LABELS[args.category],
				args.capacity ? agenda.spotsLeft(args.capacity) : null,
				args.price_cop ? formatCop(args.price_cop) : agenda.free,
			].filter(Boolean);
			return {
				title: c.createEvent(parts.join(" · ")),
				quote: publishedText(call),
			};
		}
		case "create_thread": {
			const args = call.args as AssistantToolArgs["create_thread"];
			return {
				title: c.createThread(
					FORUM_CATEGORY_LABELS[args.category] ?? c.community,
				),
				quote: publishedText(call),
			};
		}
		case "reply_to_thread": {
			const args = call.args as AssistantToolArgs["reply_to_thread"];
			const thread = await store.getThread(args.thread_id);
			return {
				title: c.reply(thread?.title ?? c.theConversation),
				quote: publishedText(call),
			};
		}
		case "report_issue": {
			const args = call.args as AssistantToolArgs["report_issue"];
			const where = await placeName(store, args.place_slug);
			return {
				title: c.report(where ?? ""),
				quote: publishedText(call),
			};
		}
		default:
			return { title: c.fallbackTitle, quote: null };
	}
}

/** Current values of the editable fields of a call. */
function editableValues(action: PendingAction): EditableText {
	const args = action.call.args as Record<string, unknown>;
	const fields = EDITABLE_TEXT_FIELDS[action.call.name] ?? [];
	return Object.fromEntries(
		fields.map((field) => [
			field,
			typeof args[field] === "string" ? args[field] : "",
		]),
	);
}

function QuotedText({ quote }: { quote: PublishedText }) {
	const t = useT();
	return (
		<div className="flex flex-col gap-1">
			<p className="q-sm q-muted">{t.shared.confirm.quoteIntro}</p>
			<blockquote
				className="whitespace-pre-wrap break-words rounded-[6px_22px_22px_22px] border-l-4 border-[var(--gold)] bg-[var(--gold-soft)] px-4 py-3 text-[var(--ink)]"
				data-testid="action-quote"
			>
				{quote.title && <p className="font-semibold">{quote.title}</p>}
				<p>{quote.body}</p>
			</blockquote>
		</div>
	);
}

function EditForm({
	action,
	onDone,
}: {
	action: PendingAction;
	onDone: () => void;
}) {
	const t = useT();
	const c = t.shared.confirm;
	const fieldLabels: Record<keyof EditableText, string> = {
		title: c.fieldTitle,
		body: c.fieldBody,
		description: c.fieldDescription,
	};
	const baseId = useId();
	const fields = EDITABLE_TEXT_FIELDS[action.call.name] ?? [];
	const [values, setValues] = useState<EditableText>(() =>
		editableValues(action),
	);
	const [invalid, setInvalid] = useState(false);

	const save = () => {
		if (action.edit(values)) onDone();
		else setInvalid(true);
	};

	return (
		<div className="flex flex-col gap-3">
			{fields.map((field) => {
				const id = `${baseId}-${field}`;
				const value = values[field] ?? "";
				const update = (next: string) => {
					setInvalid(false);
					setValues((current) => ({ ...current, [field]: next }));
				};
				return (
					<div key={field} className="flex flex-col gap-1">
						<label htmlFor={id} className="q-sm font-semibold">
							{fieldLabels[field]}
						</label>
						{field === "title" ? (
							<input
								id={id}
								className={inputClass}
								value={value}
								maxLength={120}
								onChange={(event) => update(event.target.value)}
							/>
						) : (
							<textarea
								id={id}
								className={textareaClass}
								value={value}
								maxLength={action.call.name === "report_issue" ? 1000 : 2000}
								onChange={(event) => update(event.target.value)}
							/>
						)}
					</div>
				);
			})}
			{invalid && (
				<p className="q-sm" role="alert">
					{c.invalid}
				</p>
			)}
			<div className="flex flex-wrap gap-2">
				<button
					type="button"
					className="q-btn q-btn--primary min-h-11"
					onClick={save}
				>
					{c.save}
				</button>
				<button
					type="button"
					className="q-btn q-btn--secondary min-h-11"
					onClick={onDone}
				>
					{c.discard}
				</button>
			</div>
		</div>
	);
}

export function ActionConfirmCard({
	action,
	signedIn,
	onConfirm,
	onCancel,
}: {
	action: PendingAction;
	signedIn: boolean;
	onConfirm: () => void;
	onCancel: () => void;
}) {
	const t = useT();
	const c = t.shared.confirm;
	const store = useStore();
	const [text, setText] = useState<ActionText | null>(null);
	const [editing, setEditing] = useState(false);
	const editable = EDITABLE_TEXT_FIELDS[action.call.name] !== undefined;

	// biome-ignore lint/correctness/useExhaustiveDependencies: `t` re-describes the action when the language changes.
	useEffect(() => {
		let active = true;
		describeAction(action.call, store)
			.catch(
				(): ActionText => ({
					title: messages[getLanguage()].shared.confirm.fallbackTitle,
					quote: publishedText(action.call),
				}),
			)
			.then((value) => active && setText(value));
		return () => {
			active = false;
		};
	}, [action.call, store, t]);

	return (
		<section
			className="q-card q-card--raised la-confirm gap-3 p-5"
			aria-label={c.ariaLabel}
		>
			<p className="l-eyebrow l-eyebrow--sunk">
				<span className="q-star" aria-hidden="true" />
				{AGENT_LABELS[action.agent]} · {c.eyebrowSuffix}
			</p>
			{!action.grounded && (
				<p className="q-sm flex items-start gap-2 font-semibold" role="alert">
					<TriangleAlert
						size={18}
						aria-hidden="true"
						className="mt-0.5 shrink-0"
					/>
					{c.ungroundedWarning}
				</p>
			)}
			<p className="q-h3 break-words">{text?.title ?? c.preparing}</p>
			{editing ? (
				<EditForm action={action} onDone={() => setEditing(false)} />
			) : (
				text?.quote && <QuotedText quote={text.quote} />
			)}
			{!signedIn && <p className="q-sm q-muted">{c.signInNeeded}</p>}
			{!editing && (
				<div className="flex flex-wrap gap-2">
					{signedIn ? (
						<button
							type="button"
							className="q-btn q-btn--primary min-h-11"
							onClick={onConfirm}
							disabled={action.running || !text}
							aria-busy={action.running}
						>
							{action.running ? c.running : c.confirm}
						</button>
					) : (
						<a className="q-btn q-btn--primary min-h-11" href={signInHref()}>
							<LogIn size={18} aria-hidden="true" />
							{c.signIn}
						</a>
					)}
					{editable && (
						<button
							type="button"
							className="q-btn q-btn--secondary min-h-11"
							onClick={() => setEditing(true)}
							disabled={action.running}
						>
							{c.edit}
						</button>
					)}
					<button
						type="button"
						className="q-btn q-btn--secondary min-h-11"
						onClick={onCancel}
						disabled={action.running}
					>
						{c.cancel}
					</button>
				</div>
			)}
		</section>
	);
}
