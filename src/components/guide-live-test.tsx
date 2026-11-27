import type { Session } from "@google/genai";
import { useRef, useState } from "react";
import type { GuideMode } from "../lib/guide/guide-types";
import { openLiveSession } from "../lib/guide/live-session";
import "../styles/life-assistant.css";
import {
	base64Pcm16ToFloat,
	floatToBase64Pcm16,
	INPUT_MIME_TYPE,
	INPUT_SAMPLE_RATE,
	OUTPUT_SAMPLE_RATE,
} from "../lib/guide/pcm-audio";

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

/** Minimal Gemini Live test: voice in and out, with text as plan B. */
export default function GuideLiveTest() {
	const [mode, setMode] = useState<GuideMode>("audio");
	const [status, setStatus] = useState("Desconectado");
	const [connected, setConnected] = useState(false);
	const [log, setLog] = useState<string[]>([]);
	const [draft, setDraft] = useState("");
	/** Answer being streamed right now, shown live until the turn ends. */
	const [partial, setPartial] = useState("");
	const sessionRef = useRef<Session | null>(null);
	const micContextRef = useRef<AudioContext | null>(null);
	const playbackRef = useRef<{
		context: AudioContext;
		nextStart: number;
	} | null>(null);
	const micStreamRef = useRef<MediaStream | null>(null);
	const transcriptRef = useRef("");

	const append = (line: string) => setLog((lines) => [...lines, line]);

	function playChunk(base64: string) {
		if (!playbackRef.current) {
			playbackRef.current = {
				context: new AudioContext({ sampleRate: OUTPUT_SAMPLE_RATE }),
				nextStart: 0,
			};
		}
		const playback = playbackRef.current;
		const samples = base64Pcm16ToFloat(base64);
		const buffer = playback.context.createBuffer(
			1,
			samples.length,
			OUTPUT_SAMPLE_RATE,
		);
		buffer.copyToChannel(samples, 0);
		const source = playback.context.createBufferSource();
		source.buffer = buffer;
		source.connect(playback.context.destination);
		const start = Math.max(playback.context.currentTime, playback.nextStart);
		source.start(start);
		playback.nextStart = start + buffer.duration;
	}

	async function startMic(session: Session) {
		const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
		const context = new AudioContext({ sampleRate: INPUT_SAMPLE_RATE });
		const moduleUrl = URL.createObjectURL(
			new Blob([CAPTURE_WORKLET], { type: "application/javascript" }),
		);
		await context.audioWorklet.addModule(moduleUrl);
		const node = new AudioWorkletNode(context, "capture");
		node.port.onmessage = (event: MessageEvent<Float32Array>) => {
			session.sendRealtimeInput({
				audio: {
					data: floatToBase64Pcm16(event.data),
					mimeType: INPUT_MIME_TYPE,
				},
			});
		};
		context.createMediaStreamSource(stream).connect(node);
		micStreamRef.current = stream;
		micContextRef.current = context;
	}

	function flushTranscript() {
		const text = transcriptRef.current.trim();
		transcriptRef.current = "";
		setPartial("");
		if (text) append(`Guía: ${text}`);
	}

	/** Frees the mic and speakers. Safe to call more than once. */
	function release() {
		sessionRef.current = null;
		for (const track of micStreamRef.current?.getTracks() ?? []) {
			track.stop();
		}
		void micContextRef.current?.close();
		micContextRef.current = null;
		void playbackRef.current?.context.close();
		playbackRef.current = null;
		flushTranscript();
		setConnected(false);
		setStatus("Desconectado");
	}

	function stop() {
		const session = sessionRef.current;
		release();
		session?.close();
	}

	async function start() {
		setStatus("Conectando…");
		try {
			const session = await openLiveSession(mode, {
				onText: (text) => {
					transcriptRef.current += text;
					setPartial(transcriptRef.current);
				},
				onTurnComplete: flushTranscript,
				// Text mode reads the transcript and keeps the speakers quiet.
				onAudio: mode === "audio" ? playChunk : () => {},
				onInterrupted: () => {
					if (playbackRef.current) playbackRef.current.nextStart = 0;
				},
				onClose: (reason) => {
					if (!sessionRef.current) return;
					append(`Sesión cerrada: ${reason}`);
					release();
				},
			});
			sessionRef.current = session;
			setConnected(true);
			if (mode === "audio") {
				await startMic(session);
			}
			setStatus(mode === "audio" ? "Conectado: habla" : "Conectado: escribe");
		} catch (error) {
			append(
				`Error: ${error instanceof Error ? error.message : String(error)}`,
			);
			stop();
		}
	}

	function sendText() {
		if (!sessionRef.current || !draft.trim()) return;
		// Live models take typed text as realtime input, same as the mic.
		sessionRef.current.sendRealtimeInput({ text: draft });
		append(`Tú: ${draft}`);
		setDraft("");
	}

	return (
		<section className="mx-auto flex max-w-xl flex-col gap-4 p-4">
			<div className="la-hero l-rise">
				<span
					className="l-geo l-geo--ring l-geo--gold -top-3 -right-3"
					aria-hidden="true"
				/>
				<span
					className="l-geo l-geo--half l-geo--green bottom-0 left-8"
					aria-hidden="true"
				/>
				<span
					className="l-geo l-geo--plus right-16 bottom-4"
					aria-hidden="true"
				/>
				<div className="la-hero__copy">
					<h1 className="l-h2">Guía por voz · beta</h1>
				</div>
			</div>
			<div
				className="l-rise flex flex-wrap gap-2"
				style={{ ["--i" as string]: 1 }}
			>
				<select
					className="la-field"
					value={mode}
					disabled={connected}
					onChange={(event) => setMode(event.target.value as GuideMode)}
				>
					<option value="audio">Voz</option>
					<option value="text">Texto (plan B)</option>
				</select>
				<button
					type="button"
					className={`q-btn ${connected ? "q-btn--alert" : "q-btn--primary"}`}
					onClick={connected ? stop : start}
				>
					{connected ? "Detener" : "Iniciar"}
				</button>
				<span className="l-eyebrow l-eyebrow--sunk self-center">
					<span className="q-star" aria-hidden="true" />
					{status}
				</span>
			</div>
			{mode === "text" && (
				<div className="flex gap-2">
					<input
						className="la-field min-w-0 flex-1"
						value={draft}
						onChange={(event) => setDraft(event.target.value)}
						onKeyDown={(event) => event.key === "Enter" && sendText()}
						placeholder="How do I get to the stadium?"
					/>
					<button
						type="button"
						className="q-btn q-btn--secondary"
						onClick={sendText}
					>
						Enviar
					</button>
				</div>
			)}
			<ul className="la-log m-0 flex list-none flex-col gap-2 p-0 text-sm">
				{log.map((line, index) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: append-only log
					<li key={index}>{line}</li>
				))}
				{partial && <li aria-live="polite">Guía: {partial}</li>}
			</ul>
		</section>
	);
}
