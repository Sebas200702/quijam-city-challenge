import { describe, expect, it } from "vitest";
import {
	formatCop,
	isClaimCode,
	parsePriceCop,
	startOfTodayBogota,
	validateProduct,
	visitsByHour,
} from "./vendor-logic";

describe("time in Barranquilla", () => {
	it("starts the day at midnight UTC-5", () => {
		// 2034-06-20 03:00 UTC is still June 19 in Barranquilla.
		expect(startOfTodayBogota(new Date("2034-06-20T03:00:00Z"))).toBe(
			"2034-06-19T05:00:00.000Z",
		);
		expect(startOfTodayBogota(new Date("2034-06-20T15:00:00Z"))).toBe(
			"2034-06-20T05:00:00.000Z",
		);
	});

	it("groups visits by local hour", () => {
		const hours = visitsByHour([
			"2034-06-20T17:05:00Z",
			"2034-06-20T17:55:00Z",
			"2034-06-20T23:10:00Z",
			"bad",
		]);
		expect(hours[12]).toBe(2);
		expect(hours[18]).toBe(1);
		expect(hours.reduce((a, b) => a + b, 0)).toBe(3);
	});
});

describe("products", () => {
	it("reads prices the way people type them", () => {
		expect(parsePriceCop("4.000")).toBe(4000);
		expect(parsePriceCop("$ 12.500")).toBe(12500);
		expect(parsePriceCop("3500")).toBe(3500);
		expect(parsePriceCop("4.000,00")).toBe(4000);
		expect(parsePriceCop("cuatro mil")).toBeNull();
		expect(parsePriceCop("-200")).toBeNull();
	});

	it("checks the same limits as the database", () => {
		expect(
			validateProduct({ name: "Arepa de huevo", priceCop: 4000 }),
		).toBeNull();
		expect(validateProduct({ name: "  ", priceCop: 4000 })).toMatch(/nombre/);
		expect(validateProduct({ name: "x".repeat(81), priceCop: 1 })).toMatch(
			/80/,
		);
		expect(validateProduct({ name: "Caro", priceCop: 2_000_001 })).toMatch(
			/alto/,
		);
		expect(validateProduct({ name: "Raro", priceCop: 10.5 })).toMatch(/pesos/);
	});

	it("formats pesos", () => {
		expect(formatCop(4000)).toBe("$4.000");
		expect(formatCop(0)).toBe("Gratis");
	});
});

describe("claim codes", () => {
	it("accepts only the 36-character codes the city generates", () => {
		expect(isClaimCode("a".repeat(36))).toBe(true);
		expect(isClaimCode("A".repeat(36))).toBe(false);
		expect(isClaimCode("abc")).toBe(false);
		expect(isClaimCode(null)).toBe(false);
	});
});
