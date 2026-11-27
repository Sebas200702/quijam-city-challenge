// Cloudflare Turnstile CAPTCHA for the account forms (issue #124). It loads the
// script only when mounted (explicit render), hands the token to the form and
// starts over whenever `resetSignal` changes (after each submit or failure).

import { useEffect, useId, useRef, useState } from "react";
import {
	TURNSTILE_SCRIPT_URL,
	turnstileLanguage,
} from "../../lib/auth/captcha";
import { useLanguage, useT } from "../../lib/i18n/use-language";

interface TurnstileOptions {
	sitekey: string;
	language?: string;
	theme?: "auto" | "light" | "dark";
	callback?: (token: string) => void;
	"expired-callback"?: () => void;
	"error-callback"?: () => void;
}

interface TurnstileApi {
	render(container: HTMLElement, options: TurnstileOptions): string;
	reset(widgetId: string): void;
	remove(widgetId: string): void;
}

declare global {
	interface Window {
		turnstile?: TurnstileApi;
	}
}

let scriptLoad: Promise<TurnstileApi> | null = null;

/** Adds the Turnstile script once per page and resolves with its API. */
function loadTurnstile(): Promise<TurnstileApi> {
	if (window.turnstile) return Promise.resolve(window.turnstile);
	scriptLoad ??= new Promise<TurnstileApi>((resolve, reject) => {
		const script = document.createElement("script");
		script.src = TURNSTILE_SCRIPT_URL;
		script.async = true;
		script.onload = () =>
			window.turnstile
				? resolve(window.turnstile)
				: reject(new Error("Turnstile unavailable"));
		script.onerror = () => {
			scriptLoad = null;
			script.remove();
			reject(new Error("Turnstile failed to load"));
		};
		document.head.append(script);
	});
	return scriptLoad;
}

export function TurnstileWidget({
	siteKey,
	onToken,
	resetSignal,
}: {
	siteKey: string;
	onToken: (token: string | null) => void;
	resetSignal: number;
}) {
	const t = useT();
	const language = useLanguage();
	const hintId = useId();
	const container = useRef<HTMLDivElement>(null);
	const widgetId = useRef<string | null>(null);
	const api = useRef<TurnstileApi | null>(null);
	const tokenListener = useRef(onToken);
	tokenListener.current = onToken;
	const [failed, setFailed] = useState(false);

	useEffect(() => {
		let cancelled = false;
		setFailed(false);
		loadTurnstile()
			.then((turnstile) => {
				if (cancelled || !container.current) return;
				api.current = turnstile;
				widgetId.current = turnstile.render(container.current, {
					sitekey: siteKey,
					language: turnstileLanguage(language),
					theme: "auto",
					callback: (token) => tokenListener.current(token),
					"expired-callback": () => tokenListener.current(null),
					"error-callback": () => {
						tokenListener.current(null);
						setFailed(true);
					},
				});
			})
			.catch(() => {
				if (!cancelled) setFailed(true);
			});
		return () => {
			cancelled = true;
			if (widgetId.current && api.current) api.current.remove(widgetId.current);
			widgetId.current = null;
			tokenListener.current(null);
		};
	}, [siteKey, language]);

	// A token is single use: ask for a new one after every attempt.
	useEffect(() => {
		if (resetSignal === 0) return;
		tokenListener.current(null);
		if (widgetId.current && api.current) api.current.reset(widgetId.current);
	}, [resetSignal]);

	return (
		<fieldset
			aria-describedby={hintId}
			className="m-0 min-w-0 space-y-1.5 border-0 p-0"
		>
			<legend className="q-eyebrow">{t.profile.captchaLabel}</legend>
			<p id={hintId} className="text-sm text-[var(--ink-muted)]">
				{t.profile.captchaHint}
			</p>
			<div ref={container} className="min-h-[65px]" />
			{failed ? (
				<p role="alert" className="text-sm text-[var(--red-text)]">
					{t.profile.captchaFailed}
				</p>
			) : null}
		</fieldset>
	);
}
