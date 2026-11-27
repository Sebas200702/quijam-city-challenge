// Quillart AI conversation: messages with the agent that answered, tool
// results as cards, action confirmations and a composer with text and voice.

import {
	AudioLines,
	ExternalLink,
	Map as MapIcon,
	Mic,
	MicOff,
	RotateCcw,
	SendHorizontal,
	Square,
	Volume2,
	VolumeX,
} from "lucide-react";
import {
	type ReactNode,
	type SyntheticEvent,
	useEffect,
	useId,
	useRef,
	useState,
} from "react";
import { AGENT_LABELS } from "../../lib/assistant/assistant-labels";
import type {
	AssistantDisplay,
	AssistantMessage,
	AssistantToolResult,
} from "../../lib/assistant/assistant-types";
import { voiceInput } from "../../lib/guide/live-status";
import { useLanguage, useT } from "../../lib/i18n/use-language";
import { scrollBehavior } from "../../lib/reduced-motion";
import { onDockRequest } from "../agent-dock/dock-control";
import {
	ErrorNote,
	PublishNotice,
	SpotIllustration,
} from "../community/community-ui";
import { EventCard } from "../community/event-card";
import { ThreadCard } from "../community/thread-card";
import { ActionConfirmCard } from "./action-confirm-card";
import { LIVE_VOICE_TEXT } from "./live-voice-text";
import { PlaceResultCard } from "./place-result-card";
import { useAnswerAnnouncement } from "./use-answer-announcement";
import { useAssistant } from "./use-assistant";
import { useLiveResume } from "./use-live-resume";
import { useLiveVoice } from "./use-live-voice";
import { speak, useVoiceConduit } from "./voice-conduit";
import "../../styles/life-assistant.css";

const NOTICE_TONES = {
	ok: "bg-[var(--green-soft)] text-[var(--green-text)]",
	warn: "bg-[var(--gold-soft)] text-[var(--gold-text)]",
	error: "bg-[var(--red-soft)] text-[var(--red-text)]",
} as const;

function DisplayView({
	display,
	toolName,
}: {
	display: AssistantDisplay;
	toolName: AssistantToolResult["name"];
}) {
	const t = useT();
	switch (display.kind) {
		case "events":
			return (
				<div className="grid gap-3 lg:grid-cols-2">
					{display.events.map((event) => (
						<EventCard
							key={event.id}
							event={event}
							placeName={
								event.placeId ? display.placeNames[event.placeId] : null
							}
						/>
					))}
				</div>
			);
		case "places":
			return (
				<div className="grid gap-3 sm:grid-cols-2">
					{display.places.map((place) => (
						<PlaceResultCard key={place.id} place={place} />
					))}
				</div>
			);
		case "threads":
			return (
				<div className="grid gap-3">
					{display.threads.map((thread) => (
						<ThreadCard key={thread.id} thread={thread} />
					))}
				</div>
			);
		case "publish":
			return (
				<div className="space-y-2">
					<PublishNotice result={display.result} />
					{display.href && (
						<a className="q-btn q-btn--secondary q-btn--sm" href={display.href}>
							{t.chat.viewPost}
						</a>
					)}
				</div>
			);
		case "link": {
			const external = /^https?:\/\//.test(display.href);
			return (
				<a
					className="q-btn q-btn--secondary min-h-11"
					href={display.href}
					{...(external
						? { target: "_blank", rel: "noopener noreferrer" }
						: {})}
				>
					{display.label}
					{external && <ExternalLink size={16} aria-hidden="true" />}
				</a>
			);
		}
		case "notice":
			// The route is one card with the map link, not a green notice (audit U26).
			if (toolName === "plan_route" && display.tone === "ok") {
				return (
					<div className="q-next-step la-route">
						<p className="q-next-step__eyebrow">
							<span className="q-star" aria-hidden="true" />
							{t.chat.routeEyebrow}
						</p>
						{/* Tool texts and the Guide reply are Spanish only (audit U21). */}
						<p lang="es" className="q-next-step__why whitespace-pre-line">
							{display.text}
						</p>
						<a
							className="q-btn q-btn--secondary q-btn--sm min-h-11 self-start"
							href="/mapa"
						>
							<MapIcon size={16} aria-hidden="true" />
							{t.chat.viewRoute}
						</a>
					</div>
				);
			}
			return (
				<p
					lang="es"
					role="status"
					className={`rounded-[20px_20px_20px_4px] px-4 py-3 text-sm ${NOTICE_TONES[display.tone]}`}
				>
					{display.text}
				</p>
			);
		default:
			return null;
	}
}

export function AiAvatar({ thinking = false }: { thinking?: boolean }) {
	return (
		<span className="q-avatar" aria-hidden="true">
			<span
				className={`q-star ${thinking ? "q-star--think" : ""}`}
				style={{ width: 18, height: 18 }}
			/>
		</span>
	);
}

/**
 * One turn of the log. `onScreen` lists tool calls whose result the screen
 * itself already shows (a filtered list, pins): their cards are not repeated.
 */
export function MessageView({
	message,
	onScreen,
}: {
	message: AssistantMessage;
	onScreen?: ReadonlySet<string>;
}) {
	if (message.role === "user") {
		return (
			<div className="q-msg q-msg--user">
				<div className="q-msg__col">
					<div className="q-bubble whitespace-pre-line break-words">
						{message.text}
					</div>
				</div>
			</div>
		);
	}
	if (message.role === "assistant") {
		if (!message.text.trim()) return null;
		// "Te armo la ruta…" before the route card: the wrap-up after it is the
		// one bubble of a route answer (audit U26).
		if (message.toolCalls.some((call) => call.name === "plan_route"))
			return null;
		return (
			<div className="q-msg q-msg--ai">
				<AiAvatar />
				<div className="q-msg__col">
					<span className="q-msg__who">{AGENT_LABELS[message.agent]}</span>
					<div className="q-bubble whitespace-pre-line break-words">
						{message.text}
					</div>
				</div>
			</div>
		);
	}
	const shown = message.results.filter(
		(result) => result.display && !onScreen?.has(result.callId),
	);
	if (shown.length === 0) return null;
	return (
		<div className="space-y-3 pl-10">
			{shown.map((result) =>
				result.display ? (
					<DisplayView
						key={result.callId}
						display={result.display}
						toolName={result.name}
					/>
				) : null,
			)}
		</div>
	);
}

interface AssistantChatProps {
	greeting: string;
	intro: string;
	/** Chips shown while the conversation is empty, one per agent. */
	starters: string[];
	/** Shown under the composer while the conversation is empty. */
	emptyState?: ReactNode;
}

export function AssistantChat({
	greeting,
	intro,
	starters,
	emptyState,
}: AssistantChatProps) {
	const assistant = useAssistant();
	const t = useT();
	const {
		messages,
		draft: streaming,
		pending,
		loading,
		error,
		suggestions,
		signedIn,
		sessionLoading,
		send,
	} = assistant;
	const announcement = useAnswerAnnouncement({
		messages,
		loading,
		pendingCount: pending.length,
		stopped: assistant.stopped,
	});
	const waitHintId = useId();
	const [draft, setDraft] = useState("");
	const voice = useVoiceConduit((text) => void send(text));
	const live = useLiveVoice(assistant);
	// /inicio takes part in Live resume like the dock does.
	useLiveResume(live);
	const liveText = LIVE_VOICE_TEXT[useLanguage()];
	const input = voiceInput(live.status, voice.canListen);
	const inputId = useId();
	const endRef = useRef<HTMLDivElement>(null);
	const spokenCount = useRef<number | null>(null);
	const askedFromUrl = useRef(false);
	const empty = messages.length === 0 && !loading;

	// `?q=` starts the conversation with a question, then leaves a clean URL.
	useEffect(() => {
		if (sessionLoading || askedFromUrl.current) return;
		askedFromUrl.current = true;
		const params = new URLSearchParams(window.location.search);
		const question = params.get("q");
		if (!question) return;
		params.delete("q");
		const rest = params.toString();
		window.history.replaceState(
			null,
			"",
			`${window.location.pathname}${rest ? `?${rest}` : ""}${window.location.hash}`,
		);
		void send(question);
	}, [sessionLoading, send]);

	// /inicio is the dock opened full screen: "Pregúntale a Quillart" buttons land here.
	useEffect(
		() =>
			onDockRequest(({ ask }) => {
				if (ask) void send(ask);
			}),
		[send],
	);

	// Read new answers aloud when the person turned it on.
	useEffect(() => {
		if (spokenCount.current === null) {
			spokenCount.current = messages.length;
			return;
		}
		const fresh = messages.slice(spokenCount.current);
		spokenCount.current = messages.length;
		// A restored conversation arrives all at once: do not read it again.
		// Live speaks with its own voice.
		if (!voice.readAloud || live.active || fresh.length > 3) return;
		const text = fresh
			.filter((message) => message.role === "assistant")
			.map((message) => message.text)
			.join(" ");
		if (text.trim()) speak(text);
	}, [messages, voice.readAloud, live.active]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: scroll when the log grows.
	useEffect(() => {
		if (messages.length === 0) return;
		endRef.current?.scrollIntoView({
			block: "end",
			behavior: scrollBehavior(),
		});
	}, [messages.length, pending.length, loading, streaming?.text]);

	const submit = (event: SyntheticEvent<HTMLFormElement>) => {
		event.preventDefault();
		// A confirmed action is running: keep the draft until it finishes.
		if (!draft.trim() || loading || assistant.actionRunning()) return;
		if (live.status === "live") {
			// A new message means "not now" for the action still waiting.
			for (const action of pending) void assistant.cancel(action.call.id);
			if (live.sendText(draft)) {
				setDraft("");
				return;
			}
		}
		void send(draft);
		setDraft("");
	};

	const toggleLive = () => {
		if (live.active) {
			live.stop();
			return;
		}
		voice.stop();
		void live.start();
	};

	const startOver = () => {
		live.stop();
		assistant.reset();
	};

	const liveNote =
		live.status === "connecting"
			? liveText.connecting
			: live.status === "live"
				? liveText.live
				: null;

	const chips = empty ? starters : suggestions;

	const liveStatus =
		live.status === "fallback" ? (
			<ErrorNote message={liveText.fallback} />
		) : liveNote ? (
			<p className="q-sm q-muted" role="status">
				{liveNote}
			</p>
		) : null;

	const composer = (
		<form onSubmit={submit} className={`q-prompt ${empty ? "lg:py-1.5" : ""}`}>
			<label htmlFor={inputId} className="q-sr">
				{t.chat.composerLabel}
			</label>
			<input
				id={inputId}
				value={voice.listening ? voice.interim : draft}
				onChange={(event) => setDraft(event.target.value)}
				readOnly={voice.listening}
				placeholder={voice.listening ? t.chat.listening : t.chat.placeholder}
				autoComplete="off"
				enterKeyHint="send"
				maxLength={1000}
				aria-describedby={loading ? waitHintId : undefined}
			/>
			{input === "speech" && (
				<button
					type="button"
					className={`q-btn q-btn--icon ${voice.listening ? "q-btn--alert" : "q-btn--secondary"}`}
					onClick={voice.listening ? voice.stop : voice.start}
					aria-pressed={voice.listening}
					disabled={loading}
				>
					{voice.listening ? (
						<MicOff size={20} aria-hidden="true" />
					) : (
						<Mic size={20} aria-hidden="true" />
					)}
					<span className="q-sr">
						{voice.listening ? t.chat.stopListening : t.chat.talk}
					</span>
				</button>
			)}
			{loading ? (
				// U20: the answer can be stopped; the text being typed is kept.
				<button
					type="button"
					className="q-btn q-btn--secondary q-btn--icon"
					onClick={assistant.stop}
				>
					<Square size={18} aria-hidden="true" />
					<span className="q-sr">{t.dock.stop}</span>
				</button>
			) : (
				<button
					type="submit"
					className="q-btn q-btn--primary q-btn--icon"
					disabled={voice.listening || !draft.trim()}
				>
					<SendHorizontal size={20} aria-hidden="true" />
					<span className="q-sr">{t.chat.send}</span>
				</button>
			)}
		</form>
	);
	const waitHint = loading ? (
		<p id={waitHintId} className="q-sm q-muted">
			{t.dock.waitForAnswer}
		</p>
	) : null;

	return (
		<section
			className="la-chat mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4"
			aria-label="Quillart AI"
		>
			<div className="flex flex-wrap items-center gap-2">
				<span className="flex-1">
					<span className="l-eyebrow">
						<span className="q-star" aria-hidden="true" />
						Quillart AI
					</span>
				</span>
				{voice.canSpeak && (
					<button
						type="button"
						className="q-btn q-btn--ghost q-btn--sm min-h-11"
						onClick={() => voice.setReadAloud(!voice.readAloud)}
						aria-pressed={voice.readAloud}
					>
						{voice.readAloud ? (
							<Volume2 size={16} aria-hidden="true" />
						) : (
							<VolumeX size={16} aria-hidden="true" />
						)}
						{t.chat.readAloud}
					</button>
				)}
				<button
					type="button"
					className={`q-btn q-btn--sm min-h-11 ${live.active ? "q-btn--alert" : "q-btn--ghost"}`}
					onClick={toggleLive}
					aria-pressed={live.active}
				>
					<AudioLines size={16} aria-hidden="true" />
					{live.active ? liveText.stop : liveText.start}
				</button>
				{!empty && (
					<button
						type="button"
						className="q-btn q-btn--ghost q-btn--sm min-h-11"
						onClick={startOver}
						disabled={loading}
					>
						<RotateCcw size={16} aria-hidden="true" />
						{t.chat.newConversation}
					</button>
				)}
			</div>

			{empty ? (
				<div className="flex flex-col gap-4 lg:gap-6">
					<div className="la-hero l-rise">
						<span
							className="l-geo l-geo--half l-geo--green bottom-0 left-8"
							aria-hidden="true"
						/>
						<span
							className="l-geo l-geo--ring -right-3 -bottom-3"
							aria-hidden="true"
						/>
						<span
							className="l-geo l-geo--diamond l-geo--gold -top-2 left-[46%]"
							aria-hidden="true"
						/>
						<span
							className="l-geo l-geo--plus l-geo--ink top-6 right-[272px] max-lg:hidden"
							aria-hidden="true"
						/>
						<div className="la-hero__copy">
							<h1 className="l-h2">{greeting}</h1>
							<p className="q-p la-hero__lead">{intro}</p>
						</div>
						<span className="la-hero__art">
							<SpotIllustration
								src="/illustrations/voice-assistant.svg"
								className="h-24! shrink-0 lg:h-48!"
							/>
						</span>
					</div>
					<div className="l-ask la-ask l-rise" style={{ ["--i" as string]: 1 }}>
						{composer}
					</div>
					{voice.error && <ErrorNote message={voice.error} />}
					{liveStatus}
					<div
						className="la-chips l-rise q-scroll-fade q-scroll-fade--wrap-lg -mx-4 flex gap-2 overflow-x-auto px-4 pt-1 pb-1 [scrollbar-width:none] lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden"
						style={{ ["--i" as string]: 2 }}
					>
						{chips.map((chip) => (
							<button
								key={chip}
								type="button"
								className="q-chip shrink-0 whitespace-nowrap"
								onClick={() => void send(chip)}
							>
								{chip}
							</button>
						))}
					</div>
					{emptyState}
				</div>
			) : (
				<>
					{/* Not a live region (U20): the status line below says what is new. */}
					<div className="flex flex-col gap-4">
						{messages.map((message, index) => (
							<MessageView
								// biome-ignore lint/suspicious/noArrayIndexKey: the log only grows.
								key={index}
								message={message}
								onScreen={assistant.onScreen}
							/>
						))}
						{assistant.resumed && signedIn && (
							<p className="q-sm q-muted pl-10">{t.dock.resumed}</p>
						)}
						{pending.map((action) => (
							<div key={action.call.id} className="pl-10">
								<ActionConfirmCard
									action={action}
									signedIn={signedIn}
									onConfirm={() => void assistant.confirm(action.call.id)}
									onCancel={() => void assistant.cancel(action.call.id)}
								/>
							</div>
						))}
						{streaming && streaming.text !== "" && (
							// Announced once, as a message, when the answer is complete.
							<div aria-hidden="true">
								<MessageView
									message={{
										role: "assistant",
										agent: streaming.agent,
										text: streaming.text,
										toolCalls: [],
									}}
								/>
							</div>
						)}
						{loading && !streaming?.text && (
							<div className="q-msg q-msg--ai">
								<AiAvatar thinking />
								<div className="q-thinking">
									{t.chat.thinking}
									<span className="q-thinking__dots" aria-hidden="true">
										<i />
										<i />
										<i />
									</span>
								</div>
							</div>
						)}
						{error && (
							<div className="space-y-2 pl-10">
								<ErrorNote message={error.message} />
								<button
									type="button"
									className="q-btn q-btn--secondary q-btn--sm min-h-11"
									onClick={error.retry}
								>
									<RotateCcw size={16} aria-hidden="true" />
									{t.chat.retry}
								</button>
							</div>
						)}
						<div ref={endRef} className="scroll-mb-44" />
					</div>
					<div className="sticky bottom-[72px] z-20 mt-auto -mx-4 space-y-2 bg-gradient-to-t from-[var(--bg)] from-70% to-transparent px-4 pt-6 pb-2 lg:bottom-0 lg:mx-0 lg:px-0 lg:pb-6">
						{voice.error && <ErrorNote message={voice.error} />}
						{liveStatus}
						{chips.length > 0 && !loading && (
							// Follow-up suggestions come from the server in Spanish only (audit U21).
							<div
								lang="es"
								className="la-chips q-scroll-fade q-scroll-fade--wrap-lg -mx-4 flex gap-2 overflow-x-auto px-4 pt-1 pb-1 lg:mx-0 lg:flex-wrap lg:px-0"
							>
								{chips.map((chip) => (
									<button
										key={chip}
										type="button"
										className="q-chip shrink-0"
										onClick={() => void send(chip)}
									>
										{chip}
									</button>
								))}
							</div>
						)}
						<div className="l-ask la-ask">{composer}</div>
						{waitHint}
					</div>
				</>
			)}
			<p role="status" className="q-sr">
				{announcement}
			</p>
		</section>
	);
}
