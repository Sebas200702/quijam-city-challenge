// MFA (TOTP) enforcement for the `city` role. Every server path that acts as the
// city checks the role first (unchanged), then calls `assertCityMfa` with the
// caller's access token: a city session must be at Authenticator Assurance
// Level `aal2`, which Supabase Auth writes into the JWT `aal` claim once the
// user verifies a second factor (docs: supabase.com/docs/guides/auth/auth-mfa,
// "Enforce for all users": `(select auth.jwt()->>'aal') = 'aal2'`).
//
// The claims are decoded without checking the signature, so call this only
// AFTER the token was verified (auth.getUser, or a PostgREST call with it).

export const MFA_REQUIRED_CODE = "mfa_required";
export const MFA_REQUIRED_MESSAGE =
	"Activa y verifica tu segundo factor para usar las funciones de la ciudad.";

export type TokenClaims = {
	sub?: string;
	aal?: string;
	appRole?: string;
};

/** Thrown when a city caller is still at aal1. Routes answer it with `mfaRequiredResponse`. */
export class CityMfaRequiredError extends Error {
	readonly status = 403;
	readonly code = MFA_REQUIRED_CODE;
	constructor() {
		super(MFA_REQUIRED_MESSAGE);
	}
}

export function bearerToken(request: Request): string | undefined {
	return (
		request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
		undefined
	);
}

function decodeBase64Url(segment: string): string {
	const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
	const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
	const bytes = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
	return new TextDecoder().decode(bytes);
}

/** Reads the claims this module needs from a JWT. Null when it is not a JWT. */
export function readTokenClaims(token: string | undefined): TokenClaims | null {
	const payload = token?.split(".")[1];
	if (!payload) return null;
	try {
		const claims = JSON.parse(decodeBase64Url(payload)) as Record<
			string,
			unknown
		>;
		const appMetadata = claims.app_metadata as
			| Record<string, unknown>
			| undefined;
		return {
			sub: typeof claims.sub === "string" ? claims.sub : undefined,
			aal: typeof claims.aal === "string" ? claims.aal : undefined,
			appRole:
				typeof appMetadata?.role === "string" ? appMetadata.role : undefined,
		};
	} catch {
		return null;
	}
}

export function hasAal2(token: string | undefined): boolean {
	return readTokenClaims(token)?.aal === "aal2";
}

/** For a caller already known to be city: throws unless the session is aal2. */
export function assertCityMfa(token: string | undefined): void {
	if (!hasAal2(token)) throw new CityMfaRequiredError();
}

export function mfaRequiredBody(): { error: string; code: string } {
	return { error: MFA_REQUIRED_MESSAGE, code: MFA_REQUIRED_CODE };
}

export function mfaRequiredResponse(): Response {
	return new Response(JSON.stringify(mfaRequiredBody()), {
		status: 403,
		headers: {
			"Content-Type": "application/json",
			"Cache-Control": "no-store",
		},
	});
}
