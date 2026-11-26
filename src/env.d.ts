interface ImportMetaEnv {
	readonly PUBLIC_SUPABASE_URL: string;
	readonly PUBLIC_SUPABASE_PUBLISHABLE_KEY: string;
	readonly GEMINI_API_KEY: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
