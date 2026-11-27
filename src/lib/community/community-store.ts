// Picks the community store for this browser: the shared Supabase database when
// it is configured, this device otherwise. Browser only.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createCloudCommunityStore } from "./cloud-community-store";
import type { CommunityStore } from "./community-types";
import { createDeviceCommunityStore } from "./device-community-store";

let store: CommunityStore | null = null;
let client: SupabaseClient | null | undefined;

/**
 * The one Supabase client of the community pages (also used by "Continue with
 * Google"), or null without Supabase. PKCE: OAuth and email links come back
 * with `?code=`, which this client exchanges on load (detectSessionInUrl).
 */
export function getCommunityClient(): SupabaseClient | null {
	if (client !== undefined) return client;
	const url = import.meta.env.PUBLIC_SUPABASE_URL;
	const key = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;
	client =
		url && key ? createClient(url, key, { auth: { flowType: "pkce" } }) : null;
	return client;
}

export function getCommunityStore(): CommunityStore {
	if (store) return store;
	const supabase = getCommunityClient();
	store = supabase
		? createCloudCommunityStore(supabase)
		: createDeviceCommunityStore();
	return store;
}
