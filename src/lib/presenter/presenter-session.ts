// Demo key session for the presenter panel (docs/26, 5.5). The key lives only
// in the server (DEMO_PRESENTER_KEY); the browser gets a signed httpOnly cookie.

import { createHmac, timingSafeEqual } from "node:crypto";

export const PRESENTER_COOKIE = "quillart_presenter";
export const SESSION_HOURS = 8;
const MIN_KEY_LENGTH = 12;

function sign(expiresAt: number, secret: string): string {
	return createHmac("sha256", secret)
		.update(`presenter:${expiresAt}`)
		.digest("base64url");
}

function sameText(a: string, b: string): boolean {
	const left = Buffer.from(a);
	const right = Buffer.from(b);
	return left.length === right.length && timingSafeEqual(left, right);
}

/** The demo key is usable only if it is configured and long enough. */
export function isUsableKey(key: string | undefined): key is string {
	return typeof key === "string" && key.length >= MIN_KEY_LENGTH;
}

/** Constant-time comparison of what the person typed with the server key. */
export function keyMatches(given: unknown, key: string | undefined): boolean {
	return isUsableKey(key) && typeof given === "string" && sameText(given, key);
}

/** Cookie value: expiry and an HMAC of it, keyed with the demo key. */
export function createSessionValue(key: string, now = Date.now()): string {
	const expiresAt = now + SESSION_HOURS * 3_600_000;
	return `${expiresAt}.${sign(expiresAt, key)}`;
}

/** True for an unexpired cookie signed with the current key. Changing the key logs everyone out. */
export function isValidSession(
	value: string | undefined,
	key: string | undefined,
	now = Date.now(),
): boolean {
	if (!value || !isUsableKey(key)) return false;
	const [expiry, signature] = value.split(".");
	const expiresAt = Number(expiry);
	if (!Number.isSafeInteger(expiresAt) || expiresAt <= now || !signature)
		return false;
	return sameText(signature, sign(expiresAt, key));
}
