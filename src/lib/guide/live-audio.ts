// Browser audio for Gemini Live: microphone in (16 kHz PCM16) and model audio
// out (24 kHz PCM16). Same approach as the beta page in /prueba-guia.

import {
	base64Pcm16ToFloat,
	floatToBase64Pcm16,
	INPUT_MIME_TYPE,
	INPUT_SAMPLE_RATE,
	OUTPUT_SAMPLE_RATE,
} from "./pcm-audio";

// Posts each mic buffer to the main thread. Inlined so no extra static file is needed.
const CAPTURE_WORKLET = `
class Capture extends AudioWorkletProcessor {
  process(inputs) {
    const channel = inputs[0][0];
    if (channel) this.port.postMessage(channel.slice(0));
    return true;
  }
}
registerProcessor("capture", Capture);
`;

export interface Microphone {
	stop: () => void;
}

/** Starts the mic and hands each chunk, ready for sendRealtimeInput, to `onChunk`. */
export async function startMicrophone(
	onChunk: (audio: { data: string; mimeType: string }) => void,
): Promise<Microphone> {
	const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
	const context = new AudioContext({ sampleRate: INPUT_SAMPLE_RATE });
	try {
		const moduleUrl = URL.createObjectURL(
			new Blob([CAPTURE_WORKLET], { type: "application/javascript" }),
		);
		await context.audioWorklet.addModule(moduleUrl);
		const node = new AudioWorkletNode(context, "capture");
		node.port.onmessage = (event: MessageEvent<Float32Array>) => {
			onChunk({
				data: floatToBase64Pcm16(event.data),
				mimeType: INPUT_MIME_TYPE,
			});
		};
		context.createMediaStreamSource(stream).connect(node);
	} catch (error) {
		for (const track of stream.getTracks()) track.stop();
		void context.close();
		throw error;
	}
	return {
		stop: () => {
			for (const track of stream.getTracks()) track.stop();
			void context.close();
		},
	};
}

/** Plays model audio chunks back to back; `interrupt` drops what is queued. */
export class LivePlayback {
	private context: AudioContext | null = null;
	private nextStart = 0;
	private sources: AudioBufferSourceNode[] = [];

	play(base64: string): void {
		if (!this.context) {
			this.context = new AudioContext({ sampleRate: OUTPUT_SAMPLE_RATE });
		}
		const context = this.context;
		const samples = base64Pcm16ToFloat(base64);
		const buffer = context.createBuffer(1, samples.length, OUTPUT_SAMPLE_RATE);
		buffer.copyToChannel(samples, 0);
		const source = context.createBufferSource();
		source.buffer = buffer;
		source.connect(context.destination);
		const start = Math.max(context.currentTime, this.nextStart);
		source.start(start);
		this.nextStart = start + buffer.duration;
		this.sources.push(source);
		source.onended = () => {
			this.sources = this.sources.filter((item) => item !== source);
		};
	}

	interrupt(): void {
		for (const source of this.sources) {
			try {
				source.stop();
			} catch {
				// Already stopped.
			}
		}
		this.sources = [];
		this.nextStart = 0;
	}

	close(): void {
		this.interrupt();
		void this.context?.close();
		this.context = null;
	}
}
