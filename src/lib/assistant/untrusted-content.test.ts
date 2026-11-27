import { describe, expect, it } from "vitest";
import {
	isUntrusted,
	stripControlChars,
	UNTRUSTED_BODY_MAX,
	untrusted,
} from "./untrusted-content";

describe("stripControlChars", () => {
	it("removes control, zero-width and bidi characters", () => {
		const text = ["a", 0x00, "b", 0x200b, "c", 0x202e, "d", 0x2066, "e", 0xfeff]
			.map((part) =>
				typeof part === "number" ? String.fromCodePoint(part) : part,
			)
			.join("");
		expect(stripControlChars(text)).toBe("abcde");
	});

	it("keeps newlines and collapses spaces", () => {
		expect(stripControlChars("  hola\t\tmundo\n\n\n\nadiós ")).toBe(
			"hola mundo\n\nadiós",
		);
	});
});

describe("untrusted", () => {
	it("wraps text in an envelope", () => {
		expect(untrusted("Taller de millo")).toEqual({
			untrusted_text: "Taller de millo",
		});
	});

	it("truncates long text and marks it", () => {
		const wrapped = untrusted("x".repeat(1000));
		expect(wrapped?.truncated).toBe(true);
		expect(wrapped?.untrusted_text.length).toBe(UNTRUSTED_BODY_MAX);
		expect(wrapped?.untrusted_text.endsWith("…")).toBe(true);
		expect(untrusted("abcdef", 4)?.untrusted_text).toBe("abc…");
	});

	it("returns null for empty or missing text", () => {
		expect(untrusted(null)).toBeNull();
		expect(untrusted(undefined)).toBeNull();
		expect(untrusted(` ${String.fromCodePoint(0x200b)} `)).toBeNull();
	});

	it("recognizes envelopes", () => {
		expect(isUntrusted(untrusted("hola"))).toBe(true);
		expect(isUntrusted({ text: "hola" })).toBe(false);
		expect(isUntrusted("hola")).toBe(false);
	});
});
