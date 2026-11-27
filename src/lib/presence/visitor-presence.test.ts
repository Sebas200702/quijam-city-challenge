import { describe, expect, it } from "vitest";
import {
	ANON_SESSION_STORAGE_KEY,
	buildJuryQrUrl,
	detectEntrySource,
	getOrCreateAnonymousSessionId,
	summarizePresenceState,
} from "./visitor-presence-utils";

function createMemoryStorage() {
	const map = new Map<string, string>();
	return {
		getItem: (key: string) => map.get(key) ?? null,
		setItem: (key: string, value: string) => {
			map.set(key, value);
		},
	};
}

describe("visitor-presence-utils", () => {
	it("creates and reuses an anonymous session id without personal data", () => {
		const storage = createMemoryStorage();
		const first = getOrCreateAnonymousSessionId(storage);
		const second = getOrCreateAnonymousSessionId(storage);

		expect(first).toMatch(/^vis_[a-z0-9]{12}$/i);
		expect(second).toBe(first);
		expect(storage.getItem(ANON_SESSION_STORAGE_KEY)).toBe(first);
	});

	it("detects QR entry parameter in Spanish or English", () => {
		expect(detectEntrySource("?origen=qr")).toBe("qr");
		expect(detectEntrySource("?source=qr")).toBe("qr");
		expect(detectEntrySource("?foo=bar")).toBe("direct");
		expect(detectEntrySource("")).toBe("direct");
	});

	it("builds an absolute visitor map URL for valid origins and returns null otherwise", () => {
		expect(buildJuryQrUrl("https://quillart.demo.co/ciudad")).toBe(
			"https://quillart.demo.co/mapa?origen=qr",
		);
		expect(buildJuryQrUrl("http://localhost:4321")).toBe(
			"http://localhost:4321/mapa?origen=qr",
		);
		expect(buildJuryQrUrl("javascript:alert(1)")).toBeNull();
		expect(buildJuryQrUrl("not-a-url")).toBeNull();
		expect(buildJuryQrUrl("")).toBeNull();
		expect(buildJuryQrUrl("   ")).toBeNull();
	});

	it("uses presence keys as session identity and counts QR vs total visitors", () => {
		const summary = summarizePresenceState({
			vis_aaa111222333: [
				{ session_id: "spoofed_1", entry: "qr" },
				{ session_id: "spoofed_2", entry: "direct" },
			],
			vis_bbb444555666: [{ entry: "direct" }],
			vis_ccc777888999: [{ entry: "qr" }],
		});

		expect(summary).toEqual({
			connectedCount: 3,
			qrCount: 2,
		});
	});

	it("handles an empty presence state cleanly", () => {
		expect(summarizePresenceState({})).toEqual({
			connectedCount: 0,
			qrCount: 0,
		});
	});
});
