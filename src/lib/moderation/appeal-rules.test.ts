import { describe, expect, it } from "vitest";
import { canAppeal, checkAppealMessage } from "./appeal-rules";

describe("checkAppealMessage", () => {
	it("trims and collapses spaces", () => {
		expect(checkAppealMessage("  Era   un evento   real  ")).toEqual({
			ok: true,
			message: "Era un evento real",
		});
	});

	it("rejects short and long messages", () => {
		expect(checkAppealMessage("no").ok).toBe(false);
		expect(checkAppealMessage("a".repeat(501)).ok).toBe(false);
		expect(checkAppealMessage("a".repeat(500)).ok).toBe(true);
	});
});

describe("canAppeal", () => {
	it("only removed content without a previous appeal", () => {
		expect(canAppeal("removed", null)).toBe(true);
		expect(canAppeal("removed", "open")).toBe(false);
		expect(canAppeal("removed", "upheld")).toBe(false);
		expect(canAppeal("held", null)).toBe(false);
		expect(canAppeal("published", null)).toBe(false);
	});
});
