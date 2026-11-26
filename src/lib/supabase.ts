import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.PUBLIC_SUPABASE_URL;
const publishableKey = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
	throw new Error(
		"Missing PUBLIC_SUPABASE_URL or PUBLIC_SUPABASE_PUBLISHABLE_KEY. Copy .env.example to .env and fill in the values.",
	);
}

export const supabase = createClient(url, publishableKey);
