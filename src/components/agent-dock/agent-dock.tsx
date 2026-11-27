// The agent dock (audit v2, U03, U04, U20 and §6.1): Quillart AI fixed at the
// bottom of every screen (a side panel on wide screens), with the same
// conversation everywhere. It knows what the person is looking at ("viendo
// …"), changes that screen through UI actions (chips + Deshacer, marked in
// gold with the star) and keeps every write behind the confirmation card.
// Collapsed it is a slim bar, so it never hides the content (U10).

import {
	ChevronDown,
	Eye,
	EyeOff,
	Mic,
	MicOff,
	RotateCcw,
	SendHorizontal,
	Square,
	Undo2,
	WifiOff,
} from "lucide-react";
import {
	type KeyboardEvent,
	type SyntheticEvent,
	useEffect,
	useId,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import {
	isScreenShared,
	screenContext,
	setScreenShared,
} from "../../lib/assistant/screen-context-store";
import type {
	ScreenContext,
	ScreenRole,
} from "../../lib/assistant/screen-context-types";
import { type UiChange, uiBus } from "../../lib/assistant/ui-action-bus";
import type { Messages } from "../../lib/i18n/messages";
import { useT } from "../../lib/i18n/use-language";
import { scrollBehavior } from "../../lib/reduced-motion";
import { ErrorNote } from "../community/community-ui";
import { BottomNav } from "../home/bottom-nav";
import type { NavSection } from "../home/nav-sections";
import { useOnline } from "../map/use-route-plan";
import { ActionConfirmCard } from "../assistant/action-confirm-card";
import { AiAvatar, MessageView } from "../assistant/assistant-chat";
import { useAnswerAnnouncement } from "../assistant/use-answer-announcement";
import { useAssistant } from "../assistant/use-assistant";
import { useVoiceConduit } from "../assistant/voice-conduit";
import { onDockRequest } from "./dock-control";
import { useScreenContext } from "./use-screen-context";
import "./agent-dock.css";
import "./agent-marks.css";

type SuggestionKey = keyof Messages["dock"]["suggestions"];

/** Contextual suggestions: the screen first, then the surface. */
export function suggestionKey(screen: ScreenContext): SuggestionKey {
	if (screen.role !== "visitor") return screen.role;
	const byRoute: Record<string, SuggestionKey> = {
		"/agenda": "agenda",
		"/agenda/[id]": "event",
		"/agenda/nuevo": "eventForm",
		"/lugares": "places",
		"/lugares/[slug]": "place",
		"/foro": "forum",
		"/foro/[id]": "thread",
		"/mapa": "map",
		"/reportar": "report",
		"/perfil": "profile",
	};
	return byRoute[screen.route] ?? "home";
}

/** The tab of the section the page belongs to. */
function sectionOf(route: string): NavSection {
	if (route.startsWith("/agenda")) return "agenda";
	if (route.startsWith("/foro")) return "forum";
	if (route.startsWith("/lugares")) return "places";
	if (route.startsWith("/perfil")) return "profile";
	if (route.startsWith("/mapa")) return "map";
	return "home";
}

const PHONE_QUERY = "(max-width: 1023px)";

interface AgentDockProps {
	/** The surface: visitor, vendor, host, city or presenter. */
	role: ScreenRole;
}

export default function AgentDock({ role }: AgentDockProps) {
	const t = useT();
	const assistant = useAssistant();
	const { messages, pending, loading, error, signedIn } = assistant;
	const screen = useScreenContext();
	const online = useOnline();
	const voice = useVoiceConduit((spoken) => void assistant.send(spoken));
	const [open, setOpen] = useState(false);
	const [shared, setShared] = useState(isScreenShared);
	const [text, setText] = useState("");
	const [changes, setChanges] = useState<UiChange[]>([]);
	const [undone, setUndone] = useState(false);
	const rootRef = useRef<HTMLElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const barRef = useRef<HTMLButtonElement>(null);
	const endRef = useRef<HTMLDivElement>(null);
	/** Where the focus goes after the person opens or closes the dock. */
	const focusAfter = useRef<"input" | "bar" | null>(null);
	const panelId = useId();
	const inputId = useId();
	const hintId = useId();
	const announcement = useAnswerAnnouncement({
		messages,
		loading,
		pendingCount: pending.length,
		stopped: assistant.stopped,
	});

	useEffect(() => screenContext.setDefaults({ role }), [role]);

	// What the agent changed on this screen: chips and one "Deshacer".
	useEffect(
		() =>
			uiBus().onChange((next) => {
				setChanges(next);
				setUndone(false);
			}),
		[],
	);

	// "Pregúntale a Quillart" buttons open the dock on the same screen.
	useEffect(
		() =>
			onDockRequest(({ ask }) => {
				setOpen(true);
				if (ask) void assistant.send(ask);
			}),
		[assistant.send],
	);

	// An action waiting for confirmation always shows its card.
	useEffect(() => {
		if (pending.length > 0) setOpen(true);
	}, [pending.length]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: runs after each open or close.
	useEffect(() => {
		const target = focusAfter.current;
		focusAfter.current = null;
		if (target === "input") inputRef.current?.focus();
		if (target === "bar") barRef.current?.focus();
	}, [open]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: scroll when the log grows.
	useEffect(() => {
		if (!open) return;
		endRef.current?.scrollIntoView({
			block: "end",
			behavior: scrollBehavior(),
		});
	}, [open, messages.length, pending.length, loading, changes]);

	// Room for the dock: pages pad their end by its height on phones.
	useLayoutEffect(() => {
		const root = rootRef.current;
		if (!root) return;
		const phone = window.matchMedia(PHONE_QUERY);
		const update = () => {
			const space = phone.matches ? `${Math.ceil(root.offsetHeight)}px` : "0px";
			document.documentElement.style.setProperty("--q-dock-space", space);
		};
		const observer = new ResizeObserver(update);
		observer.observe(root);
		phone.addEventListener("change", update);
		update();
		return () => {
			observer.disconnect();
			phone.removeEventListener("change", update);
			document.documentElement.style.removeProperty("--q-dock-space");
		};
	}, []);

	const expand = () => {
		focusAfter.current = "input";
		setOpen(true);
	};
	const collapse = () => {
		focusAfter.current = "bar";
		setOpen(false);
	};

	const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
		if (event.key === "Escape" && open) {
			event.stopPropagation();
			collapse();
		}
	};

	const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!text.trim() || loading) return;
		// Kept in the box if it could not be sent (U20: never dropped silently).
		if (await assistant.send(text)) setText("");
	};

	const undo = () => {
		for (const change of [...changes].reverse()) change.undo();
		setChanges([]);
		setUndone(true);
	};

	const toggleShared = () => {
		setScreenShared(!shared);
		setShared(!shared);
	};

	const lastAnswer = [...messages]
		.reverse()
		.find((message) => message.role === "assistant" && message.text.trim());
	const slimText =
		lastAnswer?.role === "assistant" ? lastAnswer.text : t.dock.placeholder;
	const suggestions =
		messages.length > 0 && assistant.suggestions.length > 0
			? assistant.suggestions
			: t.dock.suggestions[suggestionKey(screen)];
	const placeholder =
		role === "vendor" || role === "city" || role === "presenter"
			? t.dock.placeholders[role]
			: t.dock.placeholder;
	const showTabs = role === "visitor";
	const chips = changes.flatMap((change) => change.labels);

	return (
		<section
			ref={rootRef}
			className={`q-dock${open ? " is-open" : ""}${showTabs ? " q-dock--tabs" : ""}`}
			aria-label={t.dock.region}
			onKeyDown={onKeyDown}
		>
			<div className="q-dock__panel">
				{open ? (
					<div id={panelId} className="q-dock__body">
						<div className="q-dock__head">
							<button
								type="button"
								className="q-dock__ctx"
								onClick={toggleShared}
								aria-pressed={shared}
								title={shared ? t.dock.contextOn : t.dock.contextOff}
							>
								<span className="q-star" aria-hidden="true" />
								<span className="q-dock__ctx-text">
									{shared ? (
										<>
											Quillart AI · {t.dock.seeing} <b>{screen.title}</b>
										</>
									) : (
										t.dock.contextOff
									)}
								</span>
								{shared ? (
									<Eye size={16} aria-hidden="true" />
								) : (
									<EyeOff size={16} aria-hidden="true" />
								)}
								<span className="q-sr">
									{shared ? t.dock.contextOn : t.dock.contextOff}
								</span>
							</button>
							{messages.length > 0 && (
								<button
									type="button"
									className="q-dock__icon"
									onClick={assistant.reset}
									disabled={loading}
									title={t.chat.newConversation}
								>
									<RotateCcw size={18} aria-hidden="true" />
									<span className="q-sr">{t.chat.newConversation}</span>
								</button>
							)}
							<button
								type="button"
								className="q-dock__icon"
								onClick={collapse}
								aria-expanded="true"
								aria-controls={panelId}
								title={t.dock.collapse}
							>
								<ChevronDown size={20} aria-hidden="true" />
								<span className="q-sr">{t.dock.collapse}</span>
							</button>
						</div>

						{/* The log is not a live region: the status line says what is new. */}
						<div className="q-dock__log">
							{messages.map((message, index) => (
								<MessageView
									// biome-ignore lint/suspicious/noArrayIndexKey: the log only grows.
									key={index}
									message={message}
									onScreen={assistant.onScreen}
								/>
							))}
							{pending.map((action) => (
								<div
									key={action.call.id}
									className={`q-dock__confirm${action.grounded ? "" : " q-dock__confirm--alert"}`}
								>
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
								<div className="space-y-2">
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
							<div ref={endRef} />
						</div>

						{chips.length > 0 && (
							<div className="q-dock__changes">
								<ul aria-label={t.dock.changesLabel}>
									{chips.map((chip) => (
										<li key={chip} className="q-dock__change">
											<span className="q-star" aria-hidden="true" />
											{chip}
										</li>
									))}
								</ul>
								<button type="button" className="q-dock__undo" onClick={undo}>
									<Undo2 size={16} aria-hidden="true" />
									{t.dock.undo}
								</button>
							</div>
						)}
						{undone && <p className="q-sm q-muted">{t.dock.undone}</p>}

						{!online && (
							<p className="q-dock__offline">
								<WifiOff size={16} aria-hidden="true" />
								{t.offline.assistantOffline}
							</p>
						)}

						{!loading && pending.length === 0 && (
							<div className="q-dock__suggestions">
								{suggestions.map((suggestion) => (
									<button
										key={suggestion}
										type="button"
										className="q-chip shrink-0"
										onClick={() => void assistant.send(suggestion)}
									>
										{suggestion}
									</button>
								))}
							</div>
						)}

						{voice.error && <ErrorNote message={voice.error} />}
						<form className="q-dock__prompt" onSubmit={submit}>
							<label htmlFor={inputId} className="q-sr">
								{t.dock.inputLabel}
							</label>
							<input
								ref={inputRef}
								id={inputId}
								value={voice.listening ? voice.interim : text}
								onChange={(event) => setText(event.target.value)}
								readOnly={voice.listening}
								placeholder={voice.listening ? t.chat.listening : placeholder}
								autoComplete="off"
								enterKeyHint="send"
								maxLength={1000}
								aria-describedby={loading ? hintId : undefined}
							/>
							{voice.canListen && (
								<button
									type="button"
									className="q-dock__icon"
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
								<button
									type="button"
									className="q-dock__send"
									onClick={assistant.stop}
								>
									<Square size={16} aria-hidden="true" />
									<span className="q-sr">{t.dock.stop}</span>
								</button>
							) : (
								// Secondary on purpose: the screen keeps its one primary (R2).
								<button
									type="submit"
									className="q-dock__send"
									disabled={!text.trim() || voice.listening}
								>
									<SendHorizontal size={18} aria-hidden="true" />
									<span className="q-sr">{t.chat.send}</span>
								</button>
							)}
						</form>
						{loading && (
							<p id={hintId} className="q-sm q-muted">
								{t.dock.waitForAnswer}
							</p>
						)}
					</div>
				) : (
					<div className="q-dock__slim">
						<span className="q-dock__avatar" aria-hidden="true">
							<span className={`q-star${loading ? " q-star--think" : ""}`} />
						</span>
						<button
							ref={barRef}
							type="button"
							className="q-dock__bar"
							onClick={expand}
							aria-expanded="false"
						>
							<span className="q-dock__bar-ctx">
								Quillart AI
								{shared && screen.title
									? ` · ${t.dock.seeing} ${screen.title}`
									: ""}
							</span>
							<span className="q-dock__bar-text">
								{loading ? t.chat.thinking : slimText}
							</span>
							<span className="q-sr">{t.dock.expand}</span>
						</button>
						{chips.length > 0 && (
							<button type="button" className="q-dock__undo" onClick={undo}>
								<Undo2 size={16} aria-hidden="true" />
								{t.dock.undo}
							</button>
						)}
					</div>
				)}
				{showTabs && (
					<div className="q-dock__tabs">
						<BottomNav current={sectionOf(screen.route)} />
					</div>
				)}
			</div>
			<p role="status" className="q-sr">
				{announcement}
			</p>
		</section>
	);
}
