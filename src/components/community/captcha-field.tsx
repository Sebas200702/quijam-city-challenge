// The Turnstile widget for a sign-in or sign-up form, only when the CAPTCHA is
// active (site key and Supabase). Pair it with useCaptcha() in the form.

import { TurnstileWidget } from "./turnstile-widget";
import type { useCaptcha } from "./use-captcha";

export function CaptchaField({
	captcha,
}: {
	captcha: ReturnType<typeof useCaptcha>;
}) {
	if (!captcha.enabled) return null;
	return (
		<TurnstileWidget
			siteKey={captcha.siteKey}
			onToken={captcha.setToken}
			resetSignal={captcha.resetSignal}
		/>
	);
}
