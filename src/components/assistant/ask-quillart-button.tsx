import { askHref } from "../../lib/assistant/assistant-labels";
import { useT } from "../../lib/i18n/use-language";

interface AskQuillartButtonProps {
	/** Question that starts the conversation, e.g. "¿Cómo llego a este evento?". */
	prompt: string;
	label?: string;
}

/** Shortcut from any screen into Quillart AI with a ready-made question. */
export function AskQuillartButton({ prompt, label }: AskQuillartButtonProps) {
	const t = useT();
	return (
		<a
			className="q-btn q-btn--secondary q-btn--sm min-h-11!"
			href={askHref(prompt)}
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
