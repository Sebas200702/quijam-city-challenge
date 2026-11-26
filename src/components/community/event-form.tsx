// Form to publish a community event; the moderation triage decides what happens next.

import { ArrowLeft, LogIn } from "lucide-react";
import { type SyntheticEvent, useEffect, useState } from "react";
import { askHref } from "../../lib/assistant/assistant-labels";
import { EVENT_CATEGORY_LABELS } from "../../lib/community/community-labels";
import {
	bogotaLocalToIso,
	isoToBogotaLocal,
	validateEventInput,
} from "../../lib/community/community-rules";
import type {
	CommunityEvent,
	EventCategory,
	NewEventInput,
	PublishResult,
} from "../../lib/community/community-types";
import { CommunityShell } from "./community-shell";
import {
	ErrorNote,
	Field,
	inputClass,
	Loaded,
	Loading,
	PageTitle,
	PublishNotice,
	textareaClass,
} from "./community-ui";
import { signInHref, useLoad, useSession, useStore } from "./use-community";

const CATEGORIES = Object.keys(EVENT_CATEGORY_LABELS) as EventCategory[];
const OTHER_PLACE = "";

interface FormValues {
	title: string;
	description: string;
	category: EventCategory;
	date: string;
	startTime: string;
	endTime: string;
	placeId: string;
	locationText: string;
	capacity: string;
	isFree: boolean;
	price: string;
}

function initialValues(): FormValues {
	const params = new URLSearchParams(window.location.search);
	return {
		title: "",
		description: "",
		category: "community",
		date: "",
		startTime: "",
		endTime: "",
		placeId: params.get("lugar") ?? OTHER_PLACE,
		locationText: "",
		capacity: "",
		isFree: true,
		price: "",
	};
}

function toInput(values: FormValues): NewEventInput {
	const startsAt = bogotaLocalToIso(`${values.date}T${values.startTime}`);
	const endsAt = values.endTime
		? bogotaLocalToIso(`${values.date}T${values.endTime}`)
		: null;
	const capacity = values.capacity.trim() ? Number(values.capacity) : null;
	const price = values.price.trim()
		? Number(values.price.replace(/[.\s$]/g, ""))
		: null;
	return {
		title: values.title.trim(),
		description: values.description.trim(),
		category: values.category,
		startsAt: startsAt ?? "",
		endsAt,
		placeId: values.placeId || null,
		locationText: values.placeId ? null : values.locationText.trim() || null,
		capacity,
		isFree: values.isFree,
		priceCop: values.isFree ? null : price,
	};
}

export interface EventFormProps {
	aiHref?: string;
}

export default function EventForm({ aiHref }: EventFormProps) {
	const session = useSession();
	return (
		<CommunityShell current="agenda" aiHref={aiHref}>
			<a href="/agenda" className="q-btn q-btn--ghost self-start">
				<ArrowLeft size={18} aria-hidden="true" />
				Volver a la agenda
			</a>
			<PageTitle
				eyebrow="Agenda"
				title="Publicar un evento"
				illustration="/illustrations/publish-post.svg"
			>
				Cuéntale a la ciudad qué estás organizando.
			</PageTitle>
			{session.loading ? (
				<Loading />
			) : session.profile ? (
				<EventFormBody />
			) : (
				<div className="q-card space-y-3 p-5">
					<p className="q-h3">Inicia sesión para publicar</p>
					<p className="q-p q-muted">
						Así los asistentes saben quién organiza y te pueden escribir.
					</p>
					<a href={signInHref()} className="q-btn q-btn--primary self-start">
						<LogIn size={18} aria-hidden="true" />
						Iniciar sesión
					</a>
				</div>
			)}
		</CommunityShell>
	);
}

function EventFormBody() {
	const store = useStore();
	const { state: placesState } = useLoad((s) => s.listPlaces(), []);
	const [values, setValues] = useState<FormValues>(initialValues);
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [result, setResult] = useState<PublishResult<CommunityEvent> | null>(
		null,
	);

	// A `?lugar=` id that is not in the catalog falls back to a free-text address.
	useEffect(() => {
		if (placesState.status !== "ready") return;
		setValues((current) =>
			current.placeId &&
			!placesState.data.some((place) => place.id === current.placeId)
				? { ...current, placeId: OTHER_PLACE }
				: current,
		);
	}, [placesState]);

	const today = isoToBogotaLocal(new Date().toISOString()).slice(0, 10);

	function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
		setValues((current) => ({ ...current, [key]: value }));
		setError(null);
	}

	async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);
		setResult(null);
		const input = toInput(values);
		const invalid = validateEventInput(input);
		if (invalid) {
			setError(invalid);
			return;
		}
		setSubmitting(true);
		try {
			setResult(await store.createEvent(input));
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "No pudimos publicar el evento.",
			);
		} finally {
			setSubmitting(false);
		}
	}

	if (result && result.outcome !== "rejected" && result.record) {
		const href = `/agenda/${encodeURIComponent(result.record.id)}`;
		return (
			<div className="q-card space-y-4 p-5">
				<PublishNotice result={result} />
				<p className="q-h3 break-words">{result.record.title}</p>
				<div className="flex flex-wrap gap-3">
					<a href={href} className="q-btn q-btn--primary">
						Ver mi evento
					</a>
					<a href="/agenda" className="q-btn q-btn--secondary">
						Ir a la agenda
					</a>
				</div>
			</div>
		);
	}

	return (
		<form onSubmit={handleSubmit} className="q-card space-y-5 p-5" noValidate>
			<Field id="event-title" label="Título">
				<input
					id="event-title"
					className={inputClass}
					value={values.title}
					onChange={(e) => set("title", e.target.value)}
					maxLength={120}
					placeholder="Ej.: Caminata por el Malecón al atardecer"
					required
				/>
			</Field>

			<Field id="event-description" label="Descripción">
				<textarea
					id="event-description"
					className={textareaClass}
					value={values.description}
					onChange={(e) => set("description", e.target.value)}
					placeholder="¿Qué van a hacer? ¿Qué deben llevar?"
					required
				/>
			</Field>

			<Field id="event-category" label="Categoría">
				<select
					id="event-category"
					className={inputClass}
					value={values.category}
					onChange={(e) => set("category", e.target.value as EventCategory)}
				>
					{CATEGORIES.map((item) => (
						<option key={item} value={item}>
							{EVENT_CATEGORY_LABELS[item]}
						</option>
					))}
				</select>
			</Field>

			<div className="grid gap-4 sm:grid-cols-3">
				<Field id="event-date" label="Fecha">
					<input
						id="event-date"
						type="date"
						className={inputClass}
						value={values.date}
						min={today}
						onChange={(e) => set("date", e.target.value)}
						required
					/>
				</Field>
				<Field id="event-start" label="Empieza">
					<input
						id="event-start"
						type="time"
						className={inputClass}
						value={values.startTime}
						onChange={(e) => set("startTime", e.target.value)}
						required
					/>
				</Field>
				<Field id="event-end" label="Termina (opcional)">
					<input
						id="event-end"
						type="time"
						className={inputClass}
						value={values.endTime}
						onChange={(e) => set("endTime", e.target.value)}
					/>
				</Field>
			</div>
			<p className="q-sm q-muted -mt-3">Hora de Barranquilla.</p>

			<Loaded state={placesState} loadingLabel="Cargando lugares…">
				{(places) => (
					<Field id="event-place" label="Lugar">
						<select
							id="event-place"
							className={inputClass}
							value={values.placeId}
							onChange={(e) => set("placeId", e.target.value)}
						>
							<option value={OTHER_PLACE}>
								Otro lugar (escribe la dirección)
							</option>
							{places.map((place) => (
								<option key={place.id} value={place.id}>
									{place.name} · {place.neighborhood}
								</option>
							))}
						</select>
					</Field>
				)}
			</Loaded>

			{!values.placeId && (
				<Field
					id="event-location"
					label="Dirección o punto de encuentro"
					hint="Ej.: Cra. 50 #72-10, frente a la tienda de don Julio."
				>
					<input
						id="event-location"
						className={inputClass}
						value={values.locationText}
						onChange={(e) => set("locationText", e.target.value)}
						autoComplete="street-address"
					/>
				</Field>
			)}

			<Field
				id="event-capacity"
				label="Cupos (opcional)"
				hint="Déjalo vacío si no hay límite."
			>
				<input
					id="event-capacity"
					type="number"
					inputMode="numeric"
					min={1}
					step={1}
					className={inputClass}
					value={values.capacity}
					onChange={(e) => set("capacity", e.target.value)}
				/>
			</Field>

			<fieldset className="space-y-2">
				<legend className="q-eyebrow">Entrada</legend>
				<div className="q-seg">
					<button
						type="button"
						style={{ minHeight: 44 }}
						className={`q-seg__opt ${values.isFree ? "is-on" : ""}`}
						aria-pressed={values.isFree}
						onClick={() => set("isFree", true)}
					>
						Gratis
					</button>
					<button
						type="button"
						style={{ minHeight: 44 }}
						className={`q-seg__opt ${values.isFree ? "" : "is-on"}`}
						aria-pressed={!values.isFree}
						onClick={() => set("isFree", false)}
					>
						Con costo
					</button>
				</div>
			</fieldset>

			{!values.isFree && (
				<Field id="event-price" label="Valor de la entrada (COP)">
					<input
						id="event-price"
						type="number"
						inputMode="numeric"
						min={1}
						step={500}
						className={inputClass}
						value={values.price}
						onChange={(e) => set("price", e.target.value)}
						placeholder="Ej.: 15000"
					/>
				</Field>
			)}

			{error && <ErrorNote message={error} />}
			{result?.outcome === "rejected" && <PublishNotice result={result} />}

			<div className="space-y-2">
				<button
					type="submit"
					className="q-btn q-btn--primary q-btn--block"
					disabled={submitting}
				>
					{submitting ? "Publicando…" : "Publicar evento"}
				</button>
				<p className="q-sm q-muted text-center">
					Toda publicación pasa por la moderación de la comunidad.
				</p>
			</div>
			<p className="q-sm q-muted text-center">
				También puedes pedírselo a Quillart:{" "}
				<a
					href={askHref("Quiero publicar un evento")}
					className="inline-flex min-h-11 items-center font-semibold text-[var(--ink)]"
				>
					«Quiero publicar un evento»
				</a>
			</p>
		</form>
	);
}
