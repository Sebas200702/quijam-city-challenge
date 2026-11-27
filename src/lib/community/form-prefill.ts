// Prefilled forms (U14, U16, U17): the event, conversation, reply and fare
// report forms accept their fields from the URL, so Quillart AI (or a shared
// link) can open them already filled. The person still reviews and sends.

import type { ScreenFormId } from "../assistant/screen-context-types";
import { REPORT_TRANSPORT_MODES } from "../reports/overcharge-report";
import {
	EVENT_CATEGORY_LABELS,
	FORUM_CATEGORY_LABELS,
} from "./community-labels";

/** URL parameter of each form field (Spanish, like the rest of the URLs). */
export const PREFILL_PARAMS: Record<ScreenFormId, Record<string, string>> = {
	event: {
		title: "titulo",
		description: "descripcion",
		category: "categoria",
		date: "fecha",
		startTime: "hora",
		place: "lugar",
		locationText: "direccion",
	},
	thread: { title: "titulo", body: "texto", category: "categoria" },
	reply: { body: "respuesta" },
	overcharge: {
		segment: "segment",
		amount: "monto",
		vehicle: "vehiculo",
		notes: "nota",
	},
};

/** Where each form lives; the reply form needs its conversation. */
const FORM_PATHS: Record<Exclude<ScreenFormId, "reply">, string> = {
	event: "/agenda/nuevo",
	thread: "/foro",
	overcharge: "/reportar",
};

const MAX_FIELD = 2000;
const SHORT_FIELD = 200;

/** Shape each field must have; free text only needs a sane length. */
const FIELD_RULES: Record<string, (value: string) => boolean> = {
	title: (value) => value.length <= 120,
	category: (value) =>
		Object.hasOwn(EVENT_CATEGORY_LABELS, value) ||
		Object.hasOwn(FORUM_CATEGORY_LABELS, value),
	date: (value) => /^\d{4}-\d{2}-\d{2}$/.test(value),
	startTime: (value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value),
	place: (value) => /^[A-Za-z0-9_-]{1,100}$/.test(value),
	locationText: (value) => value.length <= SHORT_FIELD,
	segment: (value) => /^[A-Za-z0-9_-]{1,60}$/.test(value),
	amount: (value) => /^\d{3,7}$/.test(value),
	vehicle: (value) =>
		(REPORT_TRANSPORT_MODES as readonly string[]).includes(value),
	notes: (value) => value.length <= 500,
};

/** Keeps only the known fields of a form, trimmed and with a valid shape. */
export function cleanPrefill(
	form: ScreenFormId,
	fields: Record<string, unknown>,
): Record<string, string> {
	const clean: Record<string, string> = {};
	for (const key of Object.keys(PREFILL_PARAMS[form])) {
		const raw = fields[key];
		if (typeof raw !== "string") continue;
		const value = raw.trim().slice(0, MAX_FIELD);
		if (value === "") continue;
		const rule = FIELD_RULES[key];
		if (rule && !rule(value)) continue;
		clean[key] = value;
	}
	return clean;
}

/** The prefilled fields a form finds in its URL. */
export function readPrefill(
	form: ScreenFormId,
	search: string,
): Record<string, string> {
	const params = new URLSearchParams(search);
	const raw: Record<string, string> = {};
	for (const [field, param] of Object.entries(PREFILL_PARAMS[form])) {
		const value = params.get(param);
		if (value !== null) raw[field] = value;
	}
	return cleanPrefill(form, raw);
}

/** Link to a form with its fields filled, or null for the reply form. */
export function prefillHref(
	form: ScreenFormId,
	fields: Record<string, string>,
): string | null {
	if (form === "reply") return null;
	const params = new URLSearchParams();
	if (form === "thread") params.set("nuevo", "1");
	for (const [field, value] of Object.entries(cleanPrefill(form, fields))) {
		params.set(PREFILL_PARAMS[form][field], value);
	}
	const search = params.toString();
	return `${FORM_PATHS[form]}${search ? `?${search}` : ""}`;
}
