import { describe, expect, it } from "vitest";
import { isValidDriverCode, parseFareAmount } from "./fare-amount";

describe("parseFareAmount", () => {
	it("reads amounts the way people type them", () => {
		expect(parseFareAmount("35000")).toEqual({ ok: true, value: 35000 });
		expect(parseFareAmount("35.000")).toEqual({ ok: true, value: 35000 });
		expect(parseFareAmount("$ 35.000")).toEqual({ ok: true, value: 35000 });
		expect(parseFareAmount("1,250,000")).toEqual({ ok: true, value: 1250000 });
		expect(parseFareAmount("35000 COP")).toEqual({ ok: true, value: 35000 });
	});

	it("says what is wrong", () => {
		expect(parseFareAmount("  ")).toEqual({ ok: false, reason: "empty" });
		expect(parseFareAmount("35 mil")).toEqual({ ok: false, reason: "format" });
		expect(parseFareAmount("35.5")).toEqual({ ok: false, reason: "format" });
		expect(parseFareAmount("0")).toEqual({ ok: false, reason: "range" });
		expect(parseFareAmount("3.000.000")).toEqual({
			ok: false,
			reason: "range",
		});
	});
});

describe("isValidDriverCode", () => {
	it("accepts an empty or well formed code", () => {
		expect(isValidDriverCode("")).toBe(true);
		expect(isValidDriverCode("TX-0417")).toBe(true);
		expect(isValidDriverCode("TX 0417")).toBe(false);
	});
});
