// Inline form for the organizer to edit an event from /agenda/<id> (#92).
// Every text change goes back through the server triage; capacity cannot drop
// below registeredCount; registered attendees are notified if date or place changes.

import { Save, X } from "lucide-react";
import { type SyntheticEvent, useState } from "react";
import { EVENT_CATEGORY_LABELS } from "../../lib/community/community-labels";
import {
	bogotaLocalToIso,
	isoToBogotaLocal,
	validateEventEditInput,
} from "../../lib/community/community-rules";
import type {
	CommunityEvent,
	EventCategory,
	NewEventInput,
	PublishResult,
} from "../../lib/community/community-types";
import { useT } from "../../lib/i18n/use-language";
import {
	ErrorNote,
	Field,
	inputClass,
	Loaded,
	PublishNotice,
	textareaClass,
} from "./community-ui";
import { useLoad, useStore } from "./use-community";

const CATEGORIES = Object.keys(EVENT_CATEGORY_LABELS) as EventCategory[];
const OTHER_PLACE = "";

interface EditFormValues {
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

function valuesFromEvent(event: CommunityEvent): EditFormValues {
	const startLocal = isoToBogotaLocal(event.startsAt);
	const endLocal = event.endsAt ? isoToBogotaLocal(event.endsAt) : "";
	return {
		title: event.title,
		description: event.description,
		category: event.category,
		date: startLocal.slice(0, 10),
		startTime: startLocal.slice(11, 16),
		endTime: endLocal ? endLocal.slice(11, 16) : "",
		placeId: event.placeId ?? OTHER_PLACE,
		locationText: event.locationText ?? "",
		capacity: event.capacity !== null ? String(event.capacity) : "",
		isFree: event.isFree,
		price: event.priceCop !== null ? String(event.priceCop) : "",
	};
}

function toInput(values: EditFormValues): NewEventInput {
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

interface EditEventFormProps {
	event: CommunityEvent;
	onSaved: (result: PublishResult<CommunityEvent>) => void;
	onCancel: () => void;
}

export function EditEventForm({
	event,
	onSaved,
	onCancel,
}: EditEventFormProps) {
	const t = useT();
	const store = useStore();
	const { state: placesState } = useLoad((s) => s.listPlaces(), []);
	const [values, setValues] = useState<EditFormValues>(() =>
		valuesFromEvent(event),
	);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [rejected, setRejected] =
		useState<PublishResult<CommunityEvent> | null>(null);

	const today = isoToBogotaLocal(new Date().toISOString()).slice(0, 10);
	const minCapacity = Math.max(1, event.registeredCount);

	function set<K extends keyof EditFormValues>(
		key: K,
		value: EditFormValues[K],
	) {
		setValues((current) => ({ ...current, [key]: value }));
		setError(null);
		setRejected(null);
	}

	async function handleSubmit(formEvent: SyntheticEvent<HTMLFormElement>) {
		formEvent.preventDefault();
		setError(null);
		setRejected(null);
		const input = toInput(values);
		const invalid = validateEventEditInput(input, event.registeredCount);
		if (invalid) {
			setError(invalid);
			return;
		}
		setSubmitting(true);
		try {
			const result = await store.updateEvent(event.id, input);
			if (result.outcome === "rejected") {
				setRejected(result);
				return;
			}
			onSaved(result);
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: "No pudimos guardar los cambios del evento.",
			);
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<form
			onSubmit={handleSubmit}
			className="space-y-4 rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--bg)] p-4"
			noValidate
		>
			<div className="flex items-center justify-between gap-2">
				<h3 className="q-h3">Editar evento</h3>
				<button
					type="button"
					onClick={onCancel}
					className="q-btn q-btn--ghost q-btn--sm min-h-11"
				>
					<X size={16} aria-hidden="true" />
					Cerrar
				</button>
			</div>

			<p className="q-sm q-muted">
				Si cambias el título o la descripción, el evento pasará de nuevo por
				revisión. Si cambias la fecha o el lugar, avisaremos a las personas
				inscritas.
			</p>

			<Field id="edit-event-title" label={t.agenda.fieldTitle}>
				<input
					id="edit-event-title"
					className={inputClass}
					value={values.title}
					onChange={(e) => set("title", e.target.value)}
					maxLength={120}
					required
				/>
			</Field>

			<Field id="edit-event-description" label={t.agenda.fieldDescription}>
				<textarea
					id="edit-event-description"
					className={textareaClass}
					value={values.description}
					onChange={(e) => set("description", e.target.value)}
					required
				/>
			</Field>

			<Field id="edit-event-category" label={t.agenda.category}>
				<select
					id="edit-event-category"
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

			<div className="grid gap-3 sm:grid-cols-3">
				<Field id="edit-event-date" label={t.agenda.fieldDate}>
					<input
						id="edit-event-date"
						type="date"
						className={inputClass}
						value={values.date}
						min={today}
						onChange={(e) => set("date", e.target.value)}
						required
					/>
				</Field>
				<Field id="edit-event-start" label={t.agenda.fieldStart}>
					<input
						id="edit-event-start"
						type="time"
						className={inputClass}
						value={values.startTime}
						onChange={(e) => set("startTime", e.target.value)}
						required
					/>
				</Field>
				<Field id="edit-event-end" label={t.agenda.fieldEnd}>
					<input
						id="edit-event-end"
						type="time"
						className={inputClass}
						value={values.endTime}
						onChange={(e) => set("endTime", e.target.value)}
					/>
				</Field>
			</div>

			<Loaded state={placesState} loadingLabel={t.agenda.loadingPlaces}>
				{(places) => (
					<Field id="edit-event-place" label={t.agenda.fieldPlace}>
						<select
							id="edit-event-place"
							className={inputClass}
							value={values.placeId}
							onChange={(e) => set("placeId", e.target.value)}
						>
							<option value={OTHER_PLACE}>{t.agenda.otherPlace}</option>
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
				<Field id="edit-event-location" label={t.agenda.fieldLocation}>
					<input
						id="edit-event-location"
						className={inputClass}
						value={values.locationText}
						onChange={(e) => set("locationText", e.target.value)}
					/>
				</Field>
			)}

			<Field
				id="edit-event-capacity"
				label={t.agenda.fieldCapacity}
				hint={
					event.registeredCount > 0
						? `Mínimo ${event.registeredCount} (personas ya inscritas). Déjalo vacío para cupo libre.`
						: t.agenda.capacityHint
				}
			>
				<input
					id="edit-event-capacity"
					type="number"
					inputMode="numeric"
					min={minCapacity}
					step={1}
					className={inputClass}
					value={values.capacity}
					onChange={(e) => set("capacity", e.target.value)}
				/>
			</Field>

			<fieldset className="space-y-2">
				<legend className="q-eyebrow">{t.agenda.entry}</legend>
				<div className="q-seg">
					<button
						type="button"
						className={`q-seg__opt min-h-11 ${values.isFree ? "is-on" : ""}`}
						aria-pressed={values.isFree}
						onClick={() => set("isFree", true)}
					>
						{t.agenda.free}
					</button>
					<button
						type="button"
						className={`q-seg__opt min-h-11 ${values.isFree ? "" : "is-on"}`}
						aria-pressed={!values.isFree}
						onClick={() => set("isFree", false)}
					>
						{t.agenda.paid}
					</button>
				</div>
			</fieldset>

			{!values.isFree && (
				<Field id="edit-event-price" label={t.agenda.fieldPrice}>
					<input
						id="edit-event-price"
						type="number"
						inputMode="numeric"
						min={1}
						step={500}
						className={inputClass}
						value={values.price}
						onChange={(e) => set("price", e.target.value)}
					/>
				</Field>
			)}

			{error && <ErrorNote message={error} />}
			{rejected && <PublishNotice result={rejected} />}

			<div className="flex flex-wrap gap-2">
				<button
					type="submit"
					className="q-btn q-btn--primary min-h-11"
					disabled={submitting}
					aria-busy={submitting}
				>
					<Save size={16} aria-hidden="true" />
					{submitting ? "Guardando…" : "Guardar cambios"}
				</button>
				<button
					type="button"
					className="q-btn q-btn--ghost min-h-11"
					onClick={onCancel}
					disabled={submitting}
				>
					Cancelar
				</button>
			</div>
		</form>
	);
}
