import type { ProductInput } from "./vendor-types";

/** Barranquilla time. Colombia has no daylight saving: always UTC-5. */
const BOGOTA_OFFSET_MS = -5 * 3_600_000;
const MAX_PRICE_COP = 2_000_000;
const MAX_NAME = 80;

const copFormat = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });

export function formatCop(value: number): string {
	return value === 0 ? "Gratis" : `$${copFormat.format(value)}`;
}

/** Start of today in Barranquilla, as an ISO string, to query today's visits. */
export function startOfTodayBogota(now: Date = new Date()): string {
	const local = new Date(now.getTime() + BOGOTA_OFFSET_MS);
	local.setUTCHours(0, 0, 0, 0);
	return new Date(local.getTime() - BOGOTA_OFFSET_MS).toISOString();
}

/** Visits per hour of the day in Barranquilla (24 buckets). */
export function visitsByHour(visitedAt: readonly string[]): number[] {
	const hours = Array.from({ length: 24 }, () => 0);
	for (const iso of visitedAt) {
		const time = Date.parse(iso);
		if (Number.isNaN(time)) continue;
		hours[new Date(time + BOGOTA_OFFSET_MS).getUTCHours()]++;
	}
	return hours;
}

/** Reads a price typed as "4.000", "4000" or "$ 4.000" into whole pesos. */
export function parsePriceCop(text: string): number | null {
	const digits = text.replace(/[$\s.]/g, "").replace(/,00$/, "");
	if (!/^\d{1,7}$/.test(digits)) return null;
	return Number(digits);
}

/** Same limits as the database, with messages for the vendor. */
export function validateProduct(input: ProductInput): string | null {
	const name = input.name.trim();
	if (name.length === 0) return "Escribe el nombre del producto.";
	if (name.length > MAX_NAME)
		return `El nombre puede tener hasta ${MAX_NAME} caracteres.`;
	if (!Number.isInteger(input.priceCop) || input.priceCop < 0)
		return "Escribe el precio en pesos, sin centavos.";
	if (input.priceCop > MAX_PRICE_COP)
		return "Revisa el precio: parece demasiado alto.";
	return null;
}

/** A claim code from the city's QR: 36 hexadecimal characters. */
export function isClaimCode(value: string | null): value is string {
	return value !== null && /^[a-f0-9]{36}$/.test(value);
}
