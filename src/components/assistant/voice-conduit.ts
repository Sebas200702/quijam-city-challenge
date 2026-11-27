// Voice is only a conduit for Quillart AI: the browser's speech-to-text in
// and text-to-speech out, in the language chosen in the app (es, en, pt, fr). Text always works; when the browser has no
// support, the hook says so and the chat hides the voice controls.

import { useCallback, useEffect, useRef, useState } from "react";
import { VOICE_LOCALES } from "../../lib/i18n/languages";
import { messages } from "../../lib/i18n/messages";
import { getLanguage } from "../../lib/i18n/use-language";

/** BCP 47 tag of the chosen interface language (es-CO, en-US, pt-BR, fr-FR). */
function voiceLocale(): string {
	return VOICE_LOCALES[getLanguage()];
}
const SPEAK_KEY = "quillart-read-aloud";

interface RecognitionAlternative {
	transcript: string;
}
interface RecognitionResult {
	readonly isFinal: boolean;
	readonly length: number;
	[index: number]: RecognitionAlternative;
}
interface RecognitionEvent {
	readonly resultIndex: number;
	readonly results: {
		readonly length: number;
		[index: number]: RecognitionResult;
	};
}
interface Recognition {
	lang: string;
	continuous: boolean;
	interimResults: boolean;
	maxAlternatives: number;
	onresult: ((event: RecognitionEvent) => void) | null;
	onerror: ((event: { error: string }) => void) | null;
	onend: (() => void) | null;
	start(): void;
	stop(): void;
	abort(): void;
}
type RecognitionConstructor = new () => Recognition;

function recognitionConstructor(): RecognitionConstructor | null {
	if (typeof window === "undefined") return null;
	const scope = window as unknown as {
		SpeechRecognition?: RecognitionConstructor;
		webkitSpeechRecognition?: RecognitionConstructor;
	};
	return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

function canSpeak(): boolean {
	return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** A voice for the chosen language: the exact locale first (Colombian Spanish for es), then any of the same language. */
function preferredVoice(locale: string): SpeechSynthesisVoice | null {
	const voices = window.speechSynthesis.getVoices();
	const language = locale.slice(0, 2).toLowerCase();
	return (
		voices.find((voice) => voice.lang.replace("_", "-") === locale) ??
		(language === "es"
			? voices.find((voice) =>
					/^es[-_](US|MX|419|AR|CL|PE|VE)/i.test(voice.lang),
				)
			: undefined) ??
		voices.find((voice) => voice.lang.toLowerCase().startsWith(language)) ??
		null
	);
}

/** Text without markdown symbols or links, so it reads naturally. */
function speakable(text: string): string {
	return text
		.replace(/https?:\/\/\S+/g, "")
		.replace(/[*_#`>]/g, "")
		.replace(/\s+/g, " ")
		.trim();
}

export function speak(text: string): void {
	if (!canSpeak()) return;
	const clean = speakable(text);
	if (!clean) return;
	const utterance = new SpeechSynthesisUtterance(clean);
	const locale = voiceLocale();
	utterance.lang = locale;
	const voice = preferredVoice(locale);
	if (voice) utterance.voice = voice;
	window.speechSynthesis.cancel();
	window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
	if (canSpeak()) window.speechSynthesis.cancel();
}

function readSpeakPreference(): boolean {
	try {
		return localStorage.getItem(SPEAK_KEY) === "1";
	} catch {
		return false;
	}
}

function writeSpeakPreference(value: boolean): void {
	try {
		localStorage.setItem(SPEAK_KEY, value ? "1" : "0");
	} catch {
		// Private mode or blocked storage: the toggle still works for this visit.
	}
}

export interface VoiceConduit {
	canListen: boolean;
	canSpeak: boolean;
	listening: boolean;
	/** What the person is saying, before the final result. */
	interim: string;
	/** Spanish message when the microphone failed, or null. */
	error: string | null;
	start(): void;
	stop(): void;
	readAloud: boolean;
	setReadAloud(value: boolean): void;
}

/** Error text in the chosen language, read when the error happens. */
function voiceError(code: string): string {
	const chat = messages[getLanguage()].chat;
	switch (code) {
		case "not-allowed":
		case "service-not-allowed":
			return chat.micPermission;
		case "audio-capture":
			return chat.noMic;
		case "network":
			return chat.needsInternet;
		default:
			return chat.couldNotListen;
	}
}

/** Speech-to-text that calls `onFinal` with what the person said. */
export function useVoiceConduit(onFinal: (text: string) => void): VoiceConduit {
	const [support, setSupport] = useState({ listen: false, speak: false });
	const [listening, setListening] = useState(false);
	const [interim, setInterim] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [readAloud, setReadAloudState] = useState(false);
	const recognition = useRef<Recognition | null>(null);
	const onFinalRef = useRef(onFinal);
	onFinalRef.current = onFinal;

	useEffect(() => {
		setSupport({
			listen: recognitionConstructor() !== null,
			speak: canSpeak(),
		});
		setReadAloudState(readSpeakPreference() && canSpeak());
		// Some browsers load voices late; asking once warms the list up.
		if (canSpeak()) window.speechSynthesis.getVoices();
		return () => {
			recognition.current?.abort();
			stopSpeaking();
		};
	}, []);

	const stop = useCallback(() => {
		recognition.current?.stop();
	}, []);

	const start = useCallback(() => {
		const Constructor = recognitionConstructor();
		if (!Constructor) return;
		stopSpeaking();
		recognition.current?.abort();
		const instance = new Constructor();
		instance.lang = voiceLocale();
		instance.continuous = false;
		instance.interimResults = true;
		instance.maxAlternatives = 1;
		let finalText = "";
		instance.onresult = (event) => {
			let partial = "";
			for (let i = event.resultIndex; i < event.results.length; i += 1) {
				const result = event.results[i];
				const transcript = result?.[0]?.transcript ?? "";
				if (result?.isFinal) finalText += transcript;
				else partial += transcript;
			}
			setInterim(partial || finalText);
		};
		instance.onerror = (event) => {
			if (event.error !== "no-speech" && event.error !== "aborted")
				setError(voiceError(event.error));
		};
		instance.onend = () => {
			setListening(false);
			setInterim("");
			recognition.current = null;
			const text = finalText.trim();
			if (text) onFinalRef.current(text);
		};
		recognition.current = instance;
		setError(null);
		setInterim("");
		try {
			instance.start();
			setListening(true);
		} catch {
			setError(messages[getLanguage()].chat.micFailed);
		}
	}, []);

	const setReadAloud = useCallback((value: boolean) => {
		setReadAloudState(value);
		writeSpeakPreference(value);
		if (!value) stopSpeaking();
	}, []);

	return {
		canListen: support.listen,
		canSpeak: support.speak,
		listening,
		interim,
		error,
		start,
		stop,
		readAloud,
		setReadAloud,
	};
}
