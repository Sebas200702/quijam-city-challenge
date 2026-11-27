import { describe, expect, it } from "vitest";
import { PLACES } from "../community/places-catalog";
import { CORRIDOR_SEED } from "../corridor/corridor-seed";
import { arrivalRouteTarget, resolveRouteTarget } from "./route-target";

const catalog = { stops: CORRIDOR_SEED.stops, places: PLACES };

describe("resolveRouteTarget", () => {
	it("keeps the three known destinations on their stops", () => {
		expect(resolveRouteTarget("estadio", catalog)).toEqual({
			stopCode: "STOP-ESTADIO",
			name: "Estadio Metropolitano",
		});
		expect(resolveRouteTarget("barrio_abajo", catalog)).toEqual({
			stopCode: "STOP-BARRIO-ABAJO",
			name: "Barrio Abajo",
		});
		expect(resolveRouteTarget("centro", catalog)).toEqual({
			stopCode: "STOP-CENTRO",
			name: "Centro",
		});
	});

	it("routes to any corridor stop by its code", () => {
		const stop = CORRIDOR_SEED.stops.find(
			(item) => item.code === "STOP-MURILLO-46",
		);
		expect(resolveRouteTarget("STOP-MURILLO-46", catalog)).toEqual({
			stopCode: "STOP-MURILLO-46",
			name: stop?.name,
		});
	});

	it("routes to a catalog place through its nearest stop", () => {
		const target = resolveRouteTarget("gran-malecon", catalog);
		expect(target).toEqual({
			stopCode: expect.stringMatching(/^STOP-MALECON/),
			name: "Gran Malecón del Río",
		});
	});

	it("refuses places outside the metropolitan area and unknown keys", () => {
		expect(resolveRouteTarget("isla-salamanca", catalog)).toBeNull();
		expect(resolveRouteTarget("no-existe", catalog)).toBeNull();
		expect(resolveRouteTarget("constructor", catalog)).toBeNull();
	});
});

describe("arrivalRouteTarget", () => {
	it("opens no route on arrival without ?destino=", () => {
		expect(arrivalRouteTarget("", catalog)).toBeNull();
		expect(arrivalRouteTarget("?capa=lugares", catalog)).toBeNull();
	});

	it("opens the asked route with ?destino=", () => {
		expect(arrivalRouteTarget("?destino=estadio", catalog)?.stopCode).toBe(
			"STOP-ESTADIO",
		);
		expect(arrivalRouteTarget("?destino=gran-malecon", catalog)?.name).toBe(
			"Gran Malecón del Río",
		);
	});
});
