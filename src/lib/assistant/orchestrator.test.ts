import { describe, expect, it, vi } from "vitest";
import type { DecisionResult, OpenJevClient } from "../openjev/openjev-types";
import type { AssistantContext, AssistantMessage } from "./assistant-types";
import {
	isFollowUp,
	keywordScores,
	MIN_ROUTING_CONFIDENCE,
	routeByKeywords,
	routeMessage,
	slangQuestionTerm,
} from "./orchestrator";

const context: AssistantContext = {
	now: "2026-11-26T15:00:00.000Z",
	signedIn: true,
	displayName: "Ana",
	isVisitor: false,
	fromPath: null,
};

function fakeOpenJev(choice: string, confidence: number) {
	const decide = vi.fn(
		async (): Promise<DecisionResult> => ({
			ok: true,
			model: "openjev-test",
			inputTokens: 10,
			answers: {
				agent: { type: "choice", choice, confidence, probabilities: {} },
			},
		}),
	);
	return { client: { decide } satisfies OpenJevClient, decide };
}

const user = (text: string): AssistantMessage => ({ role: "user", text });

describe("routeByKeywords", () => {
	it.each([
		["¿Qué planes hay este fin de semana?", "agenda"],
		["Quiero inscribirme en un concierto", "agenda"],
		["¿De qué se habla en el foro?", "community"],
		["Lugares de naturaleza para ir con niños", "places"],
		["¿Cómo llego al estadio?", "mobility"],
		["How do I get downtown by bus?", "mobility"],
		["Hay un hueco enorme en la calle 72", "city_reports"],
		["El arroyo se creció y está inundada la vía", "city_reports"],
		["¿En qué eventos estoy inscrito? mis inscripciones", "account"],
		["Quiero ir a mi perfil", "account"],
		["QUÉ HACER en Barranquilla", "places"],
		["llévame al Malecón", "mobility"],
		["Ruta al Gran Malecón", "mobility"],
		["¿Qué novedades hay hoy?", "city_data"],
		["Muéstrame los datos abiertos", "city_data"],
		["Datos históricos y sintéticos de la ciudad", "city_data"],
		["Indicadores de la simulación", "city_data"],
		["¿Cuánto vale el pasaje del Transmetro?", "mobility"],
		["¿Cuál es la tarifa del taxi?", "mobility"],
	])("%s → %s", (text, agent) => {
		expect(routeByKeywords(text)).toBe(agent);
	});

	it("is accent-insensitive", () => {
		expect(routeByKeywords("como llego al centro")).toBe("mobility");
		expect(routeByKeywords("cómo llegó al centro")).toBe("mobility");
	});

	it("returns null without keywords or on a tie", () => {
		expect(routeByKeywords("hola")).toBeNull();
		expect(routeByKeywords("foro parque")).toBeNull();
	});
});

describe("isFollowUp", () => {
	it("detects short follow-ups", () => {
		expect(isFollowUp("sí")).toBe(true);
		expect(isFollowUp("el segundo")).toBe(true);
		expect(isFollowUp("dale, inscríbeme")).toBe(true);
	});

	it("rejects long messages", () => {
		expect(
			isFollowUp("sí, pero también quiero saber cómo llego al estadio mañana"),
		).toBe(false);
	});
});

describe("routeMessage", () => {
	const previous: AssistantMessage = {
		role: "assistant",
		agent: "places",
		text: "Te cuento del Malecón.",
		toolCalls: [],
	};

	it("keeps the previous agent for a follow-up", async () => {
		const decision = await routeMessage(
			[user("lugares"), previous, user("el segundo")],
			context,
			{ openJev: null },
		);
		expect(decision).toEqual({ agent: "places", routedBy: "continuation" });
	});

	it("keeps the previous agent after a tool-results turn", async () => {
		const decision = await routeMessage(
			[
				user("lugares"),
				{
					...previous,
					toolCalls: [{ id: "c1", name: "list_places", args: {} }],
				},
				{
					role: "tool",
					results: [
						{ callId: "c1", name: "list_places", summary: { count: 2 } },
					],
				},
			],
			context,
			{ openJev: null },
		);
		expect(decision).toEqual({ agent: "places", routedBy: "continuation" });
	});

	it("switches when a short follow-up names another section", async () => {
		const decision = await routeMessage(
			[user("lugares"), previous, user("¿y planes esta noche?")],
			context,
			{ openJev: null },
		);
		expect(decision).toEqual({ agent: "agenda", routedBy: "keywords" });
	});

	it("routes by keywords before asking OpenJev", async () => {
		const { client, decide } = fakeOpenJev("community", 0.9);
		const decision = await routeMessage(
			[user("¿Cómo llego al estadio?")],
			context,
			{ openJev: client },
		);
		expect(decision).toEqual({ agent: "mobility", routedBy: "keywords" });
		expect(decide).not.toHaveBeenCalled();
	});

	it("asks OpenJev when keywords are silent, sending only the text", async () => {
		const { client, decide } = fakeOpenJev("community", 0.8);
		const decision = await routeMessage(
			[user("quiero saber qué opinan de la nueva ciclovía")],
			context,
			{ openJev: client },
		);
		expect(decision).toEqual({ agent: "community", routedBy: "openjev" });
		const [state] = decide.mock.calls[0] as unknown as [unknown];
		expect(state).toEqual({
			message: "quiero saber qué opinan de la nueva ciclovía",
		});
		expect(JSON.stringify(decide.mock.calls)).not.toContain("Ana");
	});

	it("ignores OpenJev below the confidence threshold", async () => {
		const { client } = fakeOpenJev("community", MIN_ROUTING_CONFIDENCE - 0.1);
		const decision = await routeMessage([user("hola")], context, {
			openJev: client,
		});
		expect(decision).toEqual({ agent: "quillart", routedBy: "keywords" });
	});

	it("ignores an unknown OpenJev choice and failures", async () => {
		const { client } = fakeOpenJev("weather", 0.99);
		expect(
			(await routeMessage([user("hola")], context, { openJev: client })).agent,
		).toBe("quillart");
		const failing: OpenJevClient = {
			decide: async () => ({ ok: false, reason: "timeout" }),
		};
		expect(
			(await routeMessage([user("hola")], context, { openJev: failing })).agent,
		).toBe("quillart");
	});

	it("sends a keyword tie to the orchestrator agent", async () => {
		const decision = await routeMessage([user("foro parque")], context, {
			openJev: null,
		});
		expect(decision.agent).toBe("quillart");
	});

	it("sends requests for several sections to the orchestrator agent", async () => {
		for (const text of [
			"hay eventos hoy y cómo llego",
			"eventos este sábado y cuánto cuesta el pasaje",
			"conciertos y novedades",
		]) {
			const decision = await routeMessage([user(text)], context, {
				openJev: null,
			});
			expect(decision).toEqual({ agent: "quillart", routedBy: "keywords" });
		}
	});

	it("keeps one section with a weak extra match and no joiner", async () => {
		const decision = await routeMessage(
			[user("¿Qué planes hay este fin de semana cerca del parque?")],
			context,
			{ openJev: null },
		);
		expect(decision.agent).toBe("agenda");
	});
});

describe("multilingual keywords", () => {
	it.each([
		["Quais eventos tem no fim de semana?", "agenda"],
		["Quels événements ce week-end ?", "agenda"],
		["O que se fala no fórum da comunidade?", "community"],
		["Qu'est-ce qu'on dit dans la communauté ?", "community"],
		["Praias e natureza para visitar", "places"],
		["Une plage ou un musée à visiter", "places"],
		["Como chego ao estádio de ônibus?", "mobility"],
		["Comment aller au stade en bus ?", "mobility"],
		["Tem um buraco enorme na rua", "city_reports"],
		["Il y a un nid de poule dans la rue", "city_reports"],
		["Quero ver meu perfil", "account"],
		["Je veux voir mon profil", "account"],
	])("%s → %s", (text, agent) => {
		expect(routeByKeywords(text)).toBe(agent);
	});

	it("keeps the Spanish keyword scores unchanged", () => {
		expect(
			keywordScores("¿Qué planes hay este fin de semana cerca del parque?"),
		).toEqual({
			agenda: 3,
			community: 0,
			places: 1,
			mobility: 0,
			city_reports: 0,
			account: 0,
			quillart: 0,
			city_data: 0,
		});
	});

	it("tells OpenJev the message may come in another language", async () => {
		const { client, decide } = fakeOpenJev("community", 0.8);
		await routeMessage([user("hola")], context, { openJev: client });
		const [, schema] = decide.mock.calls[0] as unknown as [
			unknown,
			{ agent: { instructions: string } },
		];
		expect(schema.agent.instructions).toMatch(
			/Spanish, English, Portuguese or French/,
		);
	});
});

describe("slang questions", () => {
	it.each([
		["¿Qué significa bacano?", "Bacano"],
		["que quiere decir mamar gallo en Barranquilla", "Mamar gallo"],
		["What does mi llave mean?", "Mi llave"],
		["O que é trancón?", "Trancón"],
		["¿Qué es ajá?", "¡Ajá!"],
	])("%s asks about %s", (text, term) => {
		expect(slangQuestionTerm(text)).toBe(term);
	});

	it.each([
		"bacano",
		"El Malecón está bacano",
		"¿Qué es el trancón en la vía 40 hoy?",
		"¿Qué es una alerta de arroyo?",
		"¿Qué eventos hay hoy?",
	])("%s is not a slang question", (text) => {
		expect(slangQuestionTerm(text)).toBeNull();
	});

	it("routes slang words to places by keyword", () => {
		expect(routeByKeywords("¿Qué significa esa palabra en costeño?")).toBe(
			"places",
		);
		expect(routeByKeywords("Enséñame la jerga")).toBe("places");
	});

	it("sends a glossary word to places, even as a follow-up or on another screen", async () => {
		const agendaTurn: AssistantMessage = {
			role: "assistant",
			agent: "agenda",
			text: "Busco planes.",
			toolCalls: [],
		};
		expect(
			await routeMessage(
				[user("planes hoy"), agendaTurn, user("¿qué es bacano?")],
				context,
				{ openJev: null },
			),
		).toEqual({ agent: "places", routedBy: "keywords" });
		expect(
			await routeMessage(
				[user("¿Qué significa mamar gallo?")],
				{
					...context,
					screen: { route: "/agenda", title: "Agenda", role: "visitor" },
				},
				{ openJev: null },
			),
		).toEqual({ agent: "places", routedBy: "keywords" });
	});
});
