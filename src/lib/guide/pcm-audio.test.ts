import { describe, expect, it } from "vitest";
import { base64Pcm16ToFloat, floatToBase64Pcm16 } from "./pcm-audio";

describe("pcm audio", () => {
	it("round-trips samples within PCM16 precision", () => {
		const input = new Float32Array([0, 0.5, -0.5, 1, -1]);
		const output = base64Pcm16ToFloat(floatToBase64Pcm16(input));
		expect(output).toHaveLength(input.length);
		input.forEach((sample, index) => {
			expect(output[index]).toBeCloseTo(sample, 3);
		});
	});

	it("clamps samples outside -1..1", () => {
		const output = base64Pcm16ToFloat(
			floatToBase64Pcm16(new Float32Array([2, -2])),
		);
		expect(output[0]).toBeCloseTo(1, 3);
		expect(output[1]).toBe(-1);
	});
});
