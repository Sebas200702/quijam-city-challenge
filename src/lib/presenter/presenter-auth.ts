import type { AstroCookies } from "astro";
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

/** Who may use the presenter panel: a valid demo key cookie, or a city account. */
export async function presenterAccess(
	request: Request,
	cookies: AstroCookies,
): Promise<PresenterAccess | null> {
	if (isValidSession(cookies.get(PRESENTER_COOKIE)?.value, demoKey()))
		return "demo-key";
	const token = request.headers
		.get("Authorization")
		?.replace(/^Bearer\s+/i, "");
	if (token && (await isCityToken(token))) return "city";
	return null;
}
