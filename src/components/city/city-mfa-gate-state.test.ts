import { describe, expect, it } from "vitest";
import {
	gateStep,
	isCompleteTotpCode,
	normalizeTotpCode,
} from "./city-mfa-gate-state";

const base = {
	configured: true,
	signedIn: true,
	isCity: true,
	currentLevel: "aal1",
	hasVerifiedFactor: false,
} as const;

describe("city MFA gate state", () => {
	it("asks a city session at aal1 without a factor to enroll", () => {
		expect(gateStep(base)).toBe("enroll");
	});

	it("asks a city session at aal1 with a factor to verify a code", () => {
		expect(gateStep({ ...base, hasVerifiedFactor: true })).toBe("verify");
	});

	it("opens the page for a city session at aal2", () => {
		expect(gateStep({ ...base, currentLevel: "aal2" })).toBe("open");
		expect(
			gateStep({ ...base, currentLevel: "aal2", hasVerifiedFactor: true }),
		).toBe("open");
	});

	it("leaves visitors, signed-out users and demo mode to the page", () => {
		expect(gateStep({ ...base, isCity: false })).toBe("open");
		expect(gateStep({ ...base, signedIn: false })).toBe("open");
		expect(gateStep({ ...base, configured: false })).toBe("open");
	});

	it("keeps only digits and accepts exactly six", () => {
		expect(normalizeTotpCode(" 123 456 ")).toBe("123456");
		expect(normalizeTotpCode("12a3-4567")).toBe("123456");
		expect(isCompleteTotpCode("123456")).toBe(true);
		expect(isCompleteTotpCode("12345")).toBe(false);
		expect(isCompleteTotpCode("12345a")).toBe(false);
	});
});
