// Picks the community store for this browser: the shared Supabase database when
// it is configured, this device otherwise. Browser only.

import { createClient } from "@supabase/supabase-js";
import { createCloudCommunityStore } from "./cloud-community-store";
import type { CommunityStore } from "./community-types";
import { createDeviceCommunityStore } from "./device-community-store";

let store: CommunityStore | null = null;

export function getCommunityStore(): CommunityStore {
	if (store) return store;
	const url = import.meta.env.PUBLIC_SUPABASE_URL;
	const key = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;
	store =
		url && key
			? createCloudCommunityStore(createClient(url, key))
			: createDeviceCommunityStore();
	return store;
}
