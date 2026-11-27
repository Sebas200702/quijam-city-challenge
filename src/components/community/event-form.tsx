// Form to publish a community event; the moderation triage decides what happens next.

import { ArrowLeft, LogIn } from "lucide-react";
import { type SyntheticEvent, useEffect, useState } from "react";
import { askHref } from "../../lib/assistant/assistant-labels";
import { type GeoPoint, pointOf } from "../../lib/community/community-geo";
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
	Place,
	PublishResult,
} from "../../lib/community/community-types";
import { useT } from "../../lib/i18n/use-language";
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
import { LazyPointPicker } from "./lazy-maps";
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
	/** Point of the meeting place on the AMB map (U15). */
	point: GeoPoint | null;
	/** True while the point is the catalog place's own, untouched. */
	pointFromPlace: boolean;
}

/** The catalog place's point, when it is inside the AMB. */
function placePoint(place: Place | undefined): GeoPoint | null {
	return place ? pointOf({}, place) : null;
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
		point: null,
		pointFromPlace: false,
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
		latitude: values.point?.latitude ?? null,
		longitude: values.point?.longitude ?? null,
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
	const [values, setValues] = useState<FormValues>(initialValues);
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [result, setResult] = useState<PublishResult<CommunityEvent> | null>(
		null,
	);

	// A `?lugar=` id that is not in the catalog falls back to a free-text address;
	// one that is lends its point to the picker.
	useEffect(() => {
		if (placesState.status !== "ready") return;
		setValues((current) => {
			if (!current.placeId) return current;
			const place = placesState.data.find(
				(item) => item.id === current.placeId,
			);
			if (!place) return { ...current, placeId: OTHER_PLACE };
			if (current.point) return current;
			const point = placePoint(place);
			return { ...current, point, pointFromPlace: point !== null };
		});
	}, [placesState]);

	const places = placesState.status === "ready" ? placesState.data : [];
	const chosenPlace = places.find((place) => place.id === values.placeId);

	function choosePlace(placeId: string) {
		const place = places.find((item) => item.id === placeId);
		setValues((current) => {
			// A point the person moved by hand stays; a borrowed one follows the place.
			const keep = current.point && !current.pointFromPlace;
			const point = keep ? current.point : placePoint(place);
			return {
				...current,
				placeId,
				point,
				pointFromPlace: !keep && point !== null,
			};
		});
		setError(null);
	}

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
		const invalid =
			validateEventInput(input) ??
			(!values.placeId && !values.point ? t.geo.picker.pointRequired : null);
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
			<Field id="event-title" label={t.agenda.fieldTitle}>
				<input
					id="event-title"
					className={inputClass}
					value={values.title}
					onChange={(e) => set("title", e.target.value)}
					maxLength={120}
					placeholder={t.agenda.titlePlaceholder}
					required
				/>
			</Field>

			<Field id="event-description" label={t.agenda.fieldDescription}>
				<textarea
					id="event-description"
					className={textareaClass}
					value={values.description}
					onChange={(e) => set("description", e.target.value)}
					placeholder={t.agenda.descriptionPlaceholder}
					required
				/>
			</Field>

			<Field id="event-category" label={t.agenda.category}>
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
				<Field id="event-date" label={t.agenda.fieldDate}>
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
				<Field id="event-start" label={t.agenda.fieldStart}>
					<input
						id="event-start"
						type="time"
						className={inputClass}
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
					<Field id="event-place" label={t.agenda.fieldPlace}>
						<select
							id="event-place"
							className={inputClass}
							value={values.placeId}
							onChange={(e) => choosePlace(e.target.value)}
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

			<LazyPointPicker
				title={t.geo.picker.eventTitle}
				value={values.point}
				initialCenter={placePoint(chosenPlace)}
				note={
					values.pointFromPlace && chosenPlace
						? t.geo.picker.fromPlace(chosenPlace.name)
						: null
				}
				onChange={(point) => {
					setValues((current) => ({
						...current,
						point,
						pointFromPlace: false,
					}));
					setError(null);
				}}
			/>

			<Field
				id="event-capacity"
				label={t.agenda.fieldCapacity}
				hint={t.agenda.capacityHint}
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
				<legend className="q-eyebrow">{t.agenda.entry}</legend>
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
				<Field id="event-price" label={t.agenda.fieldPrice}>
					<input
						id="event-price"
						type="number"
						inputMode="numeric"
						min={1}
						step={500}
						className={inputClass}
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
