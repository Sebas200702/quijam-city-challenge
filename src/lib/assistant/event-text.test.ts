import { describe, expect, it } from "vitest";
import {
	capacityFromText,
	dateFromText,
	priceFromText,
	quotedTitle,
	timeFromText,
	titleFromBody,
} from "./event-text";

// Thursday 26 November 2026, 10:00 a. m. in Barranquilla.
const NOW = "2026-11-26T15:00:00.000Z";

describe("event text", () => {
	it("reads quoted titles with straight and typographic quotes", () => {
		expect(quotedTitle("Publica un evento 'Concierto en vivo' el sábado")).toBe(
			"Concierto en vivo",
		);
		expect(quotedTitle('Publica "Feria del libro" mañana')).toBe(
			"Feria del libro",
		);
		expect(quotedTitle("Publica “Noche de salsa” hoy")).toBe("Noche de salsa");
		expect(quotedTitle("Publica «Cine al parque» hoy")).toBe("Cine al parque");
		expect(quotedTitle("Publica ‘Bici paseo’ hoy")).toBe("Bici paseo");
		expect(quotedTitle("vamos pa' la playa")).toBeNull();
	});

	it("reads capacity", () => {
		expect(capacityFromText("con 50 cupos")).toBe(50);
		expect(capacityFromText("para 50 personas")).toBe(50);
		expect(capacityFromText("cupo de 50")).toBe(50);
		expect(capacityFromText("cupos limitado a 30")).toBe(30);
		expect(capacityFromText("aforo de 200")).toBe(200);
		expect(capacityFromText("el sábado a las 6 pm")).toBeNull();
	});

	it("reads the price, null when free", () => {
		expect(priceFromText("concierto gratis con $10.000 de bono")).toBeNull();
		expect(priceFromText("la entrada cuesta $10.000")).toBe(10000);
		expect(priceFromText("entrada de 15 mil pesos")).toBe(15000);
		expect(priceFromText("cuesta 5000")).toBe(5000);
		expect(priceFromText("el sábado a las 6 pm con 50 cupos")).toBeNull();
	});

	it("reads hours", () => {
		expect(timeFromText("a las 6 pm")).toBe("18:00");
		expect(timeFromText("a las 8:30 a. m.")).toBe("08:30");
		expect(timeFromText("a las 6 de la tarde")).toBe("18:00");
		expect(timeFromText("a las 9 de la noche")).toBe("21:00");
		expect(timeFromText("a las 18")).toBe("18:00");
	});

	it("reads explicit dates, always in the future", () => {
		expect(dateFromText("el 5 de diciembre", NOW)).toBe("2026-12-05");
		expect(dateFromText("el 3 de enero", NOW)).toBe("2027-01-03");
		expect(dateFromText("el 12/12", NOW)).toBe("2026-12-12");
		expect(dateFromText("el 31 de febrero", NOW)).toBeNull();
		expect(dateFromText("el sábado", NOW)).toBeNull();
	});

	it("keeps the words before the date as the title", () => {
		expect(
			titleFromBody("Limpieza del arroyo en Rebolo el sábado a las 8 am"),
		).toBe("Limpieza del arroyo en Rebolo");
		expect(titleFromBody("taller de salsa para 20 personas mañana")).toBe(
			"taller de salsa",
		);
		expect(
			titleFromBody("concierto en vivo en el Malecón con 50 cupos el sábado"),
		).toBe("concierto en vivo en el Malecón");
	});
});
