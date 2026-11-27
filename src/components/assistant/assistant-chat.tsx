// Quillart AI conversation: messages with the agent that answered, tool
// results as cards, action confirmations and a composer with text and voice.

import {
	ExternalLink,
	Map as MapIcon,
	Mic,
	MicOff,
	RotateCcw,
	SendHorizontal,
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
import { useT } from "../../lib/i18n/use-language";
import { scrollBehavior } from "../../lib/reduced-motion";
import {
	ErrorNote,
	PublishNotice,
	SpotIllustration,
} from "../community/community-ui";
import { EventCard } from "../community/event-card";
import { ThreadCard } from "../community/thread-card";
import { ActionConfirmCard } from "./action-confirm-card";
import { PlaceResultCard } from "./place-result-card";
import { useAssistant } from "./use-assistant";
import { speak, useVoiceConduit } from "./voice-conduit";

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
			return (
				<div className="space-y-2">
					<p
						role="status"
						className={`rounded-[var(--radius-md)] px-4 py-3 text-sm ${NOTICE_TONES[display.tone]}`}
					>
						{display.text}
					</p>
					{toolName === "plan_route" && (
						<a className="q-btn q-btn--secondary q-btn--sm" href="/mapa">
							<MapIcon size={16} aria-hidden="true" />
							{t.chat.viewRoute}
						</a>
					)}
				</div>
			);
		default:
			return null;
	}
}

function AiAvatar({ thinking = false }: { thinking?: boolean }) {
	return (
		<span className="q-avatar" aria-hidden="true">
			<span
				className={`q-star ${thinking ? "q-star--think" : ""}`}
				style={{ width: 18, height: 18 }}
			/>
		</span>
	);
}

function MessageView({ message }: { message: AssistantMessage }) {
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
	const shown = message.results.filter((result) => result.display);
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
		pending,
		loading,
		error,
		suggestions,
		signedIn,
		sessionLoading,
		send,
	} = assistant;
	const [draft, setDraft] = useState("");
	const voice = useVoiceConduit((text) => void send(text));
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

	// Read new answers aloud when the person turned it on.
	useEffect(() => {
		if (spokenCount.current === null) {
			spokenCount.current = messages.length;
			return;
		}
		const fresh = messages.slice(spokenCount.current);
		spokenCount.current = messages.length;
		// A restored conversation arrives all at once: do not read it again.
		if (!voice.readAloud || fresh.length > 3) return;
		const text = fresh
			.filter((message) => message.role === "assistant")
			.map((message) => message.text)
			.join(" ");
		if (text.trim()) speak(text);
	}, [messages, voice.readAloud]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: scroll when the log grows.
	useEffect(() => {
		if (messages.length === 0) return;
		endRef.current?.scrollIntoView({
			block: "end",
			behavior: scrollBehavior(),
		});
	}, [messages.length, pending.length, loading]);

	const submit = (event: SyntheticEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!draft.trim() || loading) return;
		void send(draft);
		setDraft("");
	};

	const chips = empty ? starters : suggestions;

	const composer = (
		<form
			onSubmit={submit}
			className={`q-prompt shadow-[var(--shadow-card)] ${empty ? "lg:py-1.5" : ""}`}
		>
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
			/>
			{voice.canListen && (
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
			<button
				type="submit"
				className="q-btn q-btn--primary q-btn--icon"
				disabled={loading || voice.listening || !draft.trim()}
			>
				<SendHorizontal size={20} aria-hidden="true" />
				<span className="q-sr">{t.chat.send}</span>
			</button>
		</form>
	);

	return (
		<section
			className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4"
			aria-label="Quillart AI"
		>
			<div className="flex flex-wrap items-center gap-2">
				<span className="q-eyebrow flex-1">Quillart AI</span>
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
				<a
					className="q-btn q-btn--ghost q-btn--sm min-h-11"
					href="/prueba-guia"
				>
					{t.chat.liveVoice}
				</a>
				{!empty && (
					<button
						type="button"
						className="q-btn q-btn--ghost q-btn--sm min-h-11"
						onClick={assistant.reset}
						disabled={loading}
					>
						<RotateCcw size={16} aria-hidden="true" />
						{t.chat.newConversation}
					</button>
				)}
			</div>

			{empty ? (
				<div className="flex flex-col gap-4 lg:gap-6">
					<div className="q-card flex-row! items-center gap-4 overflow-hidden bg-[var(--illus)]! p-5 text-[#0B131E] lg:gap-8 lg:p-8">
						<div className="min-w-0 flex-1">
							<h1 className="q-h1 text-[#0B131E] lg:text-[40px] lg:leading-[44px]">
								{greeting}
							</h1>
							<p className="q-p mt-1 text-[#46566B]">{intro}</p>
						</div>
						<SpotIllustration
							src="/illustrations/voice-assistant.svg"
							className="h-24! shrink-0 lg:h-48!"
						/>
					</div>
					{composer}
					{voice.error && <ErrorNote message={voice.error} />}
					<div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden">
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
					<div className="flex flex-col gap-4" aria-live="polite">
						{messages.map((message, index) => (
							<MessageView
								// biome-ignore lint/suspicious/noArrayIndexKey: the log only grows.
								key={index}
								message={message}
							/>
						))}
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
						{loading && (
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
						{chips.length > 0 && !loading && (
							<div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:px-0">
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
						{composer}
					</div>
				</>
			)}
		</section>
	);
}
