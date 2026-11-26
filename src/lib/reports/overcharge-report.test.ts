import { describe, expect, it } from "vitest";
import { overchargePercent, parseOverchargeReport } from "./overcharge-report";

const valid = {
	segmentCode: "SEG-MAL-EST-TAXI",
	transportMode: "taxi",
	chargedFareCop: 55000,
};

describe("parseOverchargeReport", () => {
	it("accepts a minimal report and trims optional fields", () => {
		expect(
			parseOverchargeReport({
				...valid,
				driverQrCode: " DRV-104 ",
				notes: "  ",
			}),
		).toEqual({
			ok: true,
			value: { ...valid, driverQrCode: "DRV-104", notes: null },
		});
	});

	it.each([
		[null, "JSON object"],
		[{ ...valid, segmentCode: "DROP TABLE" }, "route segment"],
		[{ ...valid, transportMode: "plane" }, "transport mode"],
		[{ ...valid, chargedFareCop: -5 }, "whole amount"],
		[{ ...valid, chargedFareCop: 1.5 }, "whole amount"],
		[{ ...valid, driverQrCode: "<script>" }, "invalid characters"],
		[{ ...valid, notes: "x".repeat(281) }, "280"],
	])("rejects %j", (body, message) => {
		const result = parseOverchargeReport(body);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toContain(message);
	});
});

describe("overchargePercent", () => {
	it("compares with the reference fare", () => {
		expect(overchargePercent(55000, 24000)).toBe(129);
		expect(overchargePercent(24000, 24000)).toBe(0);
	});

	it("returns null without a reference fare", () => {
		expect(overchargePercent(5000, 0)).toBeNull();
	});
});
