import { describe, expect, it } from "vitest";
import {
	computeProgramIndicators,
	getIndicatorVisualState,
} from "./live-indicators-calc";
import type { LiveIndicatorsRawInput } from "./live-indicators-types";

const SAMPLE_INPUT: LiveIndicatorsRawInput = {
	segments: [
		{ is_accessible: true, is_green_route: true },
		{ is_accessible: true, is_green_route: true },
		{ is_accessible: true, is_green_route: true },
		{ is_accessible: false, is_green_route: true },
		{ is_accessible: true, is_green_route: false },
		{ is_accessible: true, is_green_route: false },
		{ is_accessible: false, is_green_route: true },
		{ is_accessible: true, is_green_route: true },
	],
	floodZones: [
		{ code: "ARR-MURILLO-46", alert_active: false },
		{ code: "ARR-FELICIDAD", alert_active: true },
	],
	places: [
		{ is_accessible: true },
		{ is_accessible: true },
		{ is_accessible: false },
	],
	businesses: [
		{ is_verified: true, is_open: true, zone: "barrio_abajo" },
		{ is_verified: true, is_open: true, zone: "barrio_abajo" },
		{ is_verified: true, is_open: true, zone: "centro" },
		{ is_verified: true, is_open: false, zone: "estadio" },
		{ is_verified: false, is_open: true, zone: "gran_malecon" },
	],
	reports: [
		{ status: "resolved" },
		{ status: "open" },
		{ status: "in_review" },
	],
	events: [
		{
			status: "published",
			moderation_status: "published",
			registered_count: 14,
			triage_priority: "none",
			city_resolved_at: null,
		},
		{
			status: "published",
			moderation_status: "published",
			registered_count: 8,
			triage_priority: "city_attention",
			city_resolved_at: "2026-11-27T01:00:00Z",
		},
		{
			status: "cancelled",
			moderation_status: "published",
			registered_count: 99,
			triage_priority: "none",
			city_resolved_at: null,
		},
		{
			status: "published",
			moderation_status: "held",
			registered_count: 5,
			triage_priority: "emergency",
			city_resolved_at: null,
		},
	],
	forumThreads: [
		{
			moderation_status: "published",
			triage_priority: "city_attention",
			city_resolved_at: "2026-11-27T01:10:00Z",
		},
	],
	forumPosts: [
		{
			moderation_status: "published",
			triage_priority: "emergency",
			city_resolved_at: null,
		},
	],
	openDatasetsCount: 6,
	liveEventFloodCodes: ["ARR-MURILLO-46"],
};

describe("live-indicators-calc", () => {
	it("maps progress percentages to QUILLART visual states with explicit Spanish labels", () => {
		expect(getIndicatorVisualState(100)).toEqual({
			tone: "green",
			stateLabel: "En meta",
		});
		expect(getIndicatorVisualState(80)).toEqual({
			tone: "green",
			stateLabel: "En meta",
		});
		expect(getIndicatorVisualState(65)).toEqual({
			tone: "gold",
			stateLabel: "En avance",
		});
		expect(getIndicatorVisualState(49)).toEqual({
			tone: "red",
			stateLabel: "Por mejorar",
		});
	});

	it("builds all 5 dimension cards in program order with targets and separated data origins", () => {
		const cards = computeProgramIndicators(SAMPLE_INPUT);

		expect(cards.map((card) => card.dimension)).toEqual([
			"territorio",
			"sostenibilidad",
			"ciudad_inteligente",
			"ciudadania",
			"economia",
		]);

		const [territorio, sostenibilidad, inteligente, ciudadania, economia] =
			cards;

		// 1. Territorio: 6/8 accessible routes = 75%, plus 2/3 real public spaces
		expect(territorio?.currentDisplay).toBe("75 %");
		expect(territorio?.targetDisplay).toBe("Meta: 100 %");
		expect(territorio?.communityFacts).toEqual([
			{ label: "Espacios públicos accesibles", value: "2 de 3" },
		]);
		expect(territorio?.referenceFacts).toEqual([
			{ label: "Tramos accesibles del corredor", value: "6 de 8" },
		]);

		// 2. Sostenibilidad: 6/8 green routes = 75% (94% of 80% target), 2 active alerts (DB + city-events)
		expect(sostenibilidad?.currentDisplay).toBe("75 %");
		expect(sostenibilidad?.progressPercent).toBe(94);
		expect(sostenibilidad?.referenceFacts).toContainEqual({
			label: "Arroyos monitoreados",
			value: "2 (2 alerta activa)",
		});

		// 3. Ciudad inteligente: 6 / 6 open datasets
		expect(inteligente?.currentDisplay).toBe("6");
		expect(inteligente?.progressPercent).toBe(100);
		expect(inteligente?.actionHref).toBe("/datos");

		// 4. Ciudadanía: 2 published non-cancelled events, 22 registrations, 2/4 closed city notices, 1/3 resolved overcharges -> 3/7 = 43%
		expect(ciudadania?.currentDisplay).toBe("43 %");
		expect(ciudadania?.communityFacts).toEqual([
			{ label: "Eventos publicados", value: "2" },
			{ label: "Inscripciones en agenda", value: "22" },
			{ label: "Avisos a la ciudad cerrados", value: "2 de 4" },
		]);
		expect(ciudadania?.referenceFacts).toEqual([
			{ label: "Reportes de cobro resueltos", value: "1 de 3" },
		]);
		expect(ciudadania?.actionHref).toBe("/moderacion");

		// 5. Economía: 3/4 verified businesses open (unverified excluded), 2 in Barrio Abajo
		expect(economia?.currentDisplay).toBe("3 / 4");
		expect(economia?.progressPercent).toBe(75);
		expect(economia?.referenceFacts).toContainEqual({
			label: "Abiertos en Barrio Abajo",
			value: "2",
		});
	});

	it("handles empty tables cleanly without NaN or division by zero", () => {
		const cards = computeProgramIndicators({
			segments: [],
			floodZones: [],
			places: [],
			businesses: [],
			reports: [],
			events: [],
			forumThreads: [],
			forumPosts: [],
			openDatasetsCount: 0,
		});

		expect(cards).toHaveLength(5);
		for (const card of cards) {
			expect(Number.isNaN(card.progressPercent)).toBe(false);
			expect(card.progressPercent).toBeGreaterThanOrEqual(0);
			expect(card.progressPercent).toBeLessThanOrEqual(100);
		}
		expect(cards[3]?.currentDisplay).toBe("Sin pendientes");
	});
});
