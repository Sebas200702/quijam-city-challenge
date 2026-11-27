import { describe, expect, it } from "vitest";
import type { GuideAnswer } from "./guide-answer";
import { offlineGuideAnswer, withOfflineGuide } from "./guide-offline";

const offlineFetch: typeof fetch = async () => {
	throw new TypeError("Failed to fetch");
};

const askGuide = (question: string) => ({
	method: "POST",
	headers: { "Content-Type": "application/json" },
	body: JSON.stringify({ question }),
});

describe("offlineGuideAnswer", () => {
	it("answers the three routes in the visitor's language with a trip card", () => {
		const stadium = offlineGuideAnswer("How do I get to the stadium?");
		expect(stadium?.language).toBe("en");
		expect(stadium?.destination).toBe("estadio");
		expect(stadium?.plan).not.toBeNull();
		expect(offlineGuideAnswer("¿Cómo llego a Barrio Abajo?")?.destination).toBe(
			"barrio_abajo",
		);
		expect(offlineGuideAnswer("Comment aller au centre ?")?.destination).toBe(
			"centro",
		);
	});

	it("has nothing to say without a known destination", () => {
		expect(offlineGuideAnswer("¿Dónde como arepa de huevo?")).toBeNull();
	});
});

describe("withOfflineGuide", () => {
	it("answers /api/guide/ask on the phone when the network fails", async () => {
		const guided = withOfflineGuide(offlineFetch);
		const response = await guided(
			"/api/guide/ask",
			askGuide("Como chego ao estádio?"),
		);
		const answer = (await response.json()) as GuideAnswer;
		expect(answer.language).toBe("pt");
		expect(answer.destination).toBe("estadio");
	});

	it("keeps the network error for other requests and unknown questions", async () => {
		const guided = withOfflineGuide(offlineFetch);
		await expect(guided("/api/assistant", askGuide("estadio"))).rejects.toThrow(
			"Failed to fetch",
		);
		await expect(
			guided("/api/guide/ask", askGuide("¿Qué hay hoy?")),
		).rejects.toThrow("Failed to fetch");
	});

	it("passes online answers through untouched", async () => {
		const online = new Response("{}");
		const guided = withOfflineGuide(async () => online);
		expect(await guided("/api/guide/ask", askGuide("estadio"))).toBe(online);
	});
});
