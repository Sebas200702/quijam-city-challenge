// Validates an overcharge report from a visitor before it is saved.
// Privacy (Ley 1581 de 2012): no name, phone or exact location is accepted.

export const REPORT_TRANSPORT_MODES = [
	"taxi",
	"bus",
	"informal",
	"other",
] as const;
export type ReportTransportMode = (typeof REPORT_TRANSPORT_MODES)[number];

export interface OverchargeReportInput {
	segmentCode: string;
	transportMode: ReportTransportMode;
	chargedFareCop: number;
	driverQrCode: string | null;
	notes: string | null;
}

export type ParseResult =
	| { ok: true; value: OverchargeReportInput }
	| { ok: false; error: string };

const MAX_FARE_COP = 2_000_000;
const MAX_NOTES = 280;
const QR_PATTERN = /^[A-Za-z0-9-]{1,40}$/;
const SEGMENT_PATTERN = /^SEG-[A-Z0-9-]{1,60}$/;

function optionalText(value: unknown): string | null {
	return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

export function parseOverchargeReport(body: unknown): ParseResult {
	if (typeof body !== "object" || body === null) {
		return { ok: false, error: "Send the report as a JSON object." };
	}
	const input = body as Record<string, unknown>;

	const { segmentCode, transportMode, chargedFareCop } = input;
	if (typeof segmentCode !== "string" || !SEGMENT_PATTERN.test(segmentCode)) {
		return { ok: false, error: "Unknown route segment." };
	}
	if (!REPORT_TRANSPORT_MODES.includes(transportMode as ReportTransportMode)) {
		return { ok: false, error: "Unknown transport mode." };
	}
	if (
		typeof chargedFareCop !== "number" ||
		!Number.isInteger(chargedFareCop) ||
		chargedFareCop <= 0 ||
		chargedFareCop > MAX_FARE_COP
	) {
		return {
			ok: false,
			error: "The charged fare must be a whole amount in COP.",
		};
	}

	const driverQrCode = optionalText(input.driverQrCode);
	if (driverQrCode && !QR_PATTERN.test(driverQrCode)) {
		return { ok: false, error: "The driver code has invalid characters." };
	}
	const notes = optionalText(input.notes);
	if (notes && notes.length > MAX_NOTES) {
		return {
			ok: false,
			error: `Notes can have up to ${MAX_NOTES} characters.`,
		};
	}

	return {
		ok: true,
		value: {
			segmentCode,
			transportMode: transportMode as ReportTransportMode,
			chargedFareCop,
			driverQrCode,
			notes,
		},
	};
}

/** How much above the reference fare, in whole percent; null without a reference. */
export function overchargePercent(
	chargedCop: number,
	referenceCop: number,
): number | null {
	if (referenceCop <= 0) return null;
	return Math.round(((chargedCop - referenceCop) / referenceCop) * 100);
}
