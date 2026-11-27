// Starts "Continue with Google". Browser only. It uses the community store's own
// Supabase client (PKCE): the code verifier stays in its storage, and back on
// /perfil the same client exchanges `?code=` for the session (detectSessionInUrl),
// so no callback page is needed.

import { getCommunityClient } from "../community/community-store";
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
	const supabase = getCommunityClient();
	if (!supabase) throw new Error("Supabase is not configured");
	const { error } = await supabase.auth.signInWithOAuth(
		googleOAuthCredentials(oauthRedirectTo(window.location.origin, returnPath)),
	);
	if (error) throw error;
}
