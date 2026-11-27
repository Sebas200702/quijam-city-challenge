import { describe, expect, it } from "vitest";
import { prefillHref, readPrefill } from "./form-prefill";
import {
	activeFilters,
	filtersSearch,
	matchesWhen,
	readAgendaFilters,
	readPlacesFilters,
} from "./list-filters";

describe("list filters in the URL (U13)", () => {
	it("reads only known agenda filters", () => {
		expect(readAgendaFilters("?q=salsa&categoria=music&cuando=finde")).toEqual({
			q: "salsa",
			categoria: "music",
			cuando: "finde",
		});
		expect(readAgendaFilters("?categoria=drugs&cuando=siempre")).toEqual({
			q: "",
			categoria: null,
			cuando: null,
		});
		expect(readPlacesFilters("?tipo=park")).toEqual({ q: "", tipo: "park" });
		expect(readPlacesFilters("?tipo=mall")).toEqual({ q: "", tipo: null });
	});

	it("writes only the set filters", () => {
		expect(filtersSearch({ q: "", categoria: "music", cuando: null })).toBe(
			"?categoria=music",
		);
		expect(filtersSearch({})).toBe("");
		expect(activeFilters({ q: " ", tipo: "park" })).toEqual({ tipo: "park" });
	});

	it("filters by date in Barranquilla time", () => {
		// Thursday 26 Nov 2026, 10:00 in Barranquilla.
		const now = new Date("2026-11-26T15:00:00.000Z");
		const at = (day: number, hour = 18) =>
			new Date(Date.UTC(2026, 10, day, hour + 5)).toISOString();
		expect(matchesWhen(at(26), "hoy", now)).toBe(true);
		expect(matchesWhen(at(27), "hoy", now)).toBe(false);
		expect(matchesWhen(at(28), "finde", now)).toBe(true);
		expect(matchesWhen(at(29), "finde", now)).toBe(true);
		expect(matchesWhen(at(27), "finde", now)).toBe(false);
		expect(matchesWhen(at(2 + 30, 10), "semana", now)).toBe(true);
		expect(matchesWhen(at(25), "semana", now)).toBe(false);
		expect(matchesWhen(at(25), null, now)).toBe(true);
	});
});

describe("prefilled forms (U14, U16, U17)", () => {
	it("reads the event form from the URL, dropping bad values", () => {
		expect(
			readPrefill(
				"event",
				"?titulo=Limpieza&categoria=volunteer&fecha=2026-11-28&hora=8am&lugar=gran-malecon",
			),
		).toEqual({
			title: "Limpieza",
			category: "volunteer",
			date: "2026-11-28",
			place: "gran-malecon",
		});
	});

	it("builds links that open the form already filled", () => {
		expect(
			prefillHref("thread", { title: "Poste caído", body: "En la 79" }),
		).toBe("/foro?nuevo=1&titulo=Poste+ca%C3%ADdo&texto=En+la+79");
		expect(
			prefillHref("overcharge", { amount: "25000", vehicle: "taxi" }),
		).toBe("/reportar?monto=25000&vehiculo=taxi");
		expect(prefillHref("reply", { body: "x" })).toBeNull();
		expect(readPrefill("overcharge", "?monto=12&vehiculo=avion")).toEqual({});
	});
});
