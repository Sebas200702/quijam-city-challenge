import { describe, expect, it } from "vitest";
import { scrollProgress } from "./landing-motion";

describe("scrollProgress", () => {
	it("is 0 while the element is still below the reading line", () => {
		expect(scrollProgress(900, 400, 800)).toBe(0);
	});

	it("grows as the element crosses the reading line", () => {
		// Reading line at 62% of an 800px viewport = 496px; 200 of 400px passed.
		expect(scrollProgress(296, 400, 800)).toBeCloseTo(0.5);
	});

	it("stays at 1 once the element has passed, or has no height", () => {
		expect(scrollProgress(-600, 400, 800)).toBe(1);
		expect(scrollProgress(100, 0, 800)).toBe(1);
	});
});
