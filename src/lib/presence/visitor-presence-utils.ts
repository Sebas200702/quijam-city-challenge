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
	const fallback = Math.random().toString(16).slice(2, 14).padEnd(12, "0");
	return `vis_${fallback}`;
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

export function buildJuryQrUrl(baseOrigin: string): string {
	const trimmed = baseOrigin.trim();
	if (!trimmed) {
		return "/mapa?origen=qr";
	}
	try {
		const parsed = new URL(trimmed);
		if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
			return "/mapa?origen=qr";
		}
		return `${parsed.origin}/mapa?origen=qr`;
	} catch {
		return "/mapa?origen=qr";
	}
}

export function summarizePresenceState(
	presenceState: Record<string, readonly unknown[]>,
	nowIso: string = new Date().toISOString(),
): VisitorPresenceSummary {
	const entriesBySession = new Map<string, VisitorEntrySource>();

	for (const [presenceKey, metas] of Object.entries(presenceState)) {
		if (!Array.isArray(metas) || metas.length === 0) {
			continue;
		}
		for (const item of metas) {
			const record =
				item && typeof item === "object"
					? (item as Record<string, unknown>)
					: {};
			const rawSession =
				typeof record.session_id === "string" && record.session_id.length > 0
					? record.session_id
					: presenceKey;
			if (!rawSession) {
				continue;
			}
			const entry: VisitorEntrySource = record.entry === "qr" ? "qr" : "direct";
			const previous = entriesBySession.get(rawSession);
			if (!previous || entry === "qr") {
				entriesBySession.set(rawSession, entry);
			}
		}
	}

	let qrCount = 0;
	let directCount = 0;
	for (const source of entriesBySession.values()) {
		if (source === "qr") {
			qrCount += 1;
		} else {
			directCount += 1;
		}
	}

	return {
		connectedCount: entriesBySession.size,
		qrCount,
		directCount,
		sessionIds: Array.from(entriesBySession.keys()),
		lastChangeAt: nowIso,
	};
}
