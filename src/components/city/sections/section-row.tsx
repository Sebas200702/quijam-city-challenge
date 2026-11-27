import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type SectionRowTone = "neutral" | "alert" | "safe" | "event";

const ICON_TONES: Record<SectionRowTone, string> = {
	neutral: "bg-[var(--surface)] text-[var(--ink-muted)]",
	alert: "bg-[var(--red-soft)] text-[var(--red-text)]",
	safe: "bg-[var(--green-soft)] text-[var(--green-text)]",
	event: "bg-[var(--gold-soft)] text-[var(--gold-text)]",
};

interface SectionRowProps {
	icon: LucideIcon;
	tone?: SectionRowTone;
	title: ReactNode;
	detail?: ReactNode;
	/** Right side: a badge, a countdown or a small action. */
	trailing?: ReactNode;
	children?: ReactNode;
}

/** One line of a section list: tinted icon tile, title, one plain detail line and a status. */
export function SectionRow({
	icon: Icon,
	tone = "neutral",
	title,
	detail,
	trailing,
	children,
}: SectionRowProps) {
	return (
		<div className="flex flex-col gap-3 rounded-[10px_24px_10px_24px] bg-[var(--bg)] px-3 py-2.5 text-[13px] leading-[18px]">
			<div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
				<div className="flex min-w-[12rem] flex-1 items-center gap-3">
					<span
						className={`grid size-10 flex-none place-items-center rounded-full ${ICON_TONES[tone]}`}
						aria-hidden="true"
					>
						<Icon size={20} strokeWidth={1.75} />
					</span>
					<div className="flex min-w-0 flex-col gap-0.5">
						<b className="text-[14px] text-[var(--ink)]">{title}</b>
						{detail && (
							<span className="text-[12px] leading-4 text-[var(--ink-muted)]">
								{detail}
							</span>
						)}
					</div>
				</div>
				{trailing && (
					<div className="ml-auto flex-none text-right">{trailing}</div>
				)}
			</div>
			{children}
		</div>
	);
}
