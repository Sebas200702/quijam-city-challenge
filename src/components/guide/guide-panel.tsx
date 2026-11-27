import { Send, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { GuideAnswer } from "../../lib/guide/guide-answer";
import { useT } from "../../lib/i18n/use-language";
import type { DestinationKey } from "../../lib/trip/trip-planner";
import "./guide-panel.css";
import { ReportForm } from "./report-form";
import { TripCard } from "./trip-card";

/** Questions for the demo, one per language, so presenters can tap instead of typing. */
const SUGGESTIONS = [
	{ text: "How do I get to the stadium?", lang: "en" },
	{ text: "Comment aller au stade ?", lang: "fr" },
	{ text: "Como chego ao estádio?", lang: "pt" },
	{ text: "¿Cómo llego a Barrio Abajo?", lang: "es" },
];

type Message =
	| { id: number; role: "user"; text: string }
	| {
			id: number;
			role: "ai";
			text: string;
			/** A fixed message of the panel: its text follows the interface language. */
			fixed?: "welcome" | "error";
			answer?: GuideAnswer;
	  };

interface GuidePanelProps {
	onShowOnMap: (destination: DestinationKey) => void;
	onClose: () => void;
}

export function GuidePanel({ onShowOnMap, onClose }: GuidePanelProps) {
	const t = useT();
	const inputId = useId();
	const [messages, setMessages] = useState<Message[]>([
		{
			id: 0,
			role: "ai",
			text: "¡Ajá! Soy el Guía del corredor. Pregúntame en tu idioma. · Hi! Ask me in your language.",
			fixed: "welcome",
		},
	]);
	const [draft, setDraft] = useState("");
	const [thinking, setThinking] = useState(false);
	const [reportingId, setReportingId] = useState<number | null>(null);
	const endRef = useRef<HTMLDivElement>(null);
	const nextId = useRef(1);

	// Keep the latest message in view as the conversation grows.
	// biome-ignore lint/correctness/useExhaustiveDependencies: scroll on every new message or form.
	useEffect(() => {
		endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
	}, [messages, thinking, reportingId]);

	const ask = async (question: string) => {
		const text = question.trim();
		if (!text || thinking) return;
		setDraft("");
		setReportingId(null);
		setMessages((list) => [
			...list,
			{ id: nextId.current++, role: "user", text },
		]);
		setThinking(true);
		try {
			const response = await fetch("/api/guide/ask", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ question: text }),
			});
			if (!response.ok) throw new Error(`status ${response.status}`);
			const answer = (await response.json()) as GuideAnswer;
			setMessages((list) => [
				...list,
				{ id: nextId.current++, role: "ai", text: answer.reply, answer },
			]);
		} catch {
			setMessages((list) => [
				...list,
				{
					id: nextId.current++,
					role: "ai",
					text: "No pude responder ahora. Intenta de nuevo. · I could not answer right now. Please try again.",
					fixed: "error",
				},
			]);
		} finally {
			setThinking(false);
		}
	};

	return (
		<section
			className="q-card q-card--raised guide-panel"
			aria-label={t.map.guide.panel}
		>
			<div className="q-card__head">
				<div className="guide-panel__title">
					<span className="q-avatar" aria-hidden="true">
						<span className="q-star" />
					</span>
					<div>
						<p className="q-eyebrow">Quillart AI</p>
						<h2 className="q-h2">{t.map.guide.panel}</h2>
					</div>
				</div>
				<button
					type="button"
					className="q-btn q-btn--ghost q-btn--icon"
					aria-label={t.map.guide.close}
					onClick={onClose}
				>
					<X size={20} strokeWidth={1.75} aria-hidden="true" />
				</button>
			</div>

			<div className="guide-panel__log" aria-live="polite">
				{messages.map((message) =>
					message.role === "user" ? (
						<div key={message.id} className="q-msg q-msg--user">
							<div className="q-msg__col">
								<div className="q-bubble">{message.text}</div>
							</div>
						</div>
					) : (
						<div key={message.id} className="q-msg q-msg--ai">
							<span className="q-avatar" aria-hidden="true">
								<span className="q-star" />
							</span>
							<div className="q-msg__col">
								<span className="q-msg__who">{t.map.guide.who}</span>
								<div className="q-bubble" lang={message.answer?.language}>
									{message.fixed ? t.map.guide[message.fixed] : message.text}
								</div>
								{message.answer?.plan && (
									<TripCard
										plan={message.answer.plan}
										language={message.answer.language}
										onShowOnMap={() => {
											const destination = message.answer?.destination;
											if (destination) onShowOnMap(destination);
										}}
										onReport={() => setReportingId(message.id)}
									/>
								)}
								{message.answer?.plan && reportingId === message.id && (
									<ReportForm
										plan={message.answer.plan}
										language={message.answer.language}
										onClose={() => setReportingId(null)}
									/>
								)}
								{message.answer && (
									<span className="q-msg__meta">
										{message.answer.source === "gemini"
											? t.map.guide.sourceGemini
											: t.map.guide.sourceOffline}{" "}
										· {t.map.guide.referenceData}
									</span>
								)}
							</div>
						</div>
					),
				)}
				{thinking && (
					<div className="q-thinking">
						<span className="q-star q-star--think" aria-hidden="true" />
						{t.map.guide.thinking}
						<span className="q-thinking__dots" aria-hidden="true">
							<i />
							<i />
							<i />
						</span>
					</div>
				)}
				<div ref={endRef} />
			</div>

			<div className="guide-panel__foot">
				<div className="guide-panel__chips">
					{SUGGESTIONS.map((suggestion) => (
						<button
							key={suggestion.text}
							type="button"
							className="q-chip"
							lang={suggestion.lang}
							disabled={thinking}
							onClick={() => ask(suggestion.text)}
						>
							{suggestion.text}
						</button>
					))}
				</div>
				<form
					className="q-prompt"
					onSubmit={(event) => {
						event.preventDefault();
						ask(draft);
					}}
				>
					<label htmlFor={inputId} className="q-sr">
						{t.map.guide.inputLabel}
					</label>
					<input
						id={inputId}
						type="text"
						placeholder={t.map.guide.placeholder}
						maxLength={500}
						autoComplete="off"
						value={draft}
						onChange={(event) => setDraft(event.target.value)}
					/>
					<button
						type="submit"
						className="q-btn q-btn--primary q-btn--icon"
						disabled={thinking || draft.trim() === ""}
					>
						<Send size={18} strokeWidth={1.75} aria-hidden="true" />
						<span className="q-sr">{t.map.guide.send}</span>
					</button>
				</form>
			</div>
		</section>
	);
}
