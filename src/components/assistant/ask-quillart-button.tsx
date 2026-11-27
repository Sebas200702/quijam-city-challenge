import type { MouseEvent } from "react";
import { askHref } from "../../lib/assistant/assistant-labels";
import { useT } from "../../lib/i18n/use-language";
import { openDock } from "../agent-dock/dock-control";

interface AskQuillartButtonProps {
	/** Question that starts the conversation, e.g. "¿Cómo llego a este evento?". */
	prompt: string;
	label?: string;
}

/**
 * Asks Quillart AI from any screen with a ready-made question. It opens the
 * agent dock on the same screen (U03); without a dock it falls back to /inicio.
 */
export function AskQuillartButton({ prompt, label }: AskQuillartButtonProps) {
	const t = useT();
	const ask = (event: MouseEvent<HTMLAnchorElement>) => {
		if (openDock({ ask: prompt })) event.preventDefault();
	};
	return (
		<a
			className="q-btn q-btn--secondary q-btn--sm min-h-11!"
			href={askHref(prompt)}
			onClick={ask}
		>
			<span
				className="q-star"
				style={{ width: 18, height: 18 }}
				aria-hidden="true"
			/>
			{label ?? t.shared.ask.button}
		</a>
	);
}
