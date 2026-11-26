// Asks the person to confirm an action Quillart AI proposed, in plain Spanish.

import { LogIn } from "lucide-react";
import { useEffect, useState } from "react";
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
import { signInHref, useStore } from "../community/use-community";
import type { PendingAction } from "./use-assistant";

interface ActionText {
	title: string;
	detail: string | null;
}

function preview(text: string, length = 140): string {
	const clean = text.trim().replace(/\s+/g, " ");
	return clean.length > length ? `${clean.slice(0, length - 1)}…` : clean;
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
				detail: null,
			};
		}
		case "unregister_from_event": {
			const args = call.args as AssistantToolArgs["unregister_from_event"];
			return {
				title: `Cancelar tu inscripción en ${await eventLine(store, args.event_id)}`,
				detail: null,
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
				title: `Publicar el evento «${args.title}»${parts.length ? ` · ${parts.join(" · ")}` : ""}`,
				detail: preview(args.description),
			};
		}
		case "create_thread": {
			const args = call.args as AssistantToolArgs["create_thread"];
			return {
				title: `Abrir la conversación «${args.title}» en ${FORUM_CATEGORY_LABELS[args.category] ?? "Comunidad"}`,
				detail: preview(args.body),
			};
		}
		case "reply_to_thread": {
			const args = call.args as AssistantToolArgs["reply_to_thread"];
			const thread = await store.getThread(args.thread_id);
			return {
				title: `Responder en «${thread?.title ?? "la conversación"}»`,
				detail: preview(args.body),
			};
		}
		case "report_issue": {
			const args = call.args as AssistantToolArgs["report_issue"];
			const where = await placeName(store, args.place_slug);
			return {
				title: `Reportar a la ciudad${where ? ` en ${where}` : ""}`,
				detail: preview(args.description),
			};
		}
		default:
			return { title: "Hacer esta acción", detail: null };
	}
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
	const store = useStore();
	const [text, setText] = useState<ActionText | null>(null);

	useEffect(() => {
		let active = true;
		describeAction(action.call, store)
			.catch(() => ({ title: "Hacer esta acción", detail: null }))
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
			<p className="q-h3 break-words">{text?.title ?? "Preparando…"}</p>
			{text?.detail && (
				<p className="q-sm q-muted break-words">{text.detail}</p>
			)}
			{!signedIn && (
				<p className="q-sm q-muted">
					Para hacerlo necesitas iniciar sesión. Al volver, tu conversación te
					espera aquí.
				</p>
			)}
			<div className="flex flex-wrap gap-2">
				{signedIn ? (
					<button
						type="button"
						className="q-btn q-btn--primary min-h-11"
						onClick={onConfirm}
						disabled={action.running}
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
				<button
					type="button"
					className="q-btn q-btn--secondary min-h-11"
					onClick={onCancel}
					disabled={action.running}
				>
					Cancelar
				</button>
			</div>
		</section>
	);
}
