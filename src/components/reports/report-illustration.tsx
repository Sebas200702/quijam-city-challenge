// Flat illustrations for the report confirmation, coloured only with QUILLART
// tokens so they follow light and dark themes. Always decorative.

interface ReportIllustrationProps {
	/** "sent": the city has it. "saved": it waits on this phone. */
	kind: "sent" | "saved";
	className?: string;
}

/** Eight-point Barranquilla star, centred on 0,0. */
const STAR =
	"M0,-9 L2.3,-5.6 6.4,-6.4 5.6,-2.3 9,0 5.6,2.3 6.4,6.4 2.3,5.6 0,9 -2.3,5.6 -6.4,6.4 -5.6,2.3 -9,0 -5.6,-2.3 -6.4,-6.4 -2.3,-5.6 Z";

const SURFACE = "fill-[var(--surface-raised)]";
const SUBTLE = "fill-[var(--ink-subtle)]";
const INK = "fill-[var(--ink)]";
const GOLD = "fill-[var(--gold)]";

export function ReportIllustration({
	kind,
	className = "",
}: ReportIllustrationProps) {
	return (
		<svg
			className={`block h-auto ${className}`}
			viewBox="0 0 200 120"
			aria-hidden="true"
			focusable="false"
		>
			<ellipse
				className="fill-[var(--illus)]"
				cx="100"
				cy="64"
				rx="84"
				ry="50"
			/>
			{kind === "sent" ? (
				<>
					<rect
						className={SURFACE}
						x="66"
						y="18"
						width="62"
						height="86"
						rx="8"
					/>
					<rect className={INK} x="84" y="12" width="26" height="12" rx="4" />
					<rect
						className={SUBTLE}
						x="76"
						y="38"
						width="42"
						height="5"
						rx="2.5"
					/>
					<rect
						className={SUBTLE}
						x="76"
						y="52"
						width="34"
						height="5"
						rx="2.5"
					/>
					<rect className={GOLD} x="76" y="66" width="26" height="5" rx="2.5" />
					<circle className="fill-[var(--green)]" cx="130" cy="88" r="18" />
					<path
						className="fill-none stroke-[var(--surface-raised)]"
						strokeWidth="3"
						strokeLinecap="round"
						strokeLinejoin="round"
						d="M121 88 l6 6 l12 -12"
					/>
					<path
						className={GOLD}
						transform="translate(52 34) scale(0.9)"
						d={STAR}
					/>
				</>
			) : (
				<>
					<rect className={INK} x="74" y="12" width="52" height="96" rx="10" />
					<rect
						className={SURFACE}
						x="79"
						y="22"
						width="42"
						height="74"
						rx="4"
					/>
					<rect
						className={SUBTLE}
						x="86"
						y="34"
						width="28"
						height="5"
						rx="2.5"
					/>
					<rect
						className={SUBTLE}
						x="86"
						y="46"
						width="20"
						height="5"
						rx="2.5"
					/>
					<rect className={GOLD} x="86" y="58" width="24" height="5" rx="2.5" />
					<circle className={GOLD} cx="134" cy="86" r="18" />
					<path
						className="fill-none stroke-[var(--on-gold)]"
						strokeWidth="3"
						strokeLinecap="round"
						strokeLinejoin="round"
						d="M134 76 v10 l7 5"
					/>
					<path
						className={GOLD}
						transform="translate(60 38) scale(0.8)"
						d={STAR}
					/>
				</>
			)}
		</svg>
	);
}
