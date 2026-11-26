import { describe, expect, it } from "vitest";
import { CORRIDOR_SEED } from "../corridor/corridor-seed";
import {
	answerLocally,
	guideInstruction,
	parseModelAnswer,
} from "./guide-answer";

describe("answerLocally", () => {
	it("answers a German visitor with the route to the Estadio", () => {
		const answer = answerLocally(CORRIDOR_SEED, "Wie komme ich zum Stadion?");
		expect(answer).toMatchObject({
			language: "de",
			destination: "estadio",
			source: "local",
		});
		expect(answer.plan?.green?.code).toBe("SEG-MAL-EST-TM-GREEN");
		expect(answer.reply).toContain("Transmetro");
	});

	it("offers the destinations when the question has none", () => {
		const answer = answerLocally(CORRIDOR_SEED, "Hello!");
		expect(answer.destination).toBeNull();
		expect(answer.plan).toBeNull();
		expect(answer.reply).toMatch(/Where do you want to go/);
	});
});

describe("guideInstruction", () => {
	it("gives the model our fares for every destination", () => {
		const instruction = guideInstruction(CORRIDOR_SEED);
		expect(instruction).toContain("estadio (Estadio Metropolitano)");
		expect(instruction).toContain("$3.500 COP");
		expect(instruction).toContain("$20.000 COP");
		expect(instruction).toContain("Never invent");
	});
});

describe("parseModelAnswer", () => {
	it("accepts the expected JSON and maps none to null", () => {
		expect(
			parseModelAnswer(
				'{"language":"pt","destination":"none","reply":" Olá! "}',
			),
		).toEqual({ language: "pt", destination: null, reply: "Olá!" });
	});

	it("rejects invalid JSON, unknown languages and empty replies", () => {
		expect(parseModelAnswer("not json")).toBeNull();
		expect(
			parseModelAnswer(
				'{"language":"it","destination":"estadio","reply":"Ciao"}',
			),
		).toBeNull();
		expect(
			parseModelAnswer('{"language":"en","destination":"estadio","reply":""}'),
		).toBeNull();
	});
});
