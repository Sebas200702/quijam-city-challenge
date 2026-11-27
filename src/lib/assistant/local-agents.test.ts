import { describe, expect, it } from "vitest";
import { AGENT_IDS, AGENTS } from "./assistant-agents";
import type {
	AssistantContext,
	AssistantMessage,
	AssistantToolResult,
} from "./assistant-types";
import {
	answerLocally,
	bogotaWeekday,
	daysAheadFrom,
	wrapUpResult,
	wrapUpResults,
} from "./local-agents";

// Thursday 26 November 2026, 10:00 a. m. in Barranquilla.
const NOW = "2026-11-26T15:00:00.000Z";

const signedIn: AssistantContext = {
	now: NOW,
	signedIn: true,
	displayName: "Ana",
	isVisitor: false,
	fromPath: null,
};
const anonymous: AssistantContext = {
	...signedIn,
	signedIn: false,
	displayName: null,
};

const ask = (text: string): AssistantMessage[] => [{ role: "user", text }];

describe("dates in Barranquilla", () => {
	it("uses the Bogotá weekday", () => {
		expect(bogotaWeekday(NOW)).toBe(4);
		// 2 a. m. UTC Friday is still Thursday night in Barranquilla.
		expect(bogotaWeekday("2026-11-27T02:00:00.000Z")).toBe(4);
	});

	it("resolves relative days", () => {
		expect(daysAheadFrom("planes para hoy", NOW)).toBe(0);
		expect(daysAheadFrom("¿y mañana?", NOW)).toBe(1);
		expect(daysAheadFrom("este fin de semana", NOW)).toBe(3);
		expect(daysAheadFrom("el sábado", NOW)).toBe(2);
		expect(daysAheadFrom("algo bonito", NOW)).toBeNull();
	});
});

describe("agenda", () => {
	it("searches weekend plans with a category", () => {
		const turn = answerLocally(
			"agenda",
			ask("Planes de música este fin de semana"),
			signedIn,
		);
		expect(turn.toolCalls).toEqual([
			{ name: "search_events", args: { days_ahead: 3, category: "music" } },
		]);
		expect(turn.text).toMatch(/música/);
	});

	it("adds the place when one is named", () => {
		const turn = answerLocally(
			"agenda",
			ask("¿Qué eventos hay en el Gran Malecón?"),
			signedIn,
		);
		expect(turn.toolCalls[0]).toEqual({
			name: "search_events",
			args: { place_slug: "gran-malecon" },
		});
	});

	it("opens the form to publish an event", () => {
		const turn = answerLocally(
			"agenda",
			ask("Quiero publicar un evento"),
			signedIn,
		);
		expect(turn.toolCalls).toEqual([
			{
				name: "open_page",
				args: { path: "/agenda/nuevo", label: "Publicar un evento" },
			},
		]);
	});

	it("registers for the event picked by position", () => {
		const messages: AssistantMessage[] = [
			{ role: "user", text: "planes hoy" },
			{
				role: "assistant",
				agent: "agenda",
				text: "Busco.",
				toolCalls: [{ id: "c1", name: "search_events", args: {} }],
			},
			{
				role: "tool",
				results: [
					{
						callId: "c1",
						name: "search_events",
						summary: { count: 2, events: [{ id: "e-1" }, { id: "e-2" }] },
					},
				],
			},
			{
				role: "assistant",
				agent: "agenda",
				text: "Encontré 2.",
				toolCalls: [],
			},
			{ role: "user", text: "inscríbeme en el segundo" },
		];
		const turn = answerLocally("agenda", messages, signedIn);
		expect(turn.toolCalls).toEqual([
			{ name: "register_for_event", args: { event_id: "e-2" } },
		]);
	});

	it("keeps the event draft without an account (U02)", () => {
		const turn = answerLocally(
			"agenda",
			ask(
				"Quiero publicar un evento: limpieza del arroyo en Rebolo el sábado a las 8 am",
			),
			anonymous,
		);
		expect(turn.toolCalls).toEqual([
			{
				name: "create_event",
				args: {
					title: "Limpieza del arroyo en Rebolo",
					description: "Limpieza del arroyo en Rebolo el sábado a las 8 am",
					category: "volunteer",
					starts_at_local: "2026-11-28T08:00",
				},
			},
		]);
	});

	it("drafts an event from a quoted title with capacity (dock QA)", () => {
		const turn = answerLocally(
			"agenda",
			ask(
				"Publica un evento 'Concierto gratis de música en vivo en el Malecón' el sábado a las 6 pm con 50 cupos",
			),
			signedIn,
		);
		expect(turn.toolCalls).toEqual([
			{
				name: "create_event",
				args: {
					title: "Concierto gratis de música en vivo en el Malecón",
					description:
						"Concierto gratis de música en vivo en el Malecón el sábado a las 6 pm con 50 cupos",
					category: "music",
					starts_at_local: "2026-11-28T18:00",
					capacity: 50,
					place_slug: "gran-malecon",
				},
			},
		]);
		expect(turn.text).not.toMatch(/Antes de salir/);
		expect(turn.text).toMatch(/si el sistema detecta algo, pasa a revisión/);
	});

	it("reads typographic quotes, people, price and explicit dates", () => {
		const turn = answerLocally(
			"agenda",
			ask(
				"Quiero crear un evento “Noche de salsa” el 5 de diciembre a las 8 de la noche para 40 personas, la entrada cuesta $15.000",
			),
			signedIn,
		);
		expect(turn.toolCalls[0]).toMatchObject({
			name: "create_event",
			args: {
				title: "Noche de salsa",
				category: "music",
				starts_at_local: "2026-12-05T20:00",
				capacity: 40,
				price_cop: 15000,
			},
		});
	});

	it("titles free text without quotes before the date and capacity", () => {
		const turn = answerLocally(
			"agenda",
			ask(
				"Publica un evento de yoga en el Parque Washington mañana a las 7 am, cupo de 25, gratis",
			),
			signedIn,
		);
		expect(turn.toolCalls[0]).toMatchObject({
			name: "create_event",
			args: {
				title: "Yoga en el Parque Washington",
				category: "sport",
				starts_at_local: "2026-11-27T07:00",
				capacity: 25,
				place_slug: "parque-washington",
			},
		});
		expect(
			(turn.toolCalls[0].args as { price_cop?: number }).price_cop,
		).toBeUndefined();
	});

	it("does not take a time with a colon as the event intro", () => {
		const turn = answerLocally(
			"agenda",
			ask("Publica un evento de salsa el sábado a las 6:30 pm"),
			signedIn,
		);
		expect(turn.toolCalls[0]).toMatchObject({
			name: "create_event",
			args: { title: "Salsa", starts_at_local: "2026-11-28T18:30" },
		});
	});

	it("opens the form filled when the day or hour is missing (U14)", () => {
		const turn = answerLocally(
			"agenda",
			ask("Quiero publicar un evento: taller de cumbia en Barrio Abajo"),
			anonymous,
		);
		expect(turn.toolCalls[0]).toMatchObject({
			name: "open_page",
			args: { label: "Publicar un evento" },
		});
		const path = (turn.toolCalls[0].args as { path: string }).path;
		expect(path.startsWith("/agenda/nuevo?")).toBe(true);
		expect(new URLSearchParams(path.split("?")[1]).get("titulo")).toBe(
			"Taller de cumbia en Barrio Abajo",
		);
	});

	it("keeps a registration pending without an account (U02)", () => {
		const turn = answerLocally("agenda", ask("Inscríbeme"), {
			...anonymous,
			screen: {
				route: "/agenda/[id]",
				title: "x",
				role: "visitor",
				entity: { kind: "event", id: "e-9", name: "x" },
			},
		});
		expect(turn.toolCalls).toEqual([
			{ name: "register_for_event", args: { event_id: "e-9" } },
		]);
	});
});

describe("other agents", () => {
	it("community lists threads or opens a new one", () => {
		expect(
			answerLocally("community", ask("¿Qué se habla de movilidad?"), signedIn)
				.toolCalls,
		).toEqual([{ name: "list_threads", args: { category: "mobility" } }]);
		expect(
			answerLocally("community", ask("Quiero abrir una conversación"), signedIn)
				.toolCalls[0],
		).toEqual({
			name: "open_page",
			args: { path: "/foro?nuevo=1", label: "Abrir conversación" },
		});
	});

	it("places finds a named place, directions or a kind", () => {
		expect(
			answerLocally(
				"places",
				ask("Háblame de la Ciénaga de Mallorquín"),
				signedIn,
			).toolCalls,
		).toEqual([
			{ name: "get_place", args: { place_slug: "cienaga-de-mallorquin" } },
		]);
		expect(
			answerLocally("places", ask("¿Cómo llego al zoológico?"), signedIn)
				.toolCalls,
		).toEqual([
			{
				name: "get_directions",
				args: { place_slug: "zoologico-barranquilla" },
			},
		]);
		expect(
			answerLocally("places", ask("parques para trotar"), signedIn).toolCalls,
		).toEqual([{ name: "list_places", args: { kind: "park" } }]);
	});

	it("routes to a place when the person asks to be taken there (dock QA)", () => {
		for (const text of [
			"llévame al Malecón",
			"quiero ir al Malecón",
			"¿cómo llego al Gran Malecón?",
			"ruta al Malecón",
		]) {
			for (const agent of ["mobility", "places"] as const) {
				expect(answerLocally(agent, ask(text), signedIn).toolCalls).toEqual([
					{ name: "get_directions", args: { place_slug: "gran-malecon" } },
				]);
			}
		}
		expect(
			answerLocally("mobility", ask("llévame al estadio"), signedIn).toolCalls,
		).toEqual([{ name: "plan_route", args: { destination: "estadio" } }]);
	});

	it("mobility plans corridor routes", () => {
		expect(
			answerLocally("mobility", ask("¿Cómo llego al estadio?"), signedIn)
				.toolCalls,
		).toEqual([{ name: "plan_route", args: { destination: "estadio" } }]);
	});

	it("city reports propose the full text and mention 123 in emergencies", () => {
		const text = "Hay un accidente y un herido en la vía al lado del Malecón";
		const turn = answerLocally("city_reports", ask(text), signedIn);
		expect(turn.text).toMatch(/123/);
		expect(turn.toolCalls).toEqual([
			{
				name: "report_issue",
				args: { description: text, place_slug: "gran-malecon" },
			},
		]);
		// Without an account the report stays ready to confirm after signing in (U02).
		const anon = answerLocally("city_reports", ask(text), anonymous);
		expect(anon.text).toMatch(/123/);
		expect(anon.toolCalls.map((call) => call.name)).toEqual(["report_issue"]);
	});

	it("account lists my registrations", () => {
		expect(
			answerLocally("account", ask("¿En qué estoy inscrito?"), signedIn)
				.toolCalls,
		).toEqual([{ name: "my_registrations", args: {} }]);
	});

	it.each(AGENT_IDS)("%s only proposes its own tools", (agent) => {
		const prompts = [
			"planes hoy",
			"inscríbeme en el primero",
			"publicar evento",
			"abrir conversación",
			"cómo llego al estadio",
			"hay un hueco",
			"mi perfil",
			"parques",
		];
		for (const context of [signedIn, anonymous]) {
			for (const prompt of prompts) {
				for (const call of answerLocally(agent, ask(prompt), context)
					.toolCalls) {
					expect(AGENTS[agent].tools).toContain(call.name);
				}
			}
		}
	});
});

describe("tool-result wrap-up", () => {
	const result = (
		partial: Partial<AssistantToolResult> & Pick<AssistantToolResult, "name">,
	): AssistantToolResult => ({ callId: "c1", summary: {}, ...partial });

	it("counts what was found", () => {
		expect(
			wrapUpResult(
				result({ name: "search_events", summary: { count: 3, events: [] } }),
			),
		).toMatch(/^Encontré 3 planes/);
		expect(
			wrapUpResult(result({ name: "search_events", summary: { count: 0 } })),
		).toMatch(/^No encontré/);
		expect(
			wrapUpResult(result({ name: "list_places", summary: { places: [{}] } })),
		).toMatch(/1 lugar/);
	});

	it("confirms actions, declines and moderation", () => {
		expect(
			wrapUpResult(
				result({
					name: "register_for_event",
					summary: { outcome: "registered" },
				}),
			),
		).toMatch(/^¡Listo, quedaste inscrito/);
		expect(
			wrapUpResult(
				result({
					name: "register_for_event",
					declined: true,
					summary: { declined: true },
				}),
			),
		).toMatch(/no hice nada/);
		expect(
			wrapUpResult(
				result({ name: "create_thread", summary: { outcome: "held" } }),
			),
		).toMatch(/revisión/);
		expect(
			wrapUpResult(
				result({
					name: "report_issue",
					declined: true,
					summary: { outcome: "rejected" },
				}),
			),
		).toMatch(/No se publicó/);
		expect(
			wrapUpResult(
				result({ name: "get_event", declined: true, summary: { error: "x" } }),
			),
		).toMatch(/no se pudo/);
	});

	it("answers a tool turn without new tool calls", () => {
		const turn = answerLocally(
			"agenda",
			[
				{
					role: "tool",
					results: [
						result({ name: "search_events", summary: { count: 2 } }),
						result({ name: "open_page", summary: { shown: "/agenda" } }),
					],
				},
			],
			signedIn,
		);
		expect(turn.toolCalls).toEqual([]);
		expect(turn.text).toMatch(/Encontré 2 planes/);
		expect(wrapUpResults([result({ name: "open_page" })])).toMatch(/Listo/);
	});
});

describe("reply language", () => {
	const result = (
		partial: Partial<AssistantToolResult> & Pick<AssistantToolResult, "name">,
	): AssistantToolResult => ({ callId: "c1", summary: {}, ...partial });
	const inLanguage = (language: "es" | "en" | "pt" | "fr") => ({
		...signedIn,
		language,
	});

	it.each([
		["en", /^Let me look for music and dance plans for you\./],
		["pt", /^Vou procurar planos de música e dança para você\./],
		["fr", /^Je cherche des sorties musique et danse pour toi\./],
	] as const)("the local agenda agent answers in %s", (language, expected) => {
		const turn = answerLocally("agenda", ask("concert"), inLanguage(language));
		expect(turn.text).toMatch(expected);
		expect(turn.toolCalls).toEqual([
			{ name: "search_events", args: { category: "music" } },
		]);
	});

	it.each([
		["en", "Sign in or create an account"],
		["pt", "Entrar ou criar conta"],
		["fr", "Se connecter ou créer un compte"],
	] as const)("the sign-in button is labeled in %s", (language, label) => {
		const turn = answerLocally("account", ask("profile"), {
			...anonymous,
			language,
		});
		expect(turn.toolCalls).toEqual([
			{ name: "open_page", args: { path: "/perfil", label } },
		]);
	});

	it.each([
		["en", /^I found 3 plans\./],
		["pt", /^Encontrei 3 planos\./],
		["fr", /^J'ai trouvé 3 sorties\./],
	] as const)("wraps up tool results in %s", (language, expected) => {
		expect(
			wrapUpResult(
				result({ name: "search_events", summary: { count: 3 } }),
				language,
			),
		).toMatch(expected);
	});

	it("keeps Spanish replies unchanged when the language is Spanish or missing", () => {
		const spanish = answerLocally("agenda", ask("concierto"), inLanguage("es"));
		expect(spanish).toEqual(
			answerLocally("agenda", ask("concierto"), signedIn),
		);
		expect(spanish.text).toBe(
			"Déjame buscar planes de música y baile para ti.",
		);
		expect(
			wrapUpResult(
				result({ name: "search_events", summary: { count: 3 } }),
				"es",
			),
		).toBe("Encontré 3 planes. ¿Te inscribo en alguno?");
		expect(wrapUpResults([result({ name: "open_page" })], "es")).toBe(
			"Listo. ¿Te ayudo con algo más?",
		);
	});
});

describe("drafts in the chosen language (S5)", () => {
	const draftAsk = ask(
		"Quiero publicar un evento: limpieza del arroyo en Rebolo el sábado a las 8 am",
	);
	const formAsk = ask("Quiero publicar un evento de limpieza");
	const fareAsk = ask("Me cobraron 25.000 en un taxi al estadio");

	it.each([
		[
			"es",
			"Te armé el evento con lo que me dijiste: revisa el texto exacto y confírmalo abajo. Se publica al confirmar; si el sistema detecta algo, pasa a revisión.",
		],
		[
			"en",
			"I put the event together from what you told me: check the exact text and confirm it below. It goes live when you confirm; if the system flags something, it goes to review.",
		],
	] as const)("an event draft card speaks %s", (language, text) => {
		const turn = answerLocally("agenda", draftAsk, { ...signedIn, language });
		expect(turn.text).toBe(text);
		expect(turn.toolCalls[0]?.name).toBe("create_event");
	});

	it.each([
		[
			"es",
			"Te dejé el formulario lleno con lo que me dijiste; complétalo con la fecha y la hora y publícalo.",
			"Publicar un evento",
		],
		[
			"en",
			"I filled in the form with what you told me; add the date and time and publish it.",
			"Publish an event",
		],
	] as const)("a partial event draft speaks %s", (language, text, label) => {
		const turn = answerLocally("agenda", formAsk, { ...signedIn, language });
		expect(turn.text).toBe(text);
		expect(turn.toolCalls).toEqual([
			{
				name: "open_page",
				args: { path: expect.stringMatching(/^\/agenda\/nuevo/), label },
			},
		]);
	});

	it.each([
		[
			"es",
			"Te dejé el reporte de cobro casi listo: revisa el tramo y el monto y envíalo.",
			"Reportar el cobro",
		],
		[
			"en",
			"I left the fare report almost ready: check the route and the amount and send it.",
			"Report the fare",
		],
	] as const)("a fare report draft speaks %s", (language, text, label) => {
		const turn = answerLocally("city_reports", fareAsk, {
			...signedIn,
			language,
		});
		expect(turn.text).toBe(text);
		expect(turn.toolCalls).toEqual([
			{
				name: "open_page",
				args: { path: "/reportar?monto=25000&vehiculo=taxi", label },
			},
		]);
	});
});
