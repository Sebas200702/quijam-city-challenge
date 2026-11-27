import type { AstroCookies } from "astro";
import { hasAal2 } from "../security/city-mfa";
import { getSupabaseAdmin } from "../supabase-admin";
import { isValidSession, PRESENTER_COOKIE } from "./presenter-session";

export type PresenterAccess = "demo-key" | "city";

function demoKey(): string | undefined {
	return (
		(typeof process === "undefined"
			? undefined
			: process.env.DEMO_PRESENTER_KEY) ?? import.meta.env.DEMO_PRESENTER_KEY
	);
}

export function readDemoKey(): string | undefined {
	return demoKey();
}

/** City role from a Supabase access token: user_profiles first, then app_metadata. */
async function isCityToken(token: string): Promise<boolean> {
	const admin = getSupabaseAdmin();
	if (!admin) return false;
	const { data, error } = await admin.auth.getUser(token);
	if (error || !data.user) return false;
	if (data.user.app_metadata?.role === "city") return true;
	const { data: profile } = await admin
		.from("user_profiles")
		.select("role")
		.eq("user_id", data.user.id)
		.maybeSingle();
	return profile?.role === "city";
}

export type PresenterAccessResult = {
	access: PresenterAccess | null;
	/** A city account whose session has not verified its second factor (aal1). */
	mfaRequired: boolean;
};

/** Who may use the presenter panel: a valid demo key cookie, or a city account at aal2. */
export async function resolvePresenterAccess(
	request: Request,
	cookies: AstroCookies,
): Promise<PresenterAccessResult> {
	if (isValidSession(cookies.get(PRESENTER_COOKIE)?.value, demoKey()))
		return { access: "demo-key", mfaRequired: false };
	const token = request.headers
		.get("Authorization")
		?.replace(/^Bearer\s+/i, "");
	if (!token || !(await isCityToken(token)))
		return { access: null, mfaRequired: false };
	return hasAal2(token)
		? { access: "city", mfaRequired: false }
		: { access: null, mfaRequired: true };
}

/** The access alone: a city session without its second factor gets none. */
export async function presenterAccess(
	request: Request,
	cookies: AstroCookies,
): Promise<PresenterAccess | null> {
	return (await resolvePresenterAccess(request, cookies)).access;
}
