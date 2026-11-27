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
		expect(takeLiveResume(storage, 5_000)).toEqual({ unspoken: false });
		// One shot: a later reload does not reopen the microphone.
		expect(takeLiveResume(storage, 5_001)).toBeNull();
		markLiveResume(storage, 1_000);
		expect(takeLiveResume(storage, 120_000)).toBeNull();
	});

	it("remembers that she left mid-answer, so she picks it up again", () => {
		const storage = memoryStorage();
		markLiveResume(storage, 1_000, true);
		expect(takeLiveResume(storage, 2_000)).toEqual({ unspoken: true });
	});

	it("reads an older timestamp-only mark as already spoken", () => {
		const storage = memoryStorage();
		storage.setItem("quillart.live.resume", "1000");
		expect(takeLiveResume(storage, 2_000)).toEqual({ unspoken: false });
	});

	it("ignores a broken mark", () => {
		const storage = memoryStorage();
		storage.setItem("quillart.live.resume", "{nope");
		expect(takeLiveResume(storage, 2_000)).toBeNull();
	});
});
