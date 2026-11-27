// Asks the person to confirm an action Quillart AI proposed, in plain Spanish.
// Anything that will be published is shown word for word (speech-to-text
// slips and injected text become visible) and can be edited before confirming.

import { LogIn, TriangleAlert } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { UNGROUNDED_WARNING } from "../../lib/assistant/action-provenance";
import { AGENT_LABELS } from "../../lib/assistant/assistant-labels";
import type {
	AssistantToolArgs,
	AssistantToolCall,
} from "../../lib/assistant/assistant-types";
import { eventWhen } from "../../lib/assistant/tool-executor";
import {
	EVENT_CATEGORY_LABELS,
	FORUM_CATEGORY_LABELS,
	formatEventDay,
	formatTime,
} from "../../lib/community/community-labels";
import { bogotaLocalToIso } from "../../lib/community/community-rules";
import type { CommunityStore } from "../../lib/community/community-types";
import { useLanguage } from "../../lib/i18n/use-language";
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
	return event ? `«${event.title}» · ${eventWhen(event)}` : "este evento";
}

/** One clear sentence of what will happen, plus a short detail. */
export async function describeAction(
	call: AssistantToolCall,
	store: CommunityStore,
): Promise<ActionText> {
	switch (call.name) {
		case "register_for_event": {
			const args = call.args as AssistantToolArgs["register_for_event"];
			return {
				title: `Inscribirte en ${await eventLine(store, args.event_id)}`,
				quote: null,
			};
		}
		case "unregister_from_event": {
			const args = call.args as AssistantToolArgs["unregister_from_event"];
			return {
				title: `Cancelar tu inscripción en ${await eventLine(store, args.event_id)}`,
				quote: null,
			};
		}
		case "create_event": {
			const args = call.args as AssistantToolArgs["create_event"];
			const where =
				(await placeName(store, args.place_slug)) ?? args.location_text ?? null;
			const parts = [
				localWhen(args.starts_at_local),
				where,
				EVENT_CATEGORY_LABELS[args.category],
			].filter(Boolean);
			return {
				title: `Publicar un evento${parts.length ? ` · ${parts.join(" · ")}` : ""}`,
				quote: publishedText(call),
			};
		}
		case "create_thread": {
			const args = call.args as AssistantToolArgs["create_thread"];
			return {
				title: `Abrir una conversación en ${FORUM_CATEGORY_LABELS[args.category] ?? "Comunidad"}`,
				quote: publishedText(call),
			};
		}
		case "reply_to_thread": {
			const args = call.args as AssistantToolArgs["reply_to_thread"];
			const thread = await store.getThread(args.thread_id);
			return {
				title: `Responder en «${thread?.title ?? "la conversación"}»`,
				quote: publishedText(call),
			};
		}
		case "report_issue": {
			const args = call.args as AssistantToolArgs["report_issue"];
			const where = await placeName(store, args.place_slug);
			return {
				title: `Reportar a la ciudad${where ? ` en ${where}` : ""}`,
				quote: publishedText(call),
			};
		}
		default:
			return { title: "Hacer esta acción", quote: null };
	}
}

const FIELD_LABELS: Record<keyof EditableText, string> = {
	title: "Título",
	body: "Mensaje",
	description: "Descripción",
};

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
	return (
		<div className="flex flex-col gap-1">
			<p className="q-sm q-muted">Esto es lo que se publicará, tal cual:</p>
			<blockquote
				className="whitespace-pre-wrap break-words rounded-[var(--radius-md)] border-l-4 border-[var(--line-control)] bg-[var(--bg)] px-4 py-3"
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
							{FIELD_LABELS[field]}
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
					Revisa el texto: no puede quedar vacío ni ser demasiado largo.
				</p>
			)}
			<div className="flex flex-wrap gap-2">
				<button
					type="button"
					className="q-btn q-btn--primary min-h-11"
					onClick={save}
				>
					Guardar cambios
				</button>
				<button
					type="button"
					className="q-btn q-btn--secondary min-h-11"
					onClick={onDone}
				>
					Descartar cambios
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
	useLanguage();
	const store = useStore();
	const [text, setText] = useState<ActionText | null>(null);
	const [editing, setEditing] = useState(false);
	const editable = EDITABLE_TEXT_FIELDS[action.call.name] !== undefined;

	useEffect(() => {
		let active = true;
		describeAction(action.call, store)
			.catch(
				(): ActionText => ({
					title: "Hacer esta acción",
					quote: publishedText(action.call),
				}),
			)
			.then((value) => active && setText(value));
		return () => {
			active = false;
		};
	}, [action.call, store]);

	return (
		<section
			className="q-card q-card--raised gap-3 p-4"
			aria-label="Confirma la acción"
		>
			<p className="q-eyebrow">{AGENT_LABELS[action.agent]} · ¿Lo hacemos?</p>
			{!action.grounded && (
				<p className="q-sm flex items-start gap-2 font-semibold" role="alert">
					<TriangleAlert
						size={18}
						aria-hidden="true"
						className="mt-0.5 shrink-0"
					/>
					{UNGROUNDED_WARNING}
				</p>
			)}
			<p className="q-h3 break-words">{text?.title ?? "Preparando…"}</p>
			{editing ? (
				<EditForm action={action} onDone={() => setEditing(false)} />
			) : (
				text?.quote && <QuotedText quote={text.quote} />
			)}
			{!signedIn && (
				<p className="q-sm q-muted">
					Para hacerlo necesitas iniciar sesión. Al volver, tu conversación te
					espera aquí.
				</p>
			)}
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
							{action.running ? "Haciéndolo…" : "Confirmar"}
						</button>
					) : (
						<a className="q-btn q-btn--primary min-h-11" href={signInHref()}>
							<LogIn size={18} aria-hidden="true" />
							Inicia sesión
						</a>
					)}
					{editable && (
						<button
							type="button"
							className="q-btn q-btn--secondary min-h-11"
							onClick={() => setEditing(true)}
							disabled={action.running}
						>
							Editar
						</button>
					)}
					<button
						type="button"
						className="q-btn q-btn--secondary min-h-11"
						onClick={onCancel}
						disabled={action.running}
					>
						Cancelar
					</button>
				</div>
			)}
		</section>
	);
}
