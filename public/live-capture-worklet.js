// AudioWorklet for Gemini Live voice: posts each microphone buffer to the
// main thread (src/lib/guide/live-audio.ts). A static file so the CSP's
// script-src 'self' covers it on every page.
class Capture extends AudioWorkletProcessor {
	process(inputs) {
		const channel = inputs[0][0];
		if (channel) this.port.postMessage(channel.slice(0));
		return true;
	}
}
registerProcessor("capture", Capture);
