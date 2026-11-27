import { describe, expect, it } from "vitest";
import { isInsideAmb } from "../geo/amb-boundary";
import {
	AMB_ZONES,
	ambZone,
	isAmbZone,
	neighborhoodLabel,
} from "../geo/amb-zones";
import { mapHref, parseMapUrl } from "../map/map-url";
import {
	municipalityName,
	pointOf,
	resolvePoint,
	validatePoint,
} from "./community-geo";
import { validateEventInput, validateThreadInput } from "./community-rules";
import type { NewEventInput } from "./community-types";

// Plaza de la Paz (Barranquilla) and the main park of Galapa.
const PLAZA = { latitude: 10.9878, longitude: -74.7889 };
const GALAPA = { latitude: 10.8966, longitude: -74.8858 };
// Santa Marta: well outside the Metropolitan Area.
const SANTA_MARTA = { latitude: 11.2408, longitude: -74.199 };

describe("community points", () => {
	it("accepts no point, or a point inside the AMB", () => {
		expect(validatePoint(null, null)).toBeNull();
		expect(validatePoint(undefined, undefined)).toBeNull();
		expect(validatePoint(PLAZA.latitude, PLAZA.longitude)).toBeNull();
	});

	it("refuses half a point, text and points outside the AMB", () => {
		expect(validatePoint(PLAZA.latitude, null)).toMatch(/área metropolitana/);
		expect(validatePoint("10.98", "-74.78")).toMatch(/área metropolitana/);
		expect(validatePoint(SANTA_MARTA.latitude, SANTA_MARTA.longitude)).toMatch(
			/área metropolitana/,
		);
	});

	it("stores the picked point with its municipality", () => {
		expect(resolvePoint(GALAPA)).toEqual({ ...GALAPA, municipality: "galapa" });
		expect(municipalityName(PLAZA)).toBe("Barranquilla");
	});

	it("lends the catalog place's point when none was picked", () => {
		expect(resolvePoint({}, PLAZA)).toMatchObject({
			...PLAZA,
			municipality: "barranquilla",
		});
		// The picked point wins over the place's.
		expect(resolvePoint(GALAPA, PLAZA).municipality).toBe("galapa");
		expect(pointOf({ latitude: null, longitude: null }, null)).toBeNull();
		expect(pointOf({}, SANTA_MARTA)).toBeNull();
	});

	it("validates the point of events and threads", () => {
		const event: NewEventInput = {
			title: "Siembra de árboles",
			description: "Traer guantes y agua, nos vemos en la entrada.",
			category: "nature",
			startsAt: new Date(Date.now() + 86_400_000).toISOString(),
			endsAt: null,
			placeId: null,
			locationText: "Parque principal",
			capacity: null,
			isFree: true,
			priceCop: null,
		};
		expect(validateEventInput({ ...event, ...GALAPA })).toBeNull();
		expect(validateEventInput({ ...event, ...SANTA_MARTA })).toMatch(
			/área metropolitana/,
		);
		const thread = {
			title: "Poste caído en la 79",
			body: "Está sobre el andén.",
			category: "safety" as const,
			placeId: null,
			eventId: null,
		};
		expect(validateThreadInput({ ...thread, ...PLAZA })).toBeNull();
		expect(validateThreadInput({ ...thread, ...SANTA_MARTA })).toMatch(
			/área metropolitana/,
		);
	});

	it("requires a point on a safety report (U16)", () => {
		const report = {
			title: "Poste caído en la esquina",
			body: "Bloquea la acera desde ayer.",
			category: "safety" as const,
			placeId: null,
			eventId: null,
		};
		expect(validateThreadInput(report)).toMatch(/.+/);
		expect(validateThreadInput({ ...report, ...PLAZA })).toBeNull();
	});
});

describe("AMB zones (profile neighborhood)", () => {
	it("are coarse zones whose centres fall inside the AMB", () => {
		expect(AMB_ZONES).toHaveLength(9);
		for (const zone of AMB_ZONES)
			expect(isInsideAmb(zone.center[0], zone.center[1])).toBe(true);
	});

	it("labels zones and keeps old free text as it was", () => {
		expect(isAmbZone("galapa")).toBe(true);
		expect(isAmbZone("El Prado")).toBe(false);
		expect(ambZone("barranquilla-riomar")?.name).toBe("Riomar");
		expect(neighborhoodLabel("puerto-colombia")).toBe("Puerto Colombia");
		expect(neighborhoodLabel("El Prado")).toBe("El Prado");
		expect(neighborhoodLabel(null)).toBe("");
	});
});

describe("map links to conversations", () => {
	it("round-trips ?conversacion=", () => {
		const href = mapHref({ conversacion: "c0ffee-12" });
		expect(href).toBe("/mapa?conversacion=c0ffee-12");
		expect(parseMapUrl(href.split("?")[1]).conversacion).toBe("c0ffee-12");
	});
});
