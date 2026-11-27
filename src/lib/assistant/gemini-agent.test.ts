import { describe, expect, it } from "vitest";
import type { AssistantContext } from "./assistant-types";
import { contextFacts, systemInstructionFor } from "./gemini-agent";

const context: AssistantContext = {
	now: "2026-11-26T15:00:00.000Z",
	signedIn: true,
	displayName: "Ana",
	isVisitor: true,
	fromPath: null,
};

describe("Gemini reply language", () => {
	it.each([
		["es", "Spanish"],
		["en", "English"],
		["pt", "Portuguese"],
		["fr", "French"],
	] as const)("tells the model to answer in %s", (language, name) => {
		expect(systemInstructionFor("agenda", { ...context, language })).toMatch(
			new RegExp(`chose ${name} as their app language: reply in it`),
		);
	});

	it("still answers in the person's language without a chosen one", () => {
		const instruction = systemInstructionFor("agenda", context);
		expect(contextFacts(context)).not.toMatch(/app language/);
		expect(instruction).toMatch(/Spanish, English, Portuguese or French/);
	});
});
