import { getSecret } from "astro:env/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null | undefined;

/**
 * Server-only Supabase client with the service role key. It bypasses RLS, so it
 * is used only by API routes that verify the caller first (community publishing
 * and moderation). Returns null when the key is not configured.
 * Never import this file from client components.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
	if (cached !== undefined) return cached;
	const url = import.meta.env.PUBLIC_SUPABASE_URL;
	const serviceKey = getSecret("SUPABASE_SERVICE_ROLE_KEY");
	cached =
		url && serviceKey
			? createClient(url, serviceKey, {
					auth: { persistSession: false, autoRefreshToken: false },
				})
			: null;
	return cached;
}
