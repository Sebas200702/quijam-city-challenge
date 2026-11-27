// Browser audio for Gemini Live: microphone in (16 kHz PCM16) and model audio
// out (24 kHz PCM16). Same approach as the beta page in /prueba-guia.

import {
	base64Pcm16ToFloat,
	floatToBase64Pcm16,
	INPUT_MIME_TYPE,
	INPUT_SAMPLE_RATE,
	OUTPUT_SAMPLE_RATE,
} from "./pcm-audio";

// Posts each mic buffer to the main thread. Served from public/ as our own
// file: the Content-Security-Policy allows 'self' scripts on every page,
// while a blob: worklet is only allowed on /prueba-guia.
export const CAPTURE_WORKLET_URL = "/live-capture-worklet.js";

/** Any of these counts as the gesture a browser needs to start audio. */
const GESTURES = [
	"pointerdown",
	"pointerup",
	"touchend",
	"click",
	"keydown",
] as const;

/**
 * Keeps an AudioContext running. After a page load (Live resumed on the next
 * page) some browsers start audio suspended until the person touches the page,
 * and a hidden tab or an OS interruption can suspend it later. Tries at once,
 * again on every gesture, when the tab is visible again and whenever the
 * context leaves "running". Returns the cleanup.
 */
function keepRunning(context: AudioContext): () => void {
	const resume = () => {
		if (context.state === "running" || context.state === "closed") return;
		context.resume().catch(() => {
			// Needs a gesture first; the listeners below try again.
		});
	};
	const onVisible = () => {
		if (document.visibilityState === "visible") resume();
	};
	for (const gesture of GESTURES) {
		window.addEventListener(gesture, resume, { passive: true });
	}
	document.addEventListener("visibilitychange", onVisible);
	context.onstatechange = () => {
		if (context.state !== "running") resume();
	};
	resume();
	return () => {
		for (const gesture of GESTURES) {
			window.removeEventListener(gesture, resume);
		}
		document.removeEventListener("visibilitychange", onVisible);
		context.onstatechange = null;
	};
}

export interface Microphone {
	stop: () => void;
}

/** Starts the mic and hands each chunk, ready for sendRealtimeInput, to `onChunk`. */
export async function startMicrophone(
	onChunk: (audio: { data: string; mimeType: string }) => void,
): Promise<Microphone> {
	const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
	const context = new AudioContext({ sampleRate: INPUT_SAMPLE_RATE });
	const release = keepRunning(context);
	try {
		await context.audioWorklet.addModule(CAPTURE_WORKLET_URL);
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
		release();
		void context.close();
		throw error;
	}
	return {
		stop: () => {
			for (const track of stream.getTracks()) track.stop();
			release();
			void context.close();
		},
	};
}

/** Plays model audio chunks back to back; `interrupt` drops what is queued. */
export class LivePlayback {
	private context: AudioContext | null = null;
	private nextStart = 0;
	private sources: AudioBufferSourceNode[] = [];
	private release: (() => void) | null = null;
	private waiting: (() => void)[] = [];

	play(base64: string): void {
		if (!this.context) {
			this.context = new AudioContext({ sampleRate: OUTPUT_SAMPLE_RATE });
			this.release = keepRunning(this.context);
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
			if (this.sources.length === 0) this.wake();
		};
	}

	/** True while audio is queued or playing. */
	busy(): boolean {
		return this.sources.length > 0;
	}

	/**
	 * Resolves once everything queued has played. It never resolves while the
	 * context is suspended (time does not move), so callers add a timeout.
	 */
	drained(): Promise<void> {
		if (this.sources.length === 0) return Promise.resolve();
		return new Promise((resolve) => this.waiting.push(resolve));
	}

	private wake(): void {
		const waiting = this.waiting;
		this.waiting = [];
		for (const resolve of waiting) resolve();
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
		this.wake();
	}

	close(): void {
		this.interrupt();
		this.release?.();
		this.release = null;
		void this.context?.close();
		this.context = null;
	}
}
