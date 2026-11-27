import { getSecret } from "astro:env/server";
import { createOpenJevClient } from "./openjev-client";
import type { OpenJevClient } from "./openjev-types";

/**
 * Server-side OpenJev client built from environment variables.
 * Returns null when TYPESAFE_API_KEY is not set, so the Decisor uses the
 * weighted score instead. Never import this file from client components.
 */
export function getOpenJevClient(): OpenJevClient | null {
	const apiKey = getSecret("TYPESAFE_API_KEY");
	if (!apiKey) return null;
	return createOpenJevClient({
		apiKey,
		baseUrl: getSecret("TYPESAFE_BASE_URL") || undefined,
		model: getSecret("OPENJEV_MODEL") || undefined,
	});
}
