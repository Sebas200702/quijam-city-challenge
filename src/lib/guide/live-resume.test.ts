import { describe, expect, it } from "vitest";
import { markLiveResume, takeLiveResume } from "./live-resume";

function memoryStorage(): Pick<Storage, "getItem" | "setItem" | "removeItem"> {
	const data = new Map<string, string>();
	return {
		getItem: (key) => data.get(key) ?? null,
		setItem: (key, value) => void data.set(key, value),
		removeItem: (key) => void data.delete(key),
	};
}

describe("Live resume across a page load (S4)", () => {
	it("resumes once on the next page, only shortly after leaving", () => {
		const storage = memoryStorage();
		markLiveResume(storage, 1_000);
		expect(takeLiveResume(storage, 5_000)).toBe(true);
		// One shot: a later reload does not reopen the microphone.
		expect(takeLiveResume(storage, 5_001)).toBe(false);
		markLiveResume(storage, 1_000);
		expect(takeLiveResume(storage, 120_000)).toBe(false);
	});
});
