// CAPTCHA for the account forms (issue #124): Cloudflare Turnstile, checked by
// Supabase Auth (Attack Protection). supabase-js takes the token as
// `options.captchaToken` in signUp, signInWithPassword and resetPasswordForEmail
// (docs: supabase.com/docs/guides/auth/auth-captcha; types in
// @supabase/auth-js SignUpWithPasswordCredentials / SignInWithPasswordCredentials).

import type { Language } from "../i18n/languages";

/** Explicit render: the widget appears only where the auth form mounts it. */
export const TURNSTILE_SCRIPT_URL =
	"https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

/** Origin of the script and the widget iframe, for the CSP. */
export const TURNSTILE_ORIGIN = "https://challenges.cloudflare.com";

/** Public site key, fixed at build time. Empty means no CAPTCHA. */
export const TURNSTILE_SITE_KEY: string =
	import.meta.env.PUBLIC_TURNSTILE_SITE_KEY ?? "";

/** The widget shows only when a site key is configured. */
export function captchaEnabled(siteKey: string | undefined): boolean {
	return Boolean(siteKey?.trim());
}

/**
 * Adds the CAPTCHA token to the Supabase Auth options. Without a token the
 * options are returned as they were, so nothing changes before the key exists.
 */
export function withCaptcha<T extends object>(
	options: T | undefined,
	token: string | null | undefined,
): (T & { captchaToken?: string }) | undefined {
	if (!token) return options;
	return { ...(options ?? ({} as T)), captchaToken: token };
}

/** Turnstile language codes for the app languages (Portuguese is pt-br). */
const TURNSTILE_LANGUAGES: Record<Language, string> = {
	es: "es",
	en: "en",
	pt: "pt-br",
	fr: "fr",
};

export function turnstileLanguage(language: Language): string {
	return TURNSTILE_LANGUAGES[language];
}
