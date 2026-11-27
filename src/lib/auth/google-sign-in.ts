// Starts "Continue with Google". Browser only. The default (implicit) flow of
// supabase-js sends the session back in the URL of /perfil, where the community
// store's client (same project, same storage key) picks it up with
// detectSessionInUrl, so no callback page or code exchange is needed.

import { createClient } from "@supabase/supabase-js";
import {
	googleAuthEnabled,
	googleOAuthCredentials,
	oauthRedirectTo,
} from "./google-auth";

/** Fixed at build time from PUBLIC_AUTH_GOOGLE. */
export const GOOGLE_AUTH_ENABLED = googleAuthEnabled(
	import.meta.env.PUBLIC_AUTH_GOOGLE,
);

/** Redirects to Google. Rejects when Supabase is missing or refuses. */
export async function startGoogleSignIn(
	returnPath: string | null,
): Promise<void> {
	const url = import.meta.env.PUBLIC_SUPABASE_URL;
	const key = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;
	if (!url || !key) throw new Error("Supabase is not configured");
	const supabase = createClient(url, key, {
		auth: { detectSessionInUrl: false, autoRefreshToken: false },
	});
	const { error } = await supabase.auth.signInWithOAuth(
		googleOAuthCredentials(oauthRedirectTo(window.location.origin, returnPath)),
	);
	if (error) throw error;
}
