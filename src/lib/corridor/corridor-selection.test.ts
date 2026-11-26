import { describe, expect, it } from "vitest";
import { CORRIDOR_SEED } from "./corridor-seed";
import {
	describeSelection,
	findPoint,
	orderedStops,
	selectionKey,
} from "./corridor-selection";

describe("describeSelection", () => {
	it("returns null without a selection or for an unknown code", () => {
		expect(describeSelection(CORRIDOR_SEED, null)).toBeNull();
		expect(
			describeSelection(CORRIDOR_SEED, { kind: "stop", code: "NOPE" }),
		).toBeNull();
	});

	it("describes a stop with its type, zone and services", () => {
		const detail = describeSelection(CORRIDOR_SEED, {
			kind: "stop",
			code: "STOP-MALECON-NORTE",
		});
		expect(detail).toMatchObject({
			title: "Gran Malecon (Sector Puerta de Oro)",
			eyebrow: "Paradero",
			status: { tone: "green", label: "Accesible" },
			facts: [
				{ label: "Tipo", value: "Punto QR" },
				{ label: "Zona", value: "Gran Malecón" },
			],
			services: ["accessible", "hydration", "recycling"],
			simulated: true,
		});
	});

	it("describes a flood zone with its advisory and radius", () => {
		const detail = describeSelection(CORRIDOR_SEED, {
			kind: "floodZone",
			code: "ARR-BARRIO-ABAJO",
		});
		expect(detail?.status).toEqual({ tone: "gold", label: "Riesgo alto" });
		expect(detail?.eyebrow).toBe("Arroyo");
		expect(detail?.facts).toEqual([
			{ label: "Radio", value: "140 m" },
			{ label: "Zona", value: "Barrio Abajo" },
		]);
		expect(detail?.description).toMatch(/carrera 54/);
	});

	it("describes a business with its category and badges", () => {
		const detail = describeSelection(CORRIDOR_SEED, {
			kind: "business",
			code: "BIZ-JUGOS-ESTADIO",
		});
		expect(detail).toMatchObject({
			eyebrow: "Negocio del barrio",
			facts: [
				{ label: "Categoría", value: "Comida popular" },
				{ label: "Zona", value: "Estadio" },
			],
			status: { tone: "neutral", label: "Cerrado" },
			services: ["verified", "commissionFree"],
		});
	});
});

describe("findPoint", () => {
	it("finds a point ignoring case and accents", () => {
		expect(findPoint(CORRIDOR_SEED, "carnaval")).toEqual({
			kind: "stop",
			code: "STOP-BARRIO-ABAJO",
		});
		expect(findPoint(CORRIDOR_SEED, "Fritos DOÑA")).toEqual({
			kind: "business",
			code: "BIZ-FRITOS-ROSA",
		});
	});

	it("returns null for an empty query or no match", () => {
		expect(findPoint(CORRIDOR_SEED, "   ")).toBeNull();
		expect(findPoint(CORRIDOR_SEED, "Bogotá")).toBeNull();
	});
});

describe("orderedStops and selectionKey", () => {
	it("orders stops from the Estadio to the Gran Malecon", () => {
		const codes = orderedStops([...CORRIDOR_SEED.stops].reverse()).map(
			(stop) => stop.code,
		);
		expect(codes[0]).toBe("STOP-ESTADIO");
		expect(codes.at(-1)).toBe("STOP-MALECON-NORTE");
	});

	it("builds a stable key per kind and code", () => {
		expect(selectionKey({ kind: "business", code: "BIZ-CAFE-PAZ" })).toBe(
			"business:BIZ-CAFE-PAZ",
		);
	});
});
