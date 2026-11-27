import { describe, expect, it } from "vitest";
import {
	googleAuthEnabled,
	googleOAuthCredentials,
	isOAuthReturn,
	oauthRedirectTo,
} from "./google-auth";

describe("isOAuthReturn", () => {
	it("detects the tokens the OAuth return leaves in the hash", () => {
		expect(isOAuthReturn("#access_token=a&refresh_token=b&type=bearer")).toBe(
			true,
		);
	});

	it("ignores a normal visit", () => {
		expect(isOAuthReturn("")).toBe(false);
		expect(isOAuthReturn("#panel-signin")).toBe(false);
	});
});

describe("googleAuthEnabled", () => {
	it("hides the button unless the flag is true (previous behavior)", () => {
		expect(googleAuthEnabled(undefined)).toBe(false);
		expect(googleAuthEnabled("")).toBe(false);
		expect(googleAuthEnabled("false")).toBe(false);
		expect(googleAuthEnabled("1")).toBe(false);
	});

	it("shows the button with PUBLIC_AUTH_GOOGLE=true", () => {
		expect(googleAuthEnabled("true")).toBe(true);
		expect(googleAuthEnabled(" TRUE ")).toBe(true);
	});
});

describe("oauthRedirectTo", () => {
	it("returns to this origin's profile page", () => {
		expect(oauthRedirectTo("https://quillart.dev", null)).toBe(
			"https://quillart.dev/perfil",
		);
		expect(oauthRedirectTo("http://localhost:4321", null)).toBe(
			"http://localhost:4321/perfil",
		);
	});

	it("keeps the path to go back to after signing in", () => {
		expect(oauthRedirectTo("https://quillart.tech", "/agenda/x?y=1")).toBe(
			"https://quillart.tech/perfil?volver=%2Fagenda%2Fx%3Fy%3D1",
		);
	});
});

describe("googleOAuthCredentials", () => {
	it("asks Supabase for the Google provider with the redirect", () => {
		expect(googleOAuthCredentials("https://quillart.dev/perfil")).toEqual({
			provider: "google",
			options: { redirectTo: "https://quillart.dev/perfil" },
		});
	});
});
