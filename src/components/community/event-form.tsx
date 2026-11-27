// Form to publish a community event; the moderation triage decides what happens next.
// It can be filled without an account (the account is asked for on publishing,
// keeping what was written) and arrive prefilled by Quillart AI or by the URL
// (`?titulo=&descripcion=&categoria=&fecha=&hora=&lugar=`, U14).

import { ArrowLeft, LogIn } from "lucide-react";
import { type SyntheticEvent, useEffect, useState } from "react";
import { readPrefill } from "../../lib/community/form-prefill";
import { AgentMark } from "../agent-dock/agent-mark";
import { usePublishScreen } from "../agent-dock/use-screen-context";
import { useUiAction } from "../agent-dock/use-ui-action";
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

/** What was written before signing in, kept for this tab only. */
const DRAFT_KEY = "quillart-event-draft";

function savedDraft(): Partial<FormValues> {
	try {
		const raw = sessionStorage.getItem(DRAFT_KEY);
		return raw ? (JSON.parse(raw) as Partial<FormValues>) : {};
	} catch {
		return {};
	}
}

function saveDraft(values: FormValues | null) {
	try {
		if (values) sessionStorage.setItem(DRAFT_KEY, JSON.stringify(values));
		else sessionStorage.removeItem(DRAFT_KEY);
	} catch {
		// Storage blocked: the form still works, the draft just is not kept.
	}
}

/** Prefilled fields (URL or agent) on top of the form values. */
function withPrefill(
	values: FormValues,
	fields: Record<string, string>,
): FormValues {
	return {
		...values,
		...(fields.title ? { title: fields.title } : {}),
		...(fields.description ? { description: fields.description } : {}),
		...(fields.category && fields.category in EVENT_CATEGORY_LABELS
			? { category: fields.category as EventCategory }
			: {}),
		...(fields.date ? { date: fields.date } : {}),
		...(fields.startTime ? { startTime: fields.startTime } : {}),
		// A catalog place id or slug; resolved against the list once it loads.
		...(fields.place ? { placeId: fields.place } : {}),
		...(fields.locationText
			? { locationText: fields.locationText, placeId: OTHER_PLACE }
			: {}),
	};
}

function initialValues(): FormValues {
	const empty: FormValues = {
		title: "",
		description: "",
		category: "community",
		date: "",
		startTime: "",
		endTime: "",
		placeId: OTHER_PLACE,
		locationText: "",
		capacity: "",
		isFree: true,
		price: "",
	};
	return withPrefill(
		{ ...empty, ...savedDraft() },
		readPrefill("event", window.location.search),
	);
}

/** Form fields the agent filled, to mark them in gold. */
const PREFILL_INPUTS: Record<string, keyof FormValues> = {
	title: "title",
	description: "description",
	category: "category",
	date: "date",
	startTime: "startTime",
	place: "placeId",
	locationText: "locationText",
};

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
			) : (
				<EventFormBody signedIn={session.profile !== null} />
			)}
		</CommunityShell>
	);
}

function EventFormBody({ signedIn }: { signedIn: boolean }) {
	const t = useT();
	const store = useStore();
	const { state: placesState } = useLoad((s) => s.listPlaces(), []);
	const [values, setValues] = useState<FormValues>(initialValues);
	const [agentFilled, setAgentFilled] = useState<Set<keyof FormValues>>(
		() => new Set(),
	);
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [result, setResult] = useState<PublishResult<CommunityEvent> | null>(
		null,
	);

	// A `?lugar=` id or slug resolves to the catalog place; anything else
	// falls back to a free-text address.
	useEffect(() => {
		if (placesState.status !== "ready") return;
		setValues((current) => {
			if (!current.placeId) return current;
			const place = placesState.data.find(
				(item) => item.id === current.placeId || item.slug === current.placeId,
			);
			if (place?.id === current.placeId) return current;
			return { ...current, placeId: place?.id ?? OTHER_PLACE };
		});
	}, [placesState]);

	usePublishScreen({
		route: "/agenda/nuevo",
		title: t.agenda.formTitle,
		draft: {
			form: "event",
			fields: {
				title: values.title,
				description: values.description,
				category: values.category,
				date: values.date,
				startTime: values.startTime,
				locationText: values.locationText,
			},
		},
	});

	// Quillart AI fills the form on screen; the person reviews and publishes.
	useUiAction("form.prefill", (action) => {
		if (action.form !== "event") return null;
		const before = values;
		const beforeFilled = agentFilled;
		setValues(withPrefill(values, action.fields));
		const filled = new Set(
			Object.keys(action.fields).flatMap((key) =>
				PREFILL_INPUTS[key] ? [PREFILL_INPUTS[key]] : [],
			),
		);
		setAgentFilled(filled);
		return {
			labels: [t.dock.formFilled(filled.size)],
			undo: () => {
				setValues(before);
				setAgentFilled(beforeFilled);
			},
		};
	});

	const today = isoToBogotaLocal(new Date().toISOString()).slice(0, 10);
	const mark = (key: keyof FormValues) =>
		agentFilled.has(key) ? " q-agent-filled" : "";

	function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
		setValues((current) => ({ ...current, [key]: value }));
		setError(null);
	}

	async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);
		setResult(null);
		if (!signedIn) {
			// Ask for the account only now, keeping what was written (U14).
			saveDraft(values);
			window.location.assign(signInHref());
			return;
		}
		const input = toInput(values);
		const invalid = validateEventInput(input);
		if (invalid) {
			setError(invalid);
			return;
		}
		setSubmitting(true);
		try {
			const published = await store.createEvent(input);
			setResult(published);
			if (published.outcome !== "rejected") saveDraft(null);
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
		<form
			id="event-form"
			onSubmit={handleSubmit}
			className="q-card space-y-5 p-5"
			noValidate
		>
			{agentFilled.size > 0 && <AgentMark text={t.dock.filledByAgent} />}
			<Field id="event-title" label={t.agenda.fieldTitle}>
				<input
					id="event-title"
					className={`${inputClass}${mark("title")}`}
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
					className={`${textareaClass}${mark("description")}`}
					value={values.description}
					onChange={(e) => set("description", e.target.value)}
					placeholder={t.agenda.descriptionPlaceholder}
					required
				/>
			</Field>

			<Field id="event-category" label={t.agenda.category}>
				<select
					id="event-category"
					className={`${inputClass}${mark("category")}`}
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
						className={`${inputClass}${mark("date")}`}
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
						className={`${inputClass}${mark("startTime")}`}
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
							className={`${inputClass}${mark("placeId")}`}
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
				>
					<input
						id="event-location"
						className={`${inputClass}${mark("locationText")}`}
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
					{!signedIn && <LogIn size={18} aria-hidden="true" />}
					{submitting
						? t.agenda.publishing
						: signedIn
							? t.agenda.publishEvent
							: t.agenda.signInTitle}
				</button>
				<p className="q-sm q-muted text-center">
					{signedIn ? t.agenda.moderationNote : t.agenda.signInText}
				</p>
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
