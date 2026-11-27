import { describe, expect, it } from "vitest";
import type { AssistantContext, AssistantMessage } from "./assistant-types";
import { answerOffline } from "./offline-answer";

const context: AssistantContext = {
	now: "2026-11-26T15:00:00.000Z",
	signedIn: true,
	displayName: "Ana",
	isVisitor: true,
	fromPath: null,
};
const notes = { offline: "[offline]", noActions: "[no actions]" };
const ids = () => "id-1";
const ask = (text: string): AssistantMessage[] => [{ role: "user", text }];

describe("answerOffline", () => {
	it("plans the stadium route on the phone, marked as offline", async () => {
		const response = await answerOffline(
			{ messages: ask("¿Cómo llego al estadio?"), context },
			notes,
			ids,
		);
		expect(response.agent).toBe("mobility");
		expect(response.source).toBe("local");
		expect(response.text.startsWith("[offline] ")).toBe(true);
		expect(response.toolCalls).toEqual([
			{ id: "id-1", name: "plan_route", args: { destination: "estadio" } },
		]);
	});

	it("never proposes an action without network", async () => {
		const response = await answerOffline(
			{
				messages: ask("Quiero reportar un hueco en la calle 72 desde ayer"),
				context,
			},
			notes,
			ids,
		);
		expect(
			response.toolCalls.every((call) => call.name !== "report_issue"),
		).toBe(true);
		expect(response.text).toBe("[offline] [no actions]");
	});

	it("wraps up tool results without repeating the offline note", async () => {
		const messages: AssistantMessage[] = [
			...ask("¿Cómo llego al estadio?"),
			{
				role: "assistant",
				agent: "mobility",
				text: "Te armo la ruta.",
				toolCalls: [
					{ id: "c1", name: "plan_route", args: { destination: "estadio" } },
				],
			},
			{
				role: "tool",
				results: [
					{
						callId: "c1",
						name: "plan_route",
						summary: { reply: "Toma el Transmetro." },
					},
				],
			},
		];
		const response = await answerOffline({ messages, context }, notes, ids);
		expect(response.text.startsWith("[offline]")).toBe(false);
		expect(response.toolCalls).toEqual([]);
	});

	it("obeys app commands offline: the screen changes without network", async () => {
		const response = await answerOffline(
			{ messages: ask("modo oscuro"), context },
			notes,
			ids,
		);
		expect(response.toolCalls).toEqual([
			{ id: "id-1", name: "set_theme", args: { theme: "dark" } },
		]);
		expect(response.text).toBe("[offline] Listo, activé el modo oscuro.");
		expect(response.uiActions).toContainEqual(
			expect.objectContaining({ type: "app.theme", theme: "dark" }),
		);
	});
});
