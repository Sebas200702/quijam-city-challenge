import { describe, expect, it, vi } from "vitest";
import type { DecisionResult, OpenJevClient } from "../openjev/openjev-types";
import { applyModerationRules, isTrustedLink } from "./moderation-rules";
import { triageContent } from "./triage";

function jev(
	verdict: string,
	confidence: number,
	label = "ok",
	priority = "none",
): OpenJevClient {
	const result: DecisionResult = {
		ok: true,
		model: "openjev-test",
		inputTokens: 100,
		answers: {
			verdict: {
				type: "choice",
				choice: verdict,
				probabilities: {},
				confidence,
			},
			label: {
				type: "choice",
				choice: label,
				probabilities: {},
				confidence: 0.7,
			},
			priority: {
				type: "choice",
				choice: priority,
				probabilities: {},
				confidence: 0.7,
			},
		},
	};
	return { decide: vi.fn(async () => result) };
}

describe("applyModerationRules", () => {
	it("publishes a friendly message", () => {
		const findings = applyModerationRules({
			kind: "post",
			body: "¡Ajá! Nos vemos el sábado en el Malecón, llevo agua para todos.",
		});
		expect(findings.verdict).toBe("publish");
		expect(findings.labels).toEqual(["ok"]);
		expect(findings.priority).toBe("none");
	});

	it("rejects phone numbers and e-mails (personal data)", () => {
		expect(
			applyModerationRules({ kind: "post", body: "Escríbanme al 300 123 4567" })
				.verdict,
		).toBe("reject");
		expect(
			applyModerationRules({ kind: "post", body: "mi correo es ana@mail.com" })
				.labels,
		).toContain("personal_data");
	});

	it("holds insults for review even with accents or repeated letters", () => {
		const findings = applyModerationRules({
			kind: "post",
			body: "Eres un IMBÉCIIIIL",
		});
		expect(findings.verdict).toBe("review");
		expect(findings.labels).toContain("harassment");
	});

	it("does not flag words that only contain a blocked term", () => {
		expect(
			applyModerationRules({ kind: "post", body: "Traigan la computadora" })
				.verdict,
		).toBe("publish");
	});

	it("flags public-space reports and emergencies for the city", () => {
		expect(
			applyModerationRules({
				kind: "thread",
				title: "Arroyo en la 46",
				body: "Se está creciendo, no pasen.",
			}).priority,
		).toBe("city_attention");
		expect(
			applyModerationRules({
				kind: "post",
				body: "Hay un niño perdido cerca de la Casa del Carnaval",
			}).priority,
		).toBe("emergency");
	});
});

describe("triageContent", () => {
	it("uses rules only when OpenJev is not configured", async () => {
		const decision = await triageContent(
			{ kind: "post", body: "Qué bonito el atardecer hoy" },
			null,
		);
		expect(decision).toMatchObject({ verdict: "publish", source: "rules" });
	});

	it("never sends personal data to OpenJev", async () => {
		const client = jev("publish", 0.9);
		const decision = await triageContent(
			{ kind: "post", body: "Llámame al 3001234567" },
			client,
		);
		expect(decision.verdict).toBe("reject");
		expect(client.decide).not.toHaveBeenCalled();
	});

	it("lets OpenJev hold a message the rules missed", async () => {
		const decision = await triageContent(
			{ kind: "post", body: "Los de ese barrio no deberían venir" },
			jev("review", 0.7, "hate"),
		);
		expect(decision).toMatchObject({
			verdict: "review",
			source: "openjev",
			confidence: 0.7,
		});
		expect(decision.labels).toContain("hate");
	});

	it("turns a low-confidence reject into a human review", async () => {
		const decision = await triageContent(
			{ kind: "post", body: "Ese evento es una estafa" },
			jev("reject", 0.4, "scam"),
		);
		expect(decision.verdict).toBe("review");
	});

	it("keeps the stricter verdict when rules and OpenJev disagree", async () => {
		const decision = await triageContent(
			{ kind: "post", body: "Qué gonorrea ese trancón" },
			jev("publish", 0.9),
		);
		expect(decision.verdict).toBe("review");
	});

	it("routes OpenJev's emergency triage to the city with the 123 line", async () => {
		const decision = await triageContent(
			{ kind: "thread", title: "Ayuda", body: "Se cayó una señora en la vía" },
			jev("publish", 0.9, "ok", "emergency"),
		);
		expect(decision.priority).toBe("emergency");
		expect(decision.reason).toContain("123");
	});

	it("falls back to rules when OpenJev fails", async () => {
		const client: OpenJevClient = {
			decide: vi.fn(async () => ({
				ok: false as const,
				reason: "timeout" as const,
			})),
		};
		const decision = await triageContent(
			{ kind: "post", body: "Nos vemos allá" },
			client,
		);
		expect(decision).toMatchObject({ verdict: "publish", source: "rules" });
	});
});

describe("trust and safety rules", () => {
	it("holds chain-message alarms as possible misinformation", () => {
		const findings = applyModerationRules({
			kind: "thread",
			title: "ALERTA MÁXIMA",
			body: "Difundan: van a cerrar todos los puentes esta noche",
		});
		expect(findings.verdict).toBe("review");
		expect(findings.labels).toContain("misinformation");
	});

	it("holds messages that speak as an official authority", () => {
		const findings = applyModerationRules({
			kind: "post",
			body: "Comunicado oficial: la alcaldía regala boletas en el estadio",
		});
		expect(findings.verdict).toBe("review");
		expect(findings.labels).toContain("impersonation");
	});

	it("holds external links but publishes official domains", () => {
		expect(
			applyModerationRules({
				kind: "post",
				body: "Inscríbanse aquí https://bit.ly/regalo",
			}).verdict,
		).toBe("review");
		expect(
			applyModerationRules({
				kind: "post",
				body: "Info en https://www.barranquilla.gov.co/cultura",
			}).verdict,
		).toBe("publish");
	});

	it("recognises trusted subdomains only", () => {
		expect(isTrustedLink("https://cultura.barranquilla.gov.co/x")).toBe(true);
		expect(isTrustedLink("https://barranquilla.gov.co.evil.com")).toBe(false);
	});
});
