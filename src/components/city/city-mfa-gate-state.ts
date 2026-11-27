// Pure decisions of the city MFA gate: which step a session sees, and how the
// 6-digit TOTP code typed by the operator is cleaned up.

export type GateStep = "open" | "enroll" | "verify";

export type GateInput = {
	/** Supabase configured in this build (demo mode otherwise). */
	configured: boolean;
	signedIn: boolean;
	/** The account's own role is city (profile row or app_metadata). */
	isCity: boolean;
	/** `currentLevel` from auth.mfa.getAuthenticatorAssuranceLevel(). */
	currentLevel: string | null;
	/** The account has at least one verified TOTP factor. */
	hasVerifiedFactor: boolean;
};

export function gateStep(input: GateInput): GateStep {
	if (!input.configured || !input.signedIn || !input.isCity) return "open";
	if (input.currentLevel === "aal2") return "open";
	return input.hasVerifiedFactor ? "verify" : "enroll";
}

export const TOTP_CODE_LENGTH = 6;

export function normalizeTotpCode(value: string): string {
	return value.replace(/\D/g, "").slice(0, TOTP_CODE_LENGTH);
}

export function isCompleteTotpCode(value: string): boolean {
	return new RegExp(`^\\d{${TOTP_CODE_LENGTH}}$`).test(value);
}
