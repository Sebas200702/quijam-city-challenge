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
 * Header that carries the visitor's address when the app runs behind a proxy
 * that sets it (CF-Connecting-IP behind Cloudflare). Read at run time from
 * TRUSTED_CLIENT_IP_HEADER, so it can be changed in Dokploy without a rebuild.
 * Unset means no header is trusted: anyone can send it.
 */
export function trustedClientIpHeader(): string | null {
	const value = (
		typeof process === "undefined"
			? undefined
			: process.env.TRUSTED_CLIENT_IP_HEADER
	)?.trim();
	// Headers.get throws on an invalid name (a pasted "CF-Connecting-IP:"):
	// ignore it rather than failing every request to the API.
	return value && HEADER_NAME.test(value) ? value : null;
}

/** An HTTP header name (RFC 9110 token). */
const HEADER_NAME = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;

function readHeader(request: Request, name: string): string | null {
	const value = request.headers.get(name)?.split(",")[0]?.trim();
	return value ? value : null;
}

/**
 * Prefers the trusted proxy header when one is configured (behind Traefik the
 * socket address is the proxy, the same for every visitor), then Astro's
 * clientAddress (set by the Node adapter from the socket), then the first
 * x-forwarded-for value, then "unknown".
 */
export function getClientKey(
	source: ClientKeySource,
	trustedHeader: string | null = trustedClientIpHeader(),
): string {
	const address =
		(trustedHeader ? readHeader(source.request, trustedHeader) : null) ??
		readClientAddress(source) ??
		readForwardedFor(source.request);
	return address ? `ip:${hashKey(address)}` : "ip:unknown";
}
