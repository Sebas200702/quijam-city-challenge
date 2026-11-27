import {
	CarTaxiFront,
	Languages,
	type LucideIcon,
	MessageCircle,
	Mic,
	RotateCcw,
	Route,
	Send,
	Square,
	Volume2,
	VolumeX,
	WifiOff,
	X,
} from "lucide-react";
import { Fragment, useEffect, useId, useRef, useState } from "react";
import type { GuideAnswer } from "../../lib/guide/guide-answer";
import type { GuideLanguage } from "../../lib/guide/guide-local";
import { offlineGuideAnswer } from "../../lib/guide/guide-offline";
import type {
	GuideMessages,
	GuideSuggestionIcon,
} from "../../lib/i18n/dictionaries/guide";
import { VOICE_LOCALES } from "../../lib/i18n/languages";
import { useLanguage, useT } from "../../lib/i18n/use-language";
import type { DestinationKey } from "../../lib/trip/trip-planner";
import { AskQuillartButton } from "../assistant/ask-quillart-button";
import {
	speak,
	stopSpeaking,
	useVoiceConduit,
} from "../assistant/voice-conduit";
import "./guide-panel.css";
import {
	GuideChatIllustration,
	GuideErrorIllustration,
	GuideMicIllustration,
	GuideOfflineIllustration,
} from "./guide-illustrations";
import { answerSlang, browserLanguage, glossSlang } from "./guide-text";
import { ReportForm } from "./report-form";
import { TripCard } from "./trip-card";

const SUGGESTION_ICONS: Record<GuideSuggestionIcon, LucideIcon> = {
	route: Route,
	taxi: CarTaxiFront,
	slang: MessageCircle,
	language: Languages,
};

/** Voices for reading answers aloud. */
const SPEECH_LOCALES: Record<GuideLanguage, string> = {
	es: "es-CO",
	en: "en-US",
	pt: "pt-BR",
	fr: "fr-FR",
	de: "de-DE",
};

/** Where answers are kept so the Guide still replies without a connection. */
const SAVED_KEY = "quillart:guide:answers";
const SAVED_LIMIT = 20;

function savedKey(question: string): string {
	return question.trim().toLowerCase().replace(/\s+/g, " ");
}

function readSaved(): Record<string, GuideAnswer> {
	try {
		return JSON.parse(localStorage.getItem(SAVED_KEY) ?? "{}");
	} catch {
		return {};
	}
}

function saveAnswer(question: string, answer: GuideAnswer): void {
	try {
		const entries = Object.entries(readSaved()).filter(
			([key]) => key !== savedKey(question),
		);
		entries.push([savedKey(question), answer]);
		localStorage.setItem(
			SAVED_KEY,
			JSON.stringify(Object.fromEntries(entries.slice(-SAVED_LIMIT))),
		);
	} catch {
		// Private mode or full storage: the Guide still answers online.
	}
}

type Origin = "gemini" | "local" | "slang" | "saved";
/** Mic problems: nothing was heard, or the browser blocked the microphone. */
type StateKind = "error" | "offline" | "unheard" | "blocked";

type Message =
	| {
			id: number;
			role: "user";
			text: string;
			voice: boolean;
			language?: GuideLanguage;
	  }
	| {
			id: number;
			role: "ai";
			text: string;
			language: GuideLanguage;
			origin: Origin;
			answer?: GuideAnswer;
			/** The visitor's question, to continue it in Quillart AI. */
			question?: string;
	  }
	| { id: number; role: "state"; kind: StateKind; question?: string };

interface GuidePanelProps {
	onShowOnMap: (destination: DestinationKey) => void;
	onClose: () => void;
	onReportSaved?: (reportId: string) => void;
	/** Show the "reference data" tag; off on the map, whose header already has it. */
	showReferenceTag?: boolean;
}

function GuideAvatar() {
	return (
		<span className="q-avatar" aria-hidden="true">
			<span className="q-star guide-panel__star" />
		</span>
	);
}

/** The answer with each slang word followed by its meaning. */
function GlossedText({
	text,
	language,
}: {
	text: string;
	language: GuideLanguage;
}) {
	let offset = 0;
	return glossSlang(text, language).map((part) => {
		const key = offset;
		offset += part.text.length;
		return part.gloss ? (
			<Fragment key={key}>
				<span className="guide-slang">{part.text}</span>{" "}
				<span className="guide-gloss">({part.gloss})</span>
			</Fragment>
		) : (
			<Fragment key={key}>{part.text}</Fragment>
		);
	});
}

function Suggestions({
	text,
	disabled,
	wrap,
	onAsk,
}: {
	text: GuideMessages["panel"];
	disabled: boolean;
	wrap: boolean;
	onAsk: (question: string) => void;
}) {
	return (
		<fieldset
			className={`guide-panel__chips${wrap ? " guide-panel__chips--wrap" : ""}`}
		>
			<legend className="q-sr">{text.suggestionsLabel}</legend>
			{text.suggestions.map((suggestion) => {
				const Icon = SUGGESTION_ICONS[suggestion.icon];
				return (
					<button
						key={suggestion.text}
						type="button"
						className="q-chip"
						lang={suggestion.lang}
						disabled={disabled}
						onClick={() => onAsk(suggestion.text)}
					>
						<Icon size={16} strokeWidth={1.75} aria-hidden="true" />
						{suggestion.text}
					</button>
				);
			})}
		</fieldset>
	);
}

export function GuidePanel({
	onShowOnMap,
	onClose,
	onReportSaved,
	showReferenceTag = false,
}: GuidePanelProps) {
	const inputId = useId();
	const titleId = useId();
	const [language, setLanguage] = useState<GuideLanguage>(browserLanguage);
	const [messages, setMessages] = useState<Message[]>([]);
	const [draft, setDraft] = useState("");
	const [thinking, setThinking] = useState(false);
	const [reportingId, setReportingId] = useState<number | null>(null);
	const [online, setOnline] = useState(
		() => typeof navigator === "undefined" || navigator.onLine,
	);
	const endRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const nextId = useRef(1);
	const interfaceLanguage = useLanguage();
	const guide = useT().guide;
	const text = guide.panel;

	// Same voice conduit as Quillart AI, listening in the visitor's language.
	const voice = useVoiceConduit((question) => ask(question, true), {
		lang: VOICE_LOCALES[interfaceLanguage],
	});
	const micProblem: StateKind | null =
		voice.errorCode === null
			? null
			: voice.errorCode === "not-allowed" ||
					voice.errorCode === "service-not-allowed"
				? "blocked"
				: "unheard";

	// The mic failed: send the visitor straight to the text field.
	useEffect(() => {
		if (micProblem) inputRef.current?.focus();
	}, [micProblem]);

	useEffect(() => {
		const update = () => setOnline(navigator.onLine);
		window.addEventListener("online", update);
		window.addEventListener("offline", update);
		return () => {
			window.removeEventListener("online", update);
			window.removeEventListener("offline", update);
		};
	}, []);

	// Keep the latest message in view as the conversation grows.
	// biome-ignore lint/correctness/useExhaustiveDependencies: scroll on every new message or form.
	useEffect(() => {
		endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
	}, [messages, thinking, reportingId]);

	/** At most one state card at a time: a new turn replaces the last one. */
	const withoutStates = (list: Message[]) =>
		list.filter((message) => message.role !== "state");

	const showState = (kind: StateKind, question?: string) =>
		setMessages((list) => [
			...withoutStates(list),
			{ id: nextId.current++, role: "state", kind, question },
		]);

	const addAnswer = (
		userId: number,
		reply: Omit<Extract<Message, { role: "ai" }>, "id" | "role">,
		spoken: boolean,
	) => {
		setMessages((list) => [
			...list.map((message) =>
				message.id === userId && message.role === "user"
					? { ...message, language: reply.language }
					: message,
			),
			{ id: nextId.current++, role: "ai", ...reply },
		]);
		setLanguage(reply.language);
		if (spoken || voice.readAloud)
			speak(reply.text, SPEECH_LOCALES[reply.language]);
	};

	const fetchAnswer = async (
		userId: number,
		question: string,
		spoken: boolean,
	) => {
		setThinking(true);
		try {
			if (!navigator.onLine) throw new Error("offline");
			const response = await fetch("/api/guide/ask", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ question }),
			});
			if (!response.ok) throw new Error(`status ${response.status}`);
			const answer = (await response.json()) as GuideAnswer;
			saveAnswer(question, answer);
			addAnswer(
				userId,
				{
					text: answer.reply,
					language: answer.language,
					origin: answer.source,
					answer,
					question,
				},
				spoken,
			);
		} catch {
			// An answer from an earlier visit, or the local Guide for the three routes (#47).
			const saved =
				readSaved()[savedKey(question)] ?? offlineGuideAnswer(question);
			if (saved) {
				addAnswer(
					userId,
					{
						text: saved.reply,
						language: saved.language,
						origin: "saved",
						answer: saved,
						question,
					},
					spoken,
				);
			} else {
				showState(navigator.onLine ? "error" : "offline", question);
			}
		} finally {
			setThinking(false);
		}
	};

	const ask = (question: string, spoken = false) => {
		const trimmed = question.trim();
		if (!trimmed || thinking) return;
		setDraft("");
		setReportingId(null);
		const userId = nextId.current++;
		setMessages((list) => [
			...withoutStates(list),
			{ id: userId, role: "user", text: trimmed, voice: spoken },
		]);
		// Slang is answered on the phone: instant, and it works offline.
		const slang = answerSlang(trimmed);
		if (slang) {
			addAnswer(
				userId,
				{ text: slang.reply, language: slang.language, origin: "slang" },
				spoken,
			);
			return;
		}
		void fetchAnswer(userId, trimmed, spoken);
	};

	const retry = (stateId: number, question: string) => {
		const user = [...messages]
			.reverse()
			.find((message) => message.role === "user" && message.text === question);
		setMessages((list) => list.filter((message) => message.id !== stateId));
		void fetchAnswer(user?.id ?? -1, question, false);
	};

	const close = () => {
		voice.stop();
		stopSpeaking();
		onClose();
	};

	const userMeta = (message: Extract<Message, { role: "user" }>) =>
		[
			message.voice && text.saidByVoice,
			message.language &&
				(message.voice || message.language !== browserLanguage()) &&
				text.detected(guide.languageNames[message.language]),
		]
			.filter(Boolean)
			.join(" · ");

	const empty = messages.length === 0;
	const voiceReady = voice.canListen && online;

	return (
		<section
			className="q-card q-card--raised guide-panel"
			aria-labelledby={titleId}
			lang={language === "es" ? "es" : "en"}
		>
			<div className="q-card__head guide-panel__head">
				<div className="guide-panel__title">
					<GuideAvatar />
					<div className="guide-panel__heading">
						<div className="guide-panel__eyebrow">
							<p className="q-eyebrow">{text.eyebrow}</p>
							{!online && (
								<span className="q-badge q-badge--neutral guide-panel__offline">
									<WifiOff size={14} strokeWidth={1.75} aria-hidden="true" />
									{text.offline}
								</span>
							)}
						</div>
						<h2 className="q-h2" id={titleId}>
							{text.title}
						</h2>
					</div>
				</div>
				<div className="guide-panel__actions">
					{voice.canSpeak && (
						<button
							type="button"
							className="q-btn q-btn--ghost q-btn--icon"
							aria-label={text.readAloud}
							aria-pressed={voice.readAloud}
							onClick={() => voice.setReadAloud(!voice.readAloud)}
						>
							{voice.readAloud ? (
								<Volume2 size={20} strokeWidth={1.75} aria-hidden="true" />
							) : (
								<VolumeX size={20} strokeWidth={1.75} aria-hidden="true" />
							)}
						</button>
					)}
					<button
						type="button"
						className="q-btn q-btn--ghost q-btn--icon"
						aria-label={text.close}
						onClick={close}
					>
						<X size={20} strokeWidth={1.75} aria-hidden="true" />
					</button>
				</div>
			</div>

			<div className="guide-panel__log" aria-live="polite">
				{showReferenceTag && (
					<span className="q-sim-tag guide-panel__sim">
						{text.referenceData}
					</span>
				)}
				{empty && (
					<div className="guide-panel__empty">
						{online ? (
							<>
								<div className="q-msg q-msg--ai">
									<GuideAvatar />
									<div className="q-msg__col">
										<span className="q-msg__who">{text.guide}</span>
										<div className="q-bubble">{text.greeting}</div>
									</div>
								</div>
								<GuideChatIllustration className="guide-panel__illus" />
							</>
						) : (
							<>
								<GuideOfflineIllustration className="guide-panel__illus guide-panel__illus--sm" />
								<span className="q-badge q-badge--neutral">
									{text.savedAnswers}
								</span>
								<div className="q-msg q-msg--ai">
									<GuideAvatar />
									<div className="q-msg__col">
										<span className="q-msg__who">{text.guide}</span>
										<div className="q-bubble">{text.offlineIntro}</div>
									</div>
								</div>
							</>
						)}
						<p className="q-eyebrow">{text.tryThis}</p>
						<Suggestions
							text={text}
							disabled={thinking}
							wrap
							onAsk={(question) => ask(question)}
						/>
					</div>
				)}

				{messages.map((message) => {
					if (message.role === "user") {
						const meta = userMeta(message);
						return (
							<div key={message.id} className="q-msg q-msg--user">
								<div className="q-msg__col">
									<div className="q-bubble" lang={message.language}>
										{message.text}
									</div>
									{meta && <span className="q-msg__meta">{meta}</span>}
								</div>
							</div>
						);
					}
					if (message.role === "state") {
						return (
							<StateCard
								key={message.id}
								kind={message.kind}
								text={text}
								onRetry={
									message.kind === "error" && message.question
										? () => retry(message.id, message.question ?? "")
										: undefined
								}
							/>
						);
					}
					const { answer } = message;
					return (
						<div key={message.id} className="q-msg q-msg--ai">
							<GuideAvatar />
							<div className="q-msg__col">
								<span className="q-msg__who">{text.guide}</span>
								{message.origin === "saved" && (
									<span className="q-badge q-badge--neutral guide-panel__saved">
										{text.savedAnswer}
									</span>
								)}
								<div className="q-bubble" lang={message.language}>
									{message.origin === "slang" ? (
										message.text
									) : (
										<GlossedText
											text={message.text}
											language={message.language}
										/>
									)}
								</div>
								{answer?.plan && (
									<TripCard
										plan={answer.plan}
										language={answer.language}
										onShowOnMap={() => {
											if (answer.destination) onShowOnMap(answer.destination);
										}}
										onReport={() => setReportingId(message.id)}
									/>
								)}
								{answer?.plan && reportingId === message.id && (
									<ReportForm
										plan={answer.plan}
										language={answer.language}
										onClose={() => setReportingId(null)}
										onReportSaved={onReportSaved}
									/>
								)}
								{message.origin === "slang" && (
									<span className="q-msg__meta">{text.sourceSlang}</span>
								)}
								{!answer?.plan && message.question && online && (
									<AskQuillartButton
										prompt={message.question}
										label={text.openAssistant}
									/>
								)}
							</div>
						</div>
					);
				})}

				{micProblem && !voice.listening && (
					<StateCard kind={micProblem} text={text} />
				)}
				{thinking && (
					<p className="q-thinking guide-panel__thinking" role="status">
						<span
							className="q-star q-star--think guide-panel__think"
							aria-hidden="true"
						/>
						{text.thinking}
						<span className="q-thinking__dots" aria-hidden="true">
							<i />
							<i />
							<i />
						</span>
					</p>
				)}
				<div ref={endRef} />
			</div>

			<div className="guide-panel__foot">
				{!empty && !voice.listening && (
					<Suggestions
						text={text}
						disabled={thinking}
						wrap={false}
						onAsk={(question) => ask(question)}
					/>
				)}
				{voice.canListen && (
					<div className="guide-voice">
						<button
							type="button"
							className={`q-btn q-btn--primary guide-voice__mic${voice.listening ? " guide-voice__mic--live" : ""}`}
							aria-pressed={voice.listening}
							aria-label={voice.listening ? text.stopTalking : text.talk}
							disabled={!voiceReady || thinking}
							onClick={voice.listening ? voice.stop : voice.start}
						>
							{voice.listening ? (
								<Square size={22} strokeWidth={1.75} aria-hidden="true" />
							) : (
								<Mic size={28} strokeWidth={1.75} aria-hidden="true" />
							)}
						</button>
						<p className="q-thinking guide-voice__status" role="status">
							{voice.listening && (
								<span
									className="q-star q-star--think guide-panel__think"
									aria-hidden="true"
								/>
							)}
							<span>
								{voice.listening
									? voice.interim || text.listening
									: online
										? text.tapToTalk
										: text.voiceOffline}
							</span>
						</p>
					</div>
				)}
				<form
					className="q-prompt"
					onSubmit={(event) => {
						event.preventDefault();
						ask(draft);
					}}
				>
					<label htmlFor={inputId} className="q-sr">
						{text.typeLabel}
					</label>
					<input
						ref={inputRef}
						id={inputId}
						type="text"
						placeholder={text.typePlaceholder}
						maxLength={500}
						autoComplete="off"
						value={draft}
						onChange={(event) => setDraft(event.target.value)}
					/>
					<button
						type="submit"
						className={`q-btn q-btn--icon ${voice.canListen ? "q-btn--secondary" : "q-btn--primary"}`}
						aria-label={text.send}
						disabled={thinking || draft.trim() === ""}
					>
						<Send size={18} strokeWidth={1.75} aria-hidden="true" />
					</button>
				</form>
			</div>
		</section>
	);
}

const STATE_ILLUSTRATIONS = {
	error: GuideErrorIllustration,
	offline: GuideOfflineIllustration,
	unheard: GuideMicIllustration,
	blocked: GuideMicIllustration,
} as const;

/** Error, offline and mic problems, inline in the conversation. */
function StateCard({
	kind,
	text,
	onRetry,
}: {
	kind: StateKind;
	text: GuideMessages["panel"];
	onRetry?: () => void;
}) {
	const Illustration = STATE_ILLUSTRATIONS[kind];
	const [title, body] =
		kind === "error"
			? [text.errorTitle, text.errorText]
			: kind === "offline"
				? [text.offlineMissTitle, text.offlineMissText]
				: [
						text.micErrorTitle,
						kind === "blocked" ? text.micBlockedText : text.micErrorText,
					];
	return (
		<div
			className={`q-state q-state--${kind === "offline" ? "offline" : "error"} guide-panel__state`}
			role="alert"
		>
			<Illustration className="guide-panel__illus guide-panel__illus--sm" />
			<p className="q-state__title">{title}</p>
			<p className="q-state__text">{body}</p>
			{onRetry && (
				<button
					type="button"
					className="q-btn q-btn--secondary q-state__action"
					onClick={onRetry}
				>
					<RotateCcw size={18} strokeWidth={1.75} aria-hidden="true" />
					{text.retry}
				</button>
			)}
		</div>
	);
}
