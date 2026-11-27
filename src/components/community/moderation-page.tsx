// City moderation queue: urgent reports, reports for the city and held content.

import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import { formatRelative } from "../../lib/community/community-labels";
import type {
	ModerationAction,
	ModerationQueueItem,
} from "../../lib/community/community-types";
import type {
	ContentKind,
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

const KIND_LABELS: Record<ContentKind, string> = {
	event: "Evento",
	thread: "Conversación",
	post: "Respuesta",
};

const LABEL_NAMES: Record<ModerationLabel, string> = {
	ok: "Sin problemas",
	personal_data: "Datos personales",
	harassment: "Ofensivo",
	hate: "Odio o discriminación",
	threat: "Amenaza",
	sexual: "Contenido sexual",
	spam: "Publicidad",
	scam: "Posible estafa",
	misinformation: "Posible desinformación",
	impersonation: "Suplantación",
	off_topic: "Fuera de tema",
};

const SOURCE_LABELS: Record<ModerationQueueItem["source"], string> = {
	rules: "Reglas",
	openjev: "OpenJev",
	moderator: "Moderador",
};

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
	const session = useSession();
	return (
		<CommunityShell current="forum" aiHref={aiHref}>
			<PageTitle
				eyebrow="Alcaldía"
				title="Moderación"
				illustration="/illustrations/for-review.svg"
			>
				La revisión es un triaje automático: primero reglas fijas, luego
				OpenJev. Lo dudoso llega aquí y una persona decide.
			</PageTitle>
			{session.loading ? (
				<Loading />
			) : session.profile ? (
				<ModerationGate profileId={session.profile.id} />
			) : (
				<EmptyState
					title="Entra con tu cuenta de la ciudad"
					illustration="/illustrations/secure-login.svg"
					action={
						<a href={signInHref()} className="q-btn q-btn--primary">
							Entrar
						</a>
					}
				>
					La cola de moderación es solo para el equipo de la Alcaldía.
				</EmptyState>
			)}
		</CommunityShell>
	);
}

function ModerationGate({ profileId }: { profileId: string }) {
	const { state } = useLoad((store) => store.canModerate(), [profileId]);
	return (
		<Loaded state={state} loadingLabel="Revisando tus permisos…">
			{(allowed) =>
				allowed ? (
					<ModerationQueue profileId={profileId} />
				) : (
					<EmptyState
						title="Esta sección es para el equipo de la ciudad"
						illustration="/illustrations/security-on.svg"
						action={
							<a href="/foro" className="q-btn q-btn--secondary">
								Ir a Comunidad
							</a>
						}
					>
						Tu cuenta no tiene permiso de moderación. Si trabajas con la
						Alcaldía, pide que te habiliten.
					</EmptyState>
				)
			}
		</Loaded>
	);
}

function ModerationQueue({ profileId }: { profileId: string }) {
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
		const next: Override =
			action === "approve"
				? "published"
				: action === "remove"
					? "removed"
					: "resolved";
		setError(null);
		setPending((value) => ({ ...value, [key]: true }));
		setOverrides((value) => ({ ...value, [key]: next }));
		try {
			await store.moderate(item.kind, item.id, action);
			reload();
		} catch (caught) {
			setOverrides((value) => {
				const { [key]: _dropped, ...rest } = value;
				return rest;
			});
			setError(
				caught instanceof Error
					? caught.message
					: "No pudimos guardar la decisión. Intenta de nuevo.",
			);
		} finally {
			setPending((value) => ({ ...value, [key]: false }));
		}
	}

	return (
		<div className="flex max-w-3xl flex-col gap-6">
			{error && <ErrorNote message={error} />}
			<Loaded state={state} loadingLabel="Cargando la cola…">
				{(items) => {
					const visible = items.flatMap((item) => {
						const override = overrides[keyOf(item)];
						if (override === "removed" || override === "resolved") return [];
						if (override === "published" && item.priority === "none") return [];
						return [override ? { ...item, status: override } : item];
					});
					if (visible.length === 0)
						return (
							<EmptyState
								illustration="/illustrations/celebration.svg"
								title="Todo al día"
							>
								No hay reportes ni contenido esperando revisión.
							</EmptyState>
						);
					const emergency = visible.filter(
						(item) => item.priority === "emergency",
					);
					const city = visible.filter(
						(item) => item.priority === "city_attention",
					);
					const held = visible.filter(
						(item) => item.priority === "none" && item.status === "held",
					);
					return (
						<>
							<QueueSection
								id="urgent"
								title="Atención urgente"
								hint="Posibles emergencias. Si hay riesgo para la vida, activa la línea 123."
								items={emergency}
								pending={pending}
								onAct={act}
							/>
							<QueueSection
								id="city"
								title="Para la ciudad"
								hint="Reportes que alguna dependencia debe atender."
								items={city}
								pending={pending}
								onAct={act}
							/>
							<QueueSection
								id="held"
								title="En revisión"
								hint="Contenido retenido por el triaje. Decide si se publica."
								items={held}
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
					Nada pendiente aquí.
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
	const href = contentHref(item);
	const held = item.status === "held";
	const flagged = item.labels.filter((label) => label !== "ok");
	// Show "Sin problemas" only when the triage said so explicitly.
	const labels: ModerationLabel[] =
		flagged.length > 0 ? flagged : item.labels.length > 0 ? ["ok"] : [];
	return (
		<li className="q-card space-y-3 px-5 py-4">
			<div className="flex flex-wrap items-center gap-2">
				<span className="q-eyebrow">{KIND_LABELS[item.kind]}</span>
				{item.priority === "emergency" && (
					<span className="q-badge q-badge--live">Urgente</span>
				)}
				{item.priority === "city_attention" && (
					<span className="q-badge q-badge--high">Para la ciudad</span>
				)}
				{held ? (
					<span className="q-badge q-badge--high">Retenido</span>
				) : (
					<span className="q-badge q-badge--optimal">Publicado</span>
				)}
			</div>
			<h3 className="q-h3 break-words">{item.title || "Sin título"}</h3>
			<p className="q-p q-muted line-clamp-3 whitespace-pre-line break-words">
				{item.body}
			</p>
			{labels.length > 0 && (
				<div className="flex flex-wrap gap-1.5">
					{labels.map((label) => (
						<span
							key={label}
							className={`q-badge ${label === "ok" ? "q-badge--optimal" : "q-badge--alert"}`}
						>
							{LABEL_NAMES[label]}
						</span>
					))}
				</div>
			)}
			<p className="q-sm q-muted">
				{item.authorName} ·{" "}
				<time dateTime={item.createdAt}>{formatRelative(item.createdAt)}</time>{" "}
				· Decidió: {SOURCE_LABELS[item.source]}
			</p>
			<div className="flex flex-wrap gap-2">
				{held ? (
					<button
						type="button"
						className="q-btn q-btn--primary"
						disabled={busy}
						onClick={() => onAct(item, "approve")}
					>
						Aprobar
					</button>
				) : (
					<button
						type="button"
						className="q-btn q-btn--primary"
						disabled={busy}
						onClick={() => onAct(item, "resolve")}
					>
						Marcar atendido
					</button>
				)}
				<button
					type="button"
					className="q-btn q-btn--alert"
					disabled={busy}
					onClick={() => onAct(item, "remove")}
				>
					Retirar
				</button>
				{href && (
					<a href={href} className="q-btn q-btn--ghost">
						Ver contenido
					</a>
				)}
			</div>
		</li>
	);
}
