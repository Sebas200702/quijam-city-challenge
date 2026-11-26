import { Mic } from "lucide-react";

interface AiPromptLinkProps {
	href: string;
}

/** Pill that invites the visitor to talk to Quillart AI. */
export function AiPromptLink({ href }: AiPromptLinkProps) {
	return (
		<a
			href={href}
			className="flex min-h-14 items-center gap-3 rounded-full bg-[var(--surface)] py-0 pr-2 pl-3 text-[var(--ink-muted)] no-underline shadow-[var(--shadow-card)]"
		>
			<span className="q-avatar" aria-hidden="true">
				<span
					className="q-star q-star--pulse"
					style={{ width: 16, height: 16 }}
				/>
			</span>
			<span className="min-w-0 flex-1">Pregúntale a Quillart AI</span>
			<span
				className="q-tile q-tile--gold"
				style={{ width: 40, height: 40, borderRadius: "50%" }}
				aria-hidden="true"
			>
				<Mic size={18} strokeWidth={1.75} />
			</span>
		</a>
	);
}
