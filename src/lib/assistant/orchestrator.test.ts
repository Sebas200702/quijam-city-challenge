import { describe, expect, it, vi } from "vitest";
import type { DecisionResult, OpenJevClient } from "../openjev/openjev-types";
import type { AssistantContext, AssistantMessage } from "./assistant-types";
import {
	isFollowUp,
	MIN_ROUTING_CONFIDENCE,
	routeByKeywords,
	routeMessage,
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
		expect(decision).toEqual({ agent: "agenda", routedBy: "keywords" });
	});

	it("ignores an unknown OpenJev choice and failures", async () => {
		const { client } = fakeOpenJev("weather", 0.99);
		expect(
			(await routeMessage([user("hola")], context, { openJev: client })).agent,
		).toBe("agenda");
		const failing: OpenJevClient = {
			decide: async () => ({ ok: false, reason: "timeout" }),
		};
		expect(
			(await routeMessage([user("hola")], context, { openJev: failing })).agent,
		).toBe("agenda");
	});

	it("breaks keyword ties by priority without OpenJev", async () => {
		const decision = await routeMessage([user("foro parque")], context, {
			openJev: null,
		});
		expect(decision.agent).toBe("community");
	});
});
