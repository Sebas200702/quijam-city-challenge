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

	it("asks to sign in before an action", () => {
		const turn = answerLocally(
			"agenda",
			ask("Quiero publicar un evento"),
			anonymous,
		);
		expect(turn.toolCalls).toEqual([
			{
				name: "open_page",
				args: { path: "/perfil", label: "Entrar o crear cuenta" },
			},
		]);
		expect(turn.text).toMatch(/cuenta/);
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
		const anon = answerLocally("city_reports", ask(text), anonymous);
		expect(anon.text).toMatch(/123/);
		expect(anon.toolCalls.map((call) => call.name)).toEqual(["open_page"]);
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
