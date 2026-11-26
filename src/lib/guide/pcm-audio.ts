/** Gemini Live expects 16 kHz mono PCM16 input and returns 24 kHz PCM16 output. */
export const INPUT_SAMPLE_RATE = 16_000;
export const OUTPUT_SAMPLE_RATE = 24_000;
export const INPUT_MIME_TYPE = `audio/pcm;rate=${INPUT_SAMPLE_RATE}`;

/** Converts Web Audio float samples (-1..1) to base64 little-endian PCM16. */
export function floatToBase64Pcm16(samples: Float32Array): string {
	const bytes = new Uint8Array(samples.length * 2);
	const view = new DataView(bytes.buffer);
	samples.forEach((sample, index) => {
		const clamped = Math.max(-1, Math.min(1, sample));
		view.setInt16(
			index * 2,
			clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff,
			true,
		);
	});
	let binary = "";
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary);
}

/** Converts base64 little-endian PCM16 back to Web Audio float samples. */
export function base64Pcm16ToFloat(base64: string): Float32Array<ArrayBuffer> {
	const binary = atob(base64);
	const view = new DataView(new ArrayBuffer(binary.length));
	for (let index = 0; index < binary.length; index++) {
		view.setUint8(index, binary.charCodeAt(index));
	}
	const samples = new Float32Array(binary.length / 2);
	for (let index = 0; index < samples.length; index++) {
		samples[index] = view.getInt16(index * 2, true) / 0x8000;
	}
	return samples;
}
