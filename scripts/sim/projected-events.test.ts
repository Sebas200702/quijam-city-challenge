import { describe, expect, it } from "vitest";
import {
	PROJECTED_EVENTS,
	type ProjectedEvent,
	projectedDescription,
	validateProjectedEvents,
} from "./projected-events";

const base: ProjectedEvent = {
	title: "Prueba",
	description: "Texto.",
	category: "culture",
	startsAt: "2026-12-08T18:00",
	isFree: true,
	basis: "past-edition",
	pastEdition: "2024",
	sourceUrl: "https://example.org/nota",
};

describe("projectedDescription", () => {
	it("marks every event as a projection with its edition and source", () => {
		const text = projectedDescription(base);
		expect(text).toContain(
			"Proyección basada en la edición 2024 (fuente: https://example.org/nota)",
		);
		expect(text).toMatch(/hora estimada/i);
	});

	it("says the date is announced when it comes from the 2027 announcement", () => {
		expect(
			projectedDescription({
				...base,
				basis: "announced",
				pastEdition: "2026",
			}),
		).toMatch(/Fecha anunciada/);
	});
});

describe("validateProjectedEvents", () => {
	it("accepts the loaded list", () => {
		expect(PROJECTED_EVENTS.length).toBeGreaterThan(0);
		expect(validateProjectedEvents(PROJECTED_EVENTS)).toEqual([]);
	});

	it("rejects missing sources, bad dates, out-of-window dates and duplicates", () => {
		const errors = validateProjectedEvents([
			{ ...base, sourceUrl: "" },
			{ ...base, title: "B", startsAt: "8 dic" },
			{ ...base, title: "C", startsAt: "2027-05-01T10:00" },
			{ ...base, title: "D", endsAt: "2026-12-08T17:00" },
			{ ...base, title: "D" },
		]);
		expect(errors.join("\n")).toMatch(/Prueba: sourceUrl/);
		expect(errors.join("\n")).toMatch(/B: startsAt/);
		expect(errors.join("\n")).toMatch(/C: outside/);
		expect(errors.join("\n")).toMatch(/D: endsAt/);
		expect(errors.join("\n")).toMatch(/D: duplicate/);
	});
});
