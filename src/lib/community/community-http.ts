// Small JSON helpers shared by the community API routes.

import { CommunityError } from "./community-server";

export function json(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			"Content-Type": "application/json",
			"Cache-Control": "no-store",
		},
	});
}

export async function readJson(request: Request): Promise<unknown> {
	try {
		return await request.json();
	} catch {
		throw new CommunityError("El cuerpo debe ser JSON válido.", 400);
	}
}

export function errorResponse(error: unknown): Response {
	if (error instanceof CommunityError) {
		return json({ error: error.message }, error.status);
	}
	console.error("[community]", error);
	return json({ error: "Algo falló de nuestro lado. Intenta de nuevo." }, 500);
}

export const notConfigured = (): Response =>
	json(
		{
			error:
				"La publicación en la nube no está configurada (falta SUPABASE_SERVICE_ROLE_KEY).",
		},
		503,
	);
