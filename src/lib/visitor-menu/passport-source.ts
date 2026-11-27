import type {
	Passport,
	PassportStamp,
	StampSource,
} from "./visitor-menu-types";

/** Device storage key for the stamps collected on this phone. */
export const PASSPORT_STORAGE_KEY = "quillart-passport";

const SOURCES: readonly StampSource[] = ["verified-business", "green-event"];

function isStamp(value: unknown): value is PassportStamp {
	if (typeof value !== "object" || value === null) return false;
	const stamp = value as Record<string, unknown>;
	return (
		typeof stamp.id === "string" &&
		typeof stamp.name === "string" &&
		typeof stamp.place === "string" &&
		typeof stamp.collectedAt === "string" &&
		SOURCES.includes(stamp.source as StampSource) &&
		(stamp.reward === undefined || typeof stamp.reward === "string")
	);
}

/**
 * Parse stored stamps, dropping anything malformed.
 * Rewards are only kept on green events (businesses never give one).
 */
export function parsePassport(raw: string | null): Passport {
	if (!raw) return { stamps: [] };
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return { stamps: [] };
	}
	const list = (parsed as { stamps?: unknown })?.stamps;
	if (!Array.isArray(list)) return { stamps: [] };
	const stamps = list
		.filter(isStamp)
		.map((stamp) =>
			stamp.source === "green-event" ? stamp : { ...stamp, reward: undefined },
		);
	return { stamps };
}

/** Save the passport on this device. Returns false if storage is blocked or full. */
export function savePassport(passport: Passport): boolean {
	if (typeof window === "undefined") return false;
	try {
		window.localStorage.setItem(PASSPORT_STORAGE_KEY, JSON.stringify(passport));
		return true;
	} catch {
		return false;
	}
}

/** The visitor's passport. Stamps live on this device; no account is needed. */
export async function loadPassport(): Promise<Passport> {
	if (typeof window === "undefined") return { stamps: [] };
	return parsePassport(window.localStorage.getItem(PASSPORT_STORAGE_KEY));
}
