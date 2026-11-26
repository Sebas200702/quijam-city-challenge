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

	it("builds a clean visitor map QR URL from valid HTTP/HTTPS origins", () => {
		expect(buildJuryQrUrl("https://quillart.demo.co/ciudad")).toBe(
			"https://quillart.demo.co/mapa?origen=qr",
		);
		expect(buildJuryQrUrl("http://localhost:4321")).toBe(
			"http://localhost:4321/mapa?origen=qr",
		);
		expect(buildJuryQrUrl("javascript:alert(1)")).toBe("/mapa?origen=qr");
		expect(buildJuryQrUrl("")).toBe("/mapa?origen=qr");
	});

	it("summarizes presence state with deduplication and separates QR vs direct", () => {
		const summary = summarizePresenceState(
			{
				vis_aaa111222333: [
					{ session_id: "vis_aaa111222333", entry: "qr" },
					{ session_id: "vis_aaa111222333", entry: "direct" },
				],
				vis_bbb444555666: [{ session_id: "vis_bbb444555666", entry: "direct" }],
				vis_ccc777888999: [{ session_id: "vis_ccc777888999", entry: "qr" }],
			},
			"2026-11-26T21:00:00Z",
		);

		expect(summary).toEqual({
			connectedCount: 3,
			qrCount: 2,
			directCount: 1,
			sessionIds: ["vis_aaa111222333", "vis_bbb444555666", "vis_ccc777888999"],
			lastChangeAt: "2026-11-26T21:00:00Z",
		});
	});

	it("handles an empty presence state cleanly", () => {
		const summary = summarizePresenceState({}, "2026-11-26T21:00:00Z");
		expect(summary.connectedCount).toBe(0);
		expect(summary.qrCount).toBe(0);
		expect(summary.directCount).toBe(0);
	});
});
