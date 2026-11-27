import type {
	VisitorEntrySource,
	VisitorPresenceSummary,
} from "./visitor-presence-types";

export const VISITOR_PRESENCE_CHANNEL = "visitor-presence";
export const ANON_SESSION_STORAGE_KEY = "quillart-anon-visitor-id";

interface StorageLike {
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
}

function generateAnonymousId(): string {
	if (
		typeof crypto !== "undefined" &&
		typeof crypto.randomUUID === "function"
	) {
		return `vis_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
	}
	if (
		typeof crypto !== "undefined" &&
		typeof crypto.getRandomValues === "function"
	) {
		const bytes = crypto.getRandomValues(new Uint8Array(6));
		const secureId = Array.from(bytes, (byte) =>
			byte.toString(16).padStart(2, "0"),
		).join("");
		return `vis_${secureId}`;
	}
	throw new Error("Secure random number generation is unavailable");
}

/**
 * Returns an ephemeral anonymous session ID stored only in sessionStorage.
 * No personal data, cookies, or cross-session identifiers are used.
 */
export function getOrCreateAnonymousSessionId(storage?: StorageLike): string {
	try {
		const existing = storage?.getItem(ANON_SESSION_STORAGE_KEY);
		if (existing && /^vis_[a-z0-9]{8,24}$/i.test(existing)) {
			return existing;
		}
		const created = generateAnonymousId();
		storage?.setItem(ANON_SESSION_STORAGE_KEY, created);
		return created;
	} catch {
		return generateAnonymousId();
	}
}

export function detectEntrySource(search: string): VisitorEntrySource {
	const params = new URLSearchParams(search);
	const raw = params.get("origen") ?? params.get("source");
	return raw === "qr" ? "qr" : "direct";
}

/**
 * Builds an absolute visitor URL for the jury QR code.
 * Returns null when the origin is empty or not a valid http/https URL so the UI
 * never encodes a broken relative path into a scannable QR.
 */
export function buildJuryQrUrl(baseOrigin: string): string | null {
	const trimmed = baseOrigin.trim();
	if (!trimmed) {
		return null;
	}
	try {
		const parsed = new URL(trimmed);
		if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
			return null;
		}
		return `${parsed.origin}/mapa?origen=qr`;
	} catch {
		return null;
	}
}

/**
 * Summarizes Supabase Realtime presence using the channel presence key as the
 * session identity (rather than trusting client-provided session_id fields).
 */
export function summarizePresenceState(
	presenceState: Record<string, readonly unknown[]>,
): VisitorPresenceSummary {
	const entriesByKey = new Map<string, VisitorEntrySource>();

	for (const [presenceKey, metas] of Object.entries(presenceState)) {
		if (!presenceKey || !Array.isArray(metas) || metas.length === 0) {
			continue;
		}
		let entry: VisitorEntrySource = "direct";
		for (const item of metas) {
			if (
				item &&
				typeof item === "object" &&
				(item as Record<string, unknown>).entry === "qr"
			) {
				entry = "qr";
				break;
			}
		}
		entriesByKey.set(presenceKey, entry);
	}

	let qrCount = 0;
	for (const source of entriesByKey.values()) {
		if (source === "qr") {
			qrCount += 1;
		}
	}

	return {
		connectedCount: entriesByKey.size,
		qrCount,
	};
}
