import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ActiveDiversionCard } from "./active-diversion-card";
import {
	SAMPLE_ACTIVE_DIVERSION,
	SAMPLE_ARROYOS,
	SAMPLE_HOSTS,
	SAMPLE_PROPOSAL,
	SAMPLE_ROUTES,
} from "./city-sections-sample";
import { DiversionProposalCard } from "./diversion-proposal-card";
import { FloodResponseSection } from "./flood-response-section";

const noop = () => {};

function countPrimary(html: string): number {
	return html.match(/q-btn--primary/g)?.length ?? 0;
}

describe("FloodResponseSection", () => {
	it("shows one alert, routes and hosts without a primary action", () => {
		const html = renderToStaticMarkup(
			createElement(FloodResponseSection, {
				arroyos: SAMPLE_ARROYOS,
				routes: SAMPLE_ROUTES,
				hosts: SAMPLE_HOSTS,
				loadState: "ready",
				onViewAssignment: noop,
			}),
		);
		expect(html.match(/q-alert--alert/g)).toHaveLength(1);
		expect(html).toContain("2 arroyos se activan en 6 min");
		expect(html).toContain("Rutas afectadas");
		expect(html).toContain("Ver asignación");
		expect(html).not.toContain("q-alert--modal");
		expect(countPrimary(html)).toBe(0);
	});

	it("shows the empty state when no arroyo is alerted", () => {
		const html = renderToStaticMarkup(
			createElement(FloodResponseSection, {
				arroyos: [SAMPLE_ARROYOS[2]],
				routes: [],
				hosts: [],
				loadState: "ready",
			}),
		);
		expect(html).toContain("Sin arroyos activos");
	});
});

describe("Decider diversion", () => {
	it("proposal: why, details and Aplicar desvío as the one primary", () => {
		const html = renderToStaticMarkup(
			createElement(DiversionProposalCard, {
				proposal: SAMPLE_PROPOSAL,
				loadState: "ready",
				onApply: noop,
				onDiscard: noop,
			}),
		);
		expect(html).toContain(SAMPLE_PROPOSAL.why);
		expect(html).toContain("Ver detalles");
		expect(html).toContain("82 %");
		expect(html).toContain("Aplicar desvío");
		expect(countPrimary(html)).toBe(1);
	});

	it("proposal: blocks apply when a rule fails", () => {
		const html = renderToStaticMarkup(
			createElement(DiversionProposalCard, {
				proposal: {
					...SAMPLE_PROPOSAL,
					rules: [{ id: "pause", passed: false, text: "El comité pausó." }],
				},
				loadState: "ready",
				onApply: noop,
				onDiscard: noop,
			}),
		);
		expect(html).toContain("una regla del barrio no se cumple");
		expect(html).toMatch(/q-btn--primary"[^>]*disabled/);
	});

	it("active diversion: revert is secondary, no primary", () => {
		const html = renderToStaticMarkup(
			createElement(ActiveDiversionCard, {
				diversion: SAMPLE_ACTIVE_DIVERSION,
				loadState: "ready",
				justApplied: true,
				onRevert: noop,
				onTogglePause: noop,
			}),
		);
		expect(html).toContain("Aplicaste el desvío");
		expect(html).toContain("Saturado → Moderado");
		expect(html).toContain("Revertir desvío");
		expect(countPrimary(html)).toBe(0);
	});
});
