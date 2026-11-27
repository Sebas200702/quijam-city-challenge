// Form to publish a community event; the moderation triage decides what happens next.

import { ArrowLeft, LogIn } from "lucide-react";
import { type SyntheticEvent, useEffect, useState } from "react";
import { askHref } from "../../lib/assistant/assistant-labels";
import { EVENT_CATEGORY_LABELS } from "../../lib/community/community-labels";
import {
	bogotaLocalToIso,
	type EventInputField,
	type EventInputIssue,
	eventInputIssue,
	isoToBogotaLocal,
} from "../../lib/community/community-rules";
import type {
	CommunityEvent,
	EventCategory,
	NewEventInput,
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
import {
	errorText,
	signInHref,
	useLoad,
	useSession,
	useStore,
} from "./use-community";

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

/** Control that shows the problem of `field`, so the form can focus it. */
function controlId(field: EventInputField, values: FormValues): string {
	if (field === "start") return values.date ? "event-start" : "event-date";
	if (field === "place") return "event-location";
	return `event-${field}`;
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
	const [issue, setIssue] = useState<EventInputIssue | null>(null);
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
		setIssue(null);
	}

	// After a failed check, move to the field once its message is on screen,
	// so the screen reader reads the label and the message together.
	// biome-ignore lint/correctness/useExhaustiveDependencies: only a new check moves the focus.
	useEffect(() => {
		if (issue) document.getElementById(controlId(issue.field, values))?.focus();
	}, [issue]);

	/** The message for one control, when the last check pointed at it. */
	const errorFor = (id: string) =>
		issue && controlId(issue.field, values) === id ? issue.message : null;

	async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);
		setResult(null);
		const input = toInput(values);
		const invalid = eventInputIssue(input);
		if (invalid) {
			setIssue(invalid);
			return;
		}
		setSubmitting(true);
		try {
			setResult(await store.createEvent(input));
		} catch (err) {
			setError(errorText(err, t.agenda.publishError));
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
			<Field
				id="event-title"
				error={errorFor("event-title")}
				label={t.agenda.fieldTitle}
			>
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

			<Field
				id="event-description"
				error={errorFor("event-description")}
				label={t.agenda.fieldDescription}
			>
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
				<Field
					id="event-date"
					error={errorFor("event-date")}
					label={t.agenda.fieldDate}
				>
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
				<Field
					id="event-start"
					error={errorFor("event-start")}
					label={t.agenda.fieldStart}
				>
					<input
						id="event-start"
						type="time"
						className={inputClass}
						value={values.startTime}
						onChange={(e) => set("startTime", e.target.value)}
						required
					/>
				</Field>
				<Field
					id="event-end"
					error={errorFor("event-end")}
					label={t.agenda.fieldEnd}
				>
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
					error={errorFor("event-location")}
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

			<Field
				id="event-capacity"
				error={errorFor("event-capacity")}
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
				<Field
					id="event-price"
					error={errorFor("event-price")}
					label={t.agenda.fieldPrice}
				>
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
