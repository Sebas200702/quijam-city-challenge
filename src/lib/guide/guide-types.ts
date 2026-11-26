/** How the Guide talks: voice (main) or text (plan B). */
export type GuideMode = "audio" | "text";

/** What the token endpoint returns to the browser. Never contains the API key. */
export interface LiveTokenResponse {
	/** Ephemeral token. The browser passes it as `apiKey` to the SDK. */
	token: string;
	model: string;
	mode: GuideMode;
	/** ISO time after which no new session can be opened with this token. */
	newSessionExpiresAt: string;
}
