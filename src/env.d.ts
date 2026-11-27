interface ImportMetaEnv {
	readonly PUBLIC_SUPABASE_URL: string;
	readonly PUBLIC_SUPABASE_PUBLISHABLE_KEY: string;
	readonly GEMINI_API_KEY: string;
	readonly SUPABASE_SERVICE_ROLE_KEY?: string;
	readonly TYPESAFE_API_KEY?: string;
	readonly TYPESAFE_BASE_URL?: string;
	readonly OPENJEV_MODEL?: string;
	readonly GEMINI_LIVE_MODEL?: string;
	readonly GEMINI_REPORT_MODEL?: string;
	readonly GEMINI_TEXT_MODEL?: string;
	readonly CSP_MODE?: string;
	readonly DEMO_PRESENTER_KEY?: string;
	readonly PUBLIC_TURNSTILE_SITE_KEY?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
