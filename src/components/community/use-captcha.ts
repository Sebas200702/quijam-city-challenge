// CAPTCHA state for one account form: the current Turnstile token and a signal
// that asks the widget for a fresh one. Off (no widget, no token) without a site key or without Supabase.

import { useState } from "react";
import { CAPTCHA_ACTIVE, TURNSTILE_SITE_KEY } from "../../lib/auth/captcha";

export function useCaptcha() {
	const enabled = CAPTCHA_ACTIVE;
	const [token, setToken] = useState<string | null>(null);
	const [resetSignal, setResetSignal] = useState(0);
	return {
		enabled,
		siteKey: TURNSTILE_SITE_KEY,
		token,
		setToken,
		resetSignal,
		/** True when the form must wait for the person to pass the check. */
		missing: enabled && !token,
		/** Tokens are single use: call after every attempt. */
		reset: () => {
			if (!enabled) return;
			setToken(null);
			setResetSignal((value) => value + 1);
		},
	};
}
