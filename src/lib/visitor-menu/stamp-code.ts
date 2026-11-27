import { CORRIDOR_SEED } from "../corridor/corridor-seed";
import { ZONE_LABELS } from "../corridor/corridor-selection";
import type { Passport, PassportStamp } from "./visitor-menu-types";

/**
 * QR payloads that give a stamp:
 *   quillart:sello:negocio:<CODE>                         verified business
 *   quillart:sello:evento:<id>:<name>:<place>             green event (name/place URL-encoded)
 */
const PREFIX = "quillart:sello:";

/** What a green event gives when the person attends it. */
export const GREEN_EVENT_REWARD = "Termo reutilizable";

export type StampCode =
	| { kind: "negocio"; code: string }
	| { kind: "evento"; id: string; name: string; place: string };

export function buildBusinessStampCode(code: string): string {
	return `${PREFIX}negocio:${code}`;
}

export function buildEventStampCode(
	id: string,
	name: string,
	place: string,
): string {
	return `${PREFIX}evento:${id}:${encodeURIComponent(name)}:${encodeURIComponent(place)}`;
}

function decode(part: string): string | null {
	try {
		return decodeURIComponent(part).trim();
	} catch {
		return null;
	}
}

/** Parse a scanned or typed code. Returns null for anything that is not a stamp code. */
export function parseStampCode(raw: string): StampCode | null {
	const text = raw.trim();
	if (!text.toLowerCase().startsWith(PREFIX)) return null;
	const parts = text.slice(PREFIX.length).split(":");
	const kind = parts[0]?.toLowerCase();
	if (kind === "negocio" && parts.length === 2) {
		const code = parts[1].trim().toUpperCase();
		return /^[A-Z0-9-]{3,40}$/.test(code) ? { kind: "negocio", code } : null;
	}
	if (kind === "evento" && parts.length === 4) {
		const id = parts[1].trim();
		const name = decode(parts[2]);
		const place = decode(parts[3]);
		if (!/^[A-Za-z0-9_-]{1,64}$/.test(id) || !name || !place) return null;
		return {
			kind: "evento",
			id,
			name: name.slice(0, 120),
			place: place.slice(0, 80),
		};
	}
	return null;
}

/**
 * Turn a code into a stamp. Businesses must be verified ones from the corridor;
 * only green events carry a reward (businesses never do).
 * Returns null when the business is unknown or not verified.
 */
export function stampFromCode(
	code: StampCode,
	now: Date = new Date(),
): PassportStamp | null {
	const collectedAt = now.toISOString();
	if (code.kind === "evento") {
		return {
			id: `evento-${code.id}`,
			name: code.name,
			place: code.place,
			source: "green-event",
			collectedAt,
			reward: GREEN_EVENT_REWARD,
		};
	}
	const business = CORRIDOR_SEED.businesses.find(
		(b) => b.code === code.code && b.is_verified,
	);
	if (!business) return null;
	return {
		id: `negocio-${business.code}`,
		name: business.name,
		place: ZONE_LABELS[business.zone],
		source: "verified-business",
		collectedAt,
	};
}

/** Add a stamp once: scanning the same QR again keeps the first one. */
export function addStamp(
	passport: Passport,
	stamp: PassportStamp,
): { passport: Passport; added: boolean } {
	if (passport.stamps.some((s) => s.id === stamp.id)) {
		return { passport, added: false };
	}
	return { passport: { stamps: [...passport.stamps, stamp] }, added: true };
}
