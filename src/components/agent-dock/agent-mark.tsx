// "Filtrado por Quillart AI · Quitar": marks on the screen what the agent
// changed, in gold with the star, with a way to take it back.

import "./agent-marks.css";

interface AgentMarkProps {
	text: string;
	/** Button to take the change back ("Quitar"), when there is one. */
	actionLabel?: string;
	onAction?: () => void;
}

export function AgentMark({ text, actionLabel, onAction }: AgentMarkProps) {
	return (
		<p className="q-agent-mark">
			<span className="q-star" aria-hidden="true" />
			<span className="q-agent-mark__text">{text}</span>
			{actionLabel && onAction && (
				<button
					type="button"
					className="q-agent-mark__action"
					onClick={onAction}
				>
					{actionLabel}
				</button>
			)}
		</p>
	);
}
