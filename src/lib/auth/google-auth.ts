// "Continue with Google" (Supabase OAuth). Pure helpers: whether the button
// shows and the exact arguments for supabase.auth.signInWithOAuth, whose type is
// SignInWithOAuthCredentials { provider, options?: { redirectTo?, ... } } in
// @supabase/auth-js (docs: supabase.com/docs/guides/auth/social-sign-in/auth-google).

/** The page that receives the session: the store's client reads it from the URL. */
export const OAUTH_RETURN_PAGE = "/perfil";

/** The button shows only when PUBLIC_AUTH_GOOGLE is exactly "true". */
export function googleAuthEnabled(flag: string | undefined): boolean {
	return flag?.trim().toLowerCase() === "true";
}

/**
 * Where Google sends the person back: this origin's profile page, keeping a
 * same-site `volver` path so the page can return them where they were.
 */
export function oauthRedirectTo(
	origin: string,
	returnPath: string | null,
): string {
	const url = new URL(OAUTH_RETURN_PAGE, origin);
	if (returnPath) url.searchParams.set("volver", returnPath);
	return url.toString();
}

/**
 * True when the page was opened by the OAuth return: the implicit flow puts the
 * tokens in the hash (`#access_token=…`). Read it before supabase-js cleans the URL.
 */
export function isOAuthReturn(hash: string): boolean {
	return new URLSearchParams(hash.replace(/^#/, "")).has("access_token");
}

export function googleOAuthCredentials(redirectTo: string) {
	return { provider: "google" as const, options: { redirectTo } };
}
