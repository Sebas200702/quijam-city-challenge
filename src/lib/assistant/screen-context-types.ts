// What the person is looking at, published by each screen and sent with every
// Quillart AI request (audit v2, U06 and §6.3). The orchestrator uses it to
// pick the screen's agent first, and the agents use it so "¿qué hay aquí?"
// needs no place name. Titles, names and draft text can be written by other
// people or by the person: the server always treats them as untrusted data.

/** Who is using the screen: the surface decides the agent's tone and tools. */
export type ScreenRole = "visitor" | "vendor" | "host" | "city" | "presenter";

/** Things a screen can have open. */
export type ScreenEntityKind =
	| "event"
	| "place"
	| "thread"
	| "business"
	| "stop"
	| "floodZone";

export interface ScreenEntity {
	kind: ScreenEntityKind;
	/** Event or thread id, place slug, business or stop code. */
	id: string;
	/** Shown name; user-generated for events and threads. */
	name: string;
}

/** Forms the agent can read (draft) and prefill (`form.prefill`). */
export type ScreenFormId = "event" | "thread" | "reply" | "overcharge";

export interface ScreenDraft {
	form: ScreenFormId;
	/** Only the non-empty fields; values are the person's own text. */
	fields: Record<string, string>;
}

export interface ScreenMapView {
	/** View centre, rounded to about a kilometre: it is not the person's position. */
	center: [number, number];
	zoom: number;
	/** Code of the selected stop, arroyo or business. */
	selected?: string;
	route?: { origen: string; destino: string };
}

export interface ScreenContext {
	/** Route pattern: "/agenda", "/agenda/[id]", "/mapa"… */
	route: string;
	/** What the person sees as the screen title. */
	title: string;
	entity?: ScreenEntity;
	/** Active filters, by their URL name (`q`, `categoria`, `fecha`, `tipo`). */
	filters?: Record<string, string>;
	map?: ScreenMapView;
	draft?: ScreenDraft;
	role: ScreenRole;
	/** Coarse zone (corridor zone or neighbourhood). Never exact coordinates. */
	zone?: string;
}
