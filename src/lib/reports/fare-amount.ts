// Reads the amount the way people type it in Colombia ("35000", "35.000",
// "$35.000") and says what is wrong when it cannot. Limits mirror
// parseOverchargeReport so the server never sees a value it would reject.

export const MAX_FARE_COP = 2_000_000;
const DRIVER_CODE = /^[A-Za-z0-9-]{1,40}$/;

export type FareAmountResult =
	| { ok: true; value: number }
	| { ok: false; reason: "empty" | "format" | "range" };

export function parseFareAmount(raw: string): FareAmountResult {
	const compact = raw.replace(/[\s$]/g, "").replace(/COP$/i, "");
	if (compact === "") return { ok: false, reason: "empty" };
	// Plain digits, or thousands separated by dots or commas in groups of three.
	if (!/^\d+$|^\d{1,3}([.,]\d{3})+$/.test(compact)) {
		return { ok: false, reason: "format" };
	}
	const value = Number(compact.replace(/[.,]/g, ""));
	if (value <= 0 || value > MAX_FARE_COP) {
		return { ok: false, reason: "range" };
	}
	return { ok: true, value };
}

/** The driver code is optional: empty is valid. */
export function isValidDriverCode(raw: string): boolean {
	const code = raw.trim();
	return code === "" || DRIVER_CODE.test(code);
}
