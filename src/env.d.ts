interface ImportMetaEnv {
	readonly PUBLIC_SUPABASE_URL: string;
	readonly PUBLIC_SUPABASE_PUBLISHABLE_KEY: string;
	readonly GEMINI_API_KEY: string;
	readonly TYPESAFE_API_KEY?: string;
	readonly TYPESAFE_BASE_URL?: string;
	readonly OPENJEV_MODEL?: string;
	readonly GEMINI_LIVE_MODEL?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
