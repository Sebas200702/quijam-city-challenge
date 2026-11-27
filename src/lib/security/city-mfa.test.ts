import { describe, expect, it } from "vitest";
import {
	assertCityMfa,
	CityMfaRequiredError,
	hasAal2,
	MFA_REQUIRED_CODE,
	MFA_REQUIRED_MESSAGE,
	mfaRequiredResponse,
	readTokenClaims,
} from "./city-mfa";

/** Unsigned test JWT: only the payload matters to the helper. */
function fakeJwt(claims: Record<string, unknown>): string {
	const encode = (value: unknown) =>
		Buffer.from(JSON.stringify(value)).toString("base64url");
	return `${encode({ alg: "HS256", typ: "JWT" })}.${encode(claims)}.signature`;
}

describe("city MFA helper", () => {
	it("reads sub, aal and the app_metadata role from the token", () => {
		const token = fakeJwt({
			sub: "user-1",
			aal: "aal2",
			app_metadata: { role: "city" },
		});
		expect(readTokenClaims(token)).toEqual({
			sub: "user-1",
			aal: "aal2",
			appRole: "city",
		});
	});

	it("treats missing or malformed tokens as not aal2", () => {
		expect(readTokenClaims(undefined)).toBeNull();
		expect(readTokenClaims("not-a-jwt")).toBeNull();
		expect(readTokenClaims("a.%%%.c")).toBeNull();
		expect(hasAal2(undefined)).toBe(false);
		expect(hasAal2(fakeJwt({ sub: "u" }))).toBe(false);
	});

	it("rejects a city session at aal1 with mfa_required", () => {
		expect(() => assertCityMfa(fakeJwt({ aal: "aal1" }))).toThrow(
			CityMfaRequiredError,
		);
	});

	it("lets a city session at aal2 through", () => {
		expect(() => assertCityMfa(fakeJwt({ aal: "aal2" }))).not.toThrow();
	});

	it("answers 403 JSON with the message and a stable code", async () => {
		const response = mfaRequiredResponse();
		expect(response.status).toBe(403);
		expect(response.headers.get("Content-Type")).toBe("application/json");
		expect(await response.json()).toEqual({
			error: MFA_REQUIRED_MESSAGE,
			code: MFA_REQUIRED_CODE,
		});
		expect(MFA_REQUIRED_MESSAGE).toBe(
			"Activa y verifica tu segundo factor para usar las funciones de la ciudad.",
		);
		expect(MFA_REQUIRED_CODE).toBe("mfa_required");
	});
});
