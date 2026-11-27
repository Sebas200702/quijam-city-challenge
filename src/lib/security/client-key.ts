// Derives a rate-limit key for the caller without keeping raw IPs in memory.

import { createHash } from "node:crypto";

export interface ClientKeySource {
	request: Request;
	/** Astro's APIContext.clientAddress; the getter throws when unavailable. */
	readonly clientAddress?: string;
}

function readClientAddress(source: ClientKeySource): string | null {
	try {
		const address = source.clientAddress;
		return typeof address === "string" && address.trim() !== ""
			? address.trim()
			: null;
	} catch {
		return null;
	}
}

function readForwardedFor(request: Request): string | null {
	const first = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
	return first ? first : null;
}

/** Truncated SHA-256, so the limiter never stores or logs a full IP. */
export function hashKey(value: string): string {
	return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

/**
 * Prefers Astro's clientAddress (set by the Node adapter from the socket),
 * then the first x-forwarded-for value, then "unknown".
 */
export function getClientKey(source: ClientKeySource): string {
	const address = readClientAddress(source) ?? readForwardedFor(source.request);
	return address ? `ip:${hashKey(address)}` : "ip:unknown";
}
