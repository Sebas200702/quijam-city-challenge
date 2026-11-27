import { describe, expect, it } from "vitest";
import {
	captchaActive,
	captchaEnabled,
	TURNSTILE_SCRIPT_URL,
	turnstileLanguage,
	withCaptcha,
} from "./captcha";

describe("captchaEnabled", () => {
	it("is off without a site key, so the forms behave as before", () => {
		expect(captchaEnabled(undefined)).toBe(false);
		expect(captchaEnabled("")).toBe(false);
		expect(captchaEnabled("   ")).toBe(false);
	});

	it("is on with a site key", () => {
		expect(captchaEnabled("0x4AAAAAAA")).toBe(true);
	});
});

describe("captchaActive", () => {
	const supabase = { url: "https://abc.supabase.co", key: "sb_publishable_x" };

	it("needs both a site key and Supabase", () => {
		expect(captchaActive("0x4AAA", supabase.url, supabase.key)).toBe(true);
	});

	it("stays off without Supabase, so a blocked widget never locks the device-only forms", () => {
		expect(captchaActive("0x4AAA", undefined, undefined)).toBe(false);
		expect(captchaActive("0x4AAA", supabase.url, "")).toBe(false);
	});

	it("stays off without a site key", () => {
		expect(captchaActive("", supabase.url, supabase.key)).toBe(false);
	});
});

describe("withCaptcha", () => {
	it("leaves the auth options unchanged without a token (previous behavior)", () => {
		const options = { emailRedirectTo: "https://quillart.dev/perfil" };
		expect(withCaptcha(options, null)).toBe(options);
		expect(withCaptcha(options, undefined)).toEqual({
			emailRedirectTo: "https://quillart.dev/perfil",
		});
		expect(withCaptcha(undefined, "")).toBeUndefined();
	});

	it("adds the token as captchaToken, keeping the other options", () => {
		expect(
			withCaptcha({ emailRedirectTo: "https://quillart.dev/perfil" }, "tok"),
		).toEqual({
			emailRedirectTo: "https://quillart.dev/perfil",
			captchaToken: "tok",
		});
		expect(withCaptcha(undefined, "tok")).toEqual({ captchaToken: "tok" });
	});
});

describe("turnstile settings", () => {
	it("maps each app language to a Turnstile language", () => {
		expect(turnstileLanguage("es")).toBe("es");
		expect(turnstileLanguage("en")).toBe("en");
		expect(turnstileLanguage("pt")).toBe("pt-br");
		expect(turnstileLanguage("fr")).toBe("fr");
	});

	it("loads the script for explicit rendering", () => {
		expect(TURNSTILE_SCRIPT_URL).toBe(
			"https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit",
		);
	});
});
