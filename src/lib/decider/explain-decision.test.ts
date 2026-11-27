import { describe, expect, it } from "vitest";
import type { DecisionWithSource, RouteOption } from "./decider-types";
import { explainDecision } from "./explain-decision";

const transmetro: RouteOption = {
	id: "tm",
	label: "Transmetro directo",
	durationMinutes: 38,
	fareCop: 3500,
	crowdLevel: 0.4,
	accessible: true,
	floodZoneIds: [],
};

const walk: RouteOption = {
	...transmetro,
	id: "walk",
	label: "A pie",
	fareCop: 0,
};

function decision(overrides: Partial<DecisionWithSource>): DecisionWithSource {
	return {
		option: transmetro,
		confidence: 0.7,
		discarded: [],
		chosenBy: "openjev",
		...overrides,
	};
}

describe("explainDecision", () => {
	it("summarizes the chosen route with time and fare in one sentence", () => {
		expect(explainDecision(decision({}))).toBe(
			"Te recomendamos Transmetro directo: 38 min, $3.500.",
		);
	});

	it("says free when the fare is zero", () => {
		expect(explainDecision(decision({ option: walk }))).toBe(
			"Te recomendamos A pie: 38 min, gratis.",
		);
	});

	it("mentions the routes avoided because of an active flood", () => {
		const text = explainDecision(
			decision({
				discarded: [
					{ optionId: "taxi", reason: "active-flood" },
					{ optionId: "mix", reason: "active-flood" },
				],
			}),
		);
		expect(text).toBe(
			"Te recomendamos Transmetro directo: 38 min, $3.500. Evitamos 2 rutas por arroyo activo.",
		);
	});

	it("mentions accessible mode when routes were dropped for accessibility", () => {
		const text = explainDecision(
			decision({
				discarded: [
					{ optionId: "taxi", reason: "active-flood" },
					{ optionId: "mix", reason: "not-accessible" },
				],
			}),
		);
		expect(text).toBe(
			"Te recomendamos Transmetro directo: 38 min, $3.500. Evitamos 1 ruta por arroyo activo. Solo mostramos rutas accesibles.",
		);
	});

	it("tells the visitor there is no safe route and what to do", () => {
		const text = explainDecision(
			decision({
				option: null,
				confidence: 0,
				chosenBy: "none",
				discarded: [{ optionId: "taxi", reason: "active-flood" }],
			}),
		);
		expect(text).toBe(
			"Ahora no hay una ruta segura. Espera en un lugar seco o pide un anfitrión.",
		);
	});

	it("says the route has shade when every stop has it", () => {
		const text = explainDecision(
			decision({ option: { ...transmetro, shadeShare: 1 } }),
		);
		expect(text).toBe(
			"Te recomendamos Transmetro directo: 38 min, $3.500. Esta ruta tiene sombra en los paraderos.",
		);
	});

	it("does not promise shade when only part of the route has it", () => {
		const text = explainDecision(
			decision({ option: { ...transmetro, shadeShare: 0.5 } }),
		);
		expect(text).not.toContain("sombra");
	});
});
