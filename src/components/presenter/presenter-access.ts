/** Supabase access token of a signed-in city account, if any, for the presenter API. */
export async function cityAuthHeader(): Promise<Record<string, string>> {
	try {
		const { supabase } = await import("../../lib/supabase");
		const { data } = await supabase.auth.getSession();
		const token = data.session?.access_token;
		return token ? { Authorization: `Bearer ${token}` } : {};
	} catch {
		// No Supabase configured: only the demo key cookie can open the panel.
		return {};
	}
}

export type PresenterAccess = "demo-key" | "city" | null;

export async function fetchPresenterAccess(): Promise<{
	access: PresenterAccess;
	demoKeyEnabled: boolean;
}> {
	const response = await fetch("/api/presentador/session", {
		headers: await cityAuthHeader(),
		credentials: "same-origin",
	});
	if (!response.ok) throw new Error(`HTTP ${response.status}`);
	return response.json();
}
