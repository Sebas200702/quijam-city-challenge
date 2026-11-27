// Form to publish a community event; the moderation triage decides what happens next.
// A draft can arrive in the URL (?titulo=&fecha=&hora=&lugar=&costo=&cupos=&descripcion=,
// see EVENT_FORM_SCHEMA): those fields show as suggested and nothing is sent
// until the person presses "Publicar".

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
import { useT } from "../../lib/i18n/use-language";
import type { UrlValues } from "../../lib/url-state/params";
import { EVENT_FORM_SCHEMA } from "../../lib/url-state/schemas";
import { readUrlState } from "../../lib/url-state/use-url-state";
import {
	PrefillNotice,
	SuggestedTag,
	suggestedProps,
	usePrefill,
} from "../prefill/prefill-ui";
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

type EventDraft = UrlValues<typeof EVENT_FORM_SCHEMA>;

function initialValues(draft: EventDraft): FormValues {
	return {
		title: draft.titulo,
		description: draft.descripcion,
		category: draft.categoria || "community",
		date: draft.fecha,
		startTime: draft.hora,
		endTime: "",
		placeId: draft.lugar || OTHER_PLACE,
		locationText: "",
		capacity: draft.cupos,
		isFree: draft.costo === "" || draft.costo === "0",
		price: draft.costo === "0" ? "" : draft.costo,
	};
}

/** Form fields filled by the draft (`lugar` may end up as either place field). */
function suggestedFields(draft: EventDraft): (keyof FormValues)[] {
	const map: [keyof EventDraft, (keyof FormValues)[]][] = [
		["titulo", ["title"]],
		["descripcion", ["description"]],
		["categoria", ["category"]],
		["fecha", ["date"]],
		["hora", ["startTime"]],
		["lugar", ["placeId", "locationText"]],
		["cupos", ["capacity"]],
		["costo", ["isFree", "price"]],
	];
	return map.flatMap(([param, fields]) => (draft[param] ? fields : []));
}

/** A database id that is not in the catalog is dropped, not shown as an address. */
const LOOKS_LIKE_ID = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i;

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
	const t = useT();
	const session = useSession();
	return (
		<CommunityShell current="agenda" aiHref={aiHref}>
			<a href="/agenda" className="q-btn q-btn--ghost self-start">
				<ArrowLeft size={18} aria-hidden="true" />
				{t.agenda.backToAgenda}
			</a>
			<PageTitle
				eyebrow={t.agenda.eyebrow}
				title={t.agenda.formTitle}
				illustration="/illustrations/publish-post.svg"
			>
				{t.agenda.formIntro}
			</PageTitle>
			{session.loading ? (
				<Loading />
			) : session.profile ? (
				<EventFormBody />
			) : (
				<div className="q-card space-y-3 p-5">
					<p className="q-h3">{t.agenda.signInTitle}</p>
					<p className="q-p q-muted">{t.agenda.signInText}</p>
					<a href={signInHref()} className="q-btn q-btn--primary self-start">
						<LogIn size={18} aria-hidden="true" />
						{t.agenda.signIn}
					</a>
				</div>
			)}
		</CommunityShell>
	);
}

function EventFormBody() {
	const t = useT();
	const store = useStore();
	const { state: placesState } = useLoad((s) => s.listPlaces(), []);
	const [draft] = useState(() => readUrlState(EVENT_FORM_SCHEMA));
	const [values, setValues] = useState<FormValues>(() => initialValues(draft));
	const prefill = usePrefill(suggestedFields(draft));
	const suggested = (key: keyof FormValues, id: string, className: string) =>
		suggestedProps(prefill.isSuggested(key), id, className);
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [result, setResult] = useState<PublishResult<CommunityEvent> | null>(
		null,
	);

	// `?lugar=` is a place id or slug; anything else becomes a free-text address.
	useEffect(() => {
		if (placesState.status !== "ready") return;
		setValues((current) => {
			if (!current.placeId) return current;
			const match = placesState.data.find(
				(place) =>
					place.id === current.placeId || place.slug === current.placeId,
			);
			if (match)
				return match.id === current.placeId
					? current
					: { ...current, placeId: match.id };
			const address = LOOKS_LIKE_ID.test(current.placeId)
				? ""
				: current.placeId;
			return {
				...current,
				placeId: OTHER_PLACE,
				locationText: current.locationText || address,
			};
		});
	}, [placesState]);

	const today = isoToBogotaLocal(new Date().toISOString()).slice(0, 10);

	function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
		setValues((current) => ({ ...current, [key]: value }));
		setError(null);
		prefill.accept(key);
		if (key === "isFree") prefill.accept("price");
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
			setError(err instanceof Error ? err.message : t.agenda.publishError);
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
						{t.agenda.viewMyEvent}
					</a>
					<a href="/agenda" className="q-btn q-btn--secondary">
						{t.agenda.goToAgenda}
					</a>
				</div>
			</div>
		);
	}

	return (
		<form onSubmit={handleSubmit} className="q-card space-y-5 p-5" noValidate>
			<PrefillNotice count={prefill.total} />
			<Field
				id="event-title"
				label={t.agenda.fieldTitle}
				suggested={prefill.isSuggested("title")}
			>
				<input
					id="event-title"
					{...suggested("title", "event-title", inputClass)}
					value={values.title}
					onChange={(e) => set("title", e.target.value)}
					maxLength={120}
					placeholder={t.agenda.titlePlaceholder}
					required
				/>
			</Field>

			<Field
				id="event-description"
				label={t.agenda.fieldDescription}
				suggested={prefill.isSuggested("description")}
			>
				<textarea
					id="event-description"
					{...suggested("description", "event-description", textareaClass)}
					value={values.description}
					onChange={(e) => set("description", e.target.value)}
					placeholder={t.agenda.descriptionPlaceholder}
					required
				/>
			</Field>

			<Field
				id="event-category"
				label={t.agenda.category}
				suggested={prefill.isSuggested("category")}
			>
				<select
					id="event-category"
					{...suggested("category", "event-category", inputClass)}
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
				<Field
					id="event-date"
					label={t.agenda.fieldDate}
					suggested={prefill.isSuggested("date")}
				>
					<input
						id="event-date"
						type="date"
						{...suggested("date", "event-date", inputClass)}
						value={values.date}
						min={today}
						onChange={(e) => set("date", e.target.value)}
						required
					/>
				</Field>
				<Field
					id="event-start"
					label={t.agenda.fieldStart}
					suggested={prefill.isSuggested("startTime")}
				>
					<input
						id="event-start"
						type="time"
						{...suggested("startTime", "event-start", inputClass)}
						value={values.startTime}
						onChange={(e) => set("startTime", e.target.value)}
						required
					/>
				</Field>
				<Field id="event-end" label={t.agenda.fieldEnd}>
					<input
						id="event-end"
						type="time"
						className={inputClass}
						value={values.endTime}
						onChange={(e) => set("endTime", e.target.value)}
					/>
				</Field>
			</div>
			<p className="q-sm q-muted -mt-3">{t.agenda.timeZoneNote}</p>

			<Loaded state={placesState} loadingLabel={t.agenda.loadingPlaces}>
				{(places) => (
					<Field
						id="event-place"
						label={t.agenda.fieldPlace}
						suggested={prefill.isSuggested("placeId")}
					>
						<select
							id="event-place"
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
				<Field
					id="event-location"
					label={t.agenda.fieldLocation}
					hint={t.agenda.locationHint}
					suggested={prefill.isSuggested("locationText")}
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
				label={t.agenda.fieldCapacity}
				hint={t.agenda.capacityHint}
				suggested={prefill.isSuggested("capacity")}
			>
				<input
					id="event-capacity"
					type="number"
					inputMode="numeric"
					min={1}
					step={1}
					{...suggested("capacity", "event-capacity", inputClass)}
					value={values.capacity}
					onChange={(e) => set("capacity", e.target.value)}
				/>
			</Field>

			<fieldset className="space-y-2">
				<legend className="q-eyebrow flex flex-wrap items-center gap-x-2 gap-y-1">
					{t.agenda.entry}
					{prefill.isSuggested("isFree") && (
						<SuggestedTag fieldId="event-entry" />
					)}
				</legend>
				<div className="q-seg">
					<button
						type="button"
						style={{ minHeight: 44 }}
						className={`q-seg__opt ${values.isFree ? "is-on" : ""}`}
						aria-pressed={values.isFree}
						onClick={() => set("isFree", true)}
					>
						{t.agenda.free}
					</button>
					<button
						type="button"
						style={{ minHeight: 44 }}
						className={`q-seg__opt ${values.isFree ? "" : "is-on"}`}
						aria-pressed={!values.isFree}
						onClick={() => set("isFree", false)}
					>
						{t.agenda.paid}
					</button>
				</div>
			</fieldset>

			{!values.isFree && (
				<Field
					id="event-price"
					label={t.agenda.fieldPrice}
					suggested={prefill.isSuggested("price")}
				>
					<input
						id="event-price"
						type="number"
						inputMode="numeric"
						min={1}
						step={500}
						{...suggested("price", "event-price", inputClass)}
						value={values.price}
						onChange={(e) => set("price", e.target.value)}
						placeholder={t.agenda.pricePlaceholder}
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
					{submitting ? t.agenda.publishing : t.agenda.publishEvent}
				</button>
				<p className="q-sm q-muted text-center">{t.agenda.moderationNote}</p>
			</div>
			<p className="q-sm q-muted text-center">
				{t.agenda.askQuillartPrefix}{" "}
				<a
					href={askHref(t.agenda.askPublishPrompt)}
					className="inline-flex min-h-11 items-center font-semibold text-[var(--ink)]"
				>
					{t.agenda.askPublishQuoted}
				</a>
			</p>
		</form>
	);
}
