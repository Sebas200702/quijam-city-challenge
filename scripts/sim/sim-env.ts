// Service-role Supabase client for the simulation scripts. Server side only: reads
// PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from the environment (Bun loads .env).
import { createClient } from "@supabase/supabase-js";

const url = process.env.PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
	console.error(
		"Set PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env first.",
	);
	process.exit(1);
}

export const admin = createClient(url, key, {
	auth: { persistSession: false, autoRefreshToken: false },
});
