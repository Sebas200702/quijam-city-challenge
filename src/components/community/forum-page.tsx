// Community forum: intro, rules, category filter, thread list and the new-thread form.

import { CalendarDays, MapPin, Plus, X } from "lucide-react";
import {
	type FormEvent,
	type ReactNode,
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
				eyebrow="Barranquilla"
				title="Comunidad"
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
							Nueva conversación
						</button>
					)
				}
			>
				Vecinos y visitantes conectados: pregunta, cuenta lo que pasa en tu
				barrio y ayuda a cuidar la ciudad.
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
									Ver tu conversación
								</a>
							)}
						</div>
					)}

					<fieldset className="min-w-0">
						<legend className="q-eyebrow mb-2">Filtrar por tema</legend>
						<div className="flex gap-2 overflow-x-auto pb-1">
							<CategoryChip
								label="Todas"
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

					<section aria-label="Conversaciones" className="flex flex-col gap-3">
						<Loaded state={state} loadingLabel="Cargando conversaciones…">
							{(threads) =>
								threads.length === 0 ? (
									<EmptyState
										title={
											category
												? `Aún no hay conversaciones de ${FORUM_CATEGORY_LABELS[category].toLowerCase()}`
												: "Aún no hay conversaciones"
										}
										action={
											!formOpen && (
												<button
													type="button"
													className="q-btn q-btn--primary"
													onClick={() => setFormOpen(true)}
												>
													Empieza una conversación
												</button>
											)
										}
									>
										Sé la primera persona en contar algo de tu barrio o
										preguntar por la ciudad.
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
						<p className="q-p">
							¿Viste un hueco, un arroyo o algo que la ciudad deba saber?
						</p>
						<AskQuillartButton
							prompt="Quiero reportar un problema en mi barrio"
							label="Reportar con Quillart"
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
	return (
		<section className="q-card space-y-2 px-5 py-4" aria-labelledby="rules">
			<h2 id="rules" className="q-h3">
				Cómo conversamos aquí
			</h2>
			<ul className="q-sm q-muted list-disc space-y-1 pl-5">
				<li>Con respeto, aunque no estemos de acuerdo.</li>
				<li>
					Nada de datos personales: ni teléfonos, ni direcciones, ni documentos.
				</li>
				<li>Los reportes de riesgo llegan a la Alcaldía para atenderlos.</li>
				<li>
					¿Emergencia? Llama al{" "}
					<strong className="text-[var(--ink)]">123</strong>: el foro no
					reemplaza esa línea.
				</li>
				<li>
					La moderación es automática y una persona revisa lo que quede en duda.
				</li>
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
				<h2 className="q-h3">Entra para conversar</h2>
				<p className="q-p q-muted">
					Para abrir una conversación necesitas tu cuenta. Es gratis y toma un
					minuto.
				</p>
				<div className="flex flex-wrap gap-2">
					<a href={signInHref()} className="q-btn q-btn--primary">
						Entrar o crear cuenta
					</a>
					<button
						type="button"
						className="q-btn q-btn--ghost"
						onClick={onCancel}
					>
						Ahora no
					</button>
				</div>
			</div>
		);

	async function submit(formEvent: FormEvent) {
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
				caught instanceof Error
					? caught.message
					: "No pudimos publicar. Intenta de nuevo.",
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
				Nueva conversación
			</h2>
			{(place || event) && (
				<div className="flex flex-wrap gap-2">
					{place && (
						<AttachmentChip
							icon={<MapPin size={16} aria-hidden="true" />}
							label={place.name ?? "Lugar"}
							onRemove={() => setPlace(null)}
						/>
					)}
					{event && (
						<AttachmentChip
							icon={<CalendarDays size={16} aria-hidden="true" />}
							label={event.name ?? "Evento"}
							onRemove={() => setEvent(null)}
						/>
					)}
				</div>
			)}
			<Field id={`${formId}-title`} label="Título">
				<input
					id={`${formId}-title`}
					className={inputClass}
					value={title}
					maxLength={140}
					required
					placeholder="Ej.: ¿Cómo está el arroyo de la 21 hoy?"
					onChange={(change) => setTitle(change.target.value)}
				/>
			</Field>
			<Field id={`${formId}-category`} label="Tema">
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
				label="Mensaje"
				hint="No compartas teléfonos, direcciones ni documentos."
			>
				<textarea
					id={`${formId}-body`}
					className={textareaClass}
					value={body}
					required
					placeholder="Cuéntale a la comunidad…"
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
					{busy ? "Publicando…" : "Publicar"}
				</button>
				<button
					type="button"
					className="q-btn q-btn--ghost"
					onClick={onCancel}
					disabled={busy}
				>
					Cancelar
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
	return (
		<span className="q-badge q-badge--high min-h-11 gap-1.5 pr-1 pl-3">
			{icon}
			<span className="max-w-[16rem] truncate">{label}</span>
			<button
				type="button"
				onClick={onRemove}
				aria-label={`Quitar ${label}`}
				className="grid size-11 place-items-center rounded-full"
			>
				<X size={16} aria-hidden="true" />
			</button>
		</span>
	);
}
