/** Flat report illustration for the empty, error and offline states. Decorative. */

export function ReportIllustration({
	mark,
}: {
	mark: "star" | "error" | "offline";
}) {
	return (
		<div className="q-illus" aria-hidden="true">
			<svg
				viewBox="0 0 180 112"
				width="150"
				height="94"
				focusable="false"
				aria-hidden="true"
			>
				<rect
					x="48"
					y="12"
					width="72"
					height="92"
					rx="8"
					fill="var(--on-red)"
				/>
				<rect
					x="48"
					y="12"
					width="72"
					height="92"
					rx="8"
					fill="none"
					stroke="var(--on-gold)"
					strokeOpacity=".18"
					strokeWidth="2"
				/>
				<rect
					x="60"
					y="28"
					width="40"
					height="6"
					rx="3"
					fill="var(--on-gold)"
				/>
				<rect
					x="60"
					y="44"
					width="48"
					height="4"
					rx="2"
					fill="var(--on-gold)"
					opacity=".25"
				/>
				<rect
					x="60"
					y="54"
					width="44"
					height="4"
					rx="2"
					fill="var(--on-gold)"
					opacity=".25"
				/>
				<rect x="60" y="72" width="8" height="18" rx="2" fill="var(--green)" />
				<rect x="72" y="64" width="8" height="26" rx="2" fill="var(--gold)" />
				<rect x="84" y="78" width="8" height="12" rx="2" fill="var(--red)" />
				{mark === "star" && (
					<polygon
						fill="var(--gold)"
						points="140,14 143.2,26.3 155,22 147.4,32 158,40 145,40 140,52 135,40 122,40 132.6,32 125,22 136.8,26.3"
					/>
				)}
				{mark === "error" && (
					<g>
						<circle cx="140" cy="30" r="18" fill="var(--red)" />
						<rect
							x="137.5"
							y="18"
							width="5"
							height="15"
							rx="2.5"
							fill="var(--on-red)"
						/>
						<circle cx="140" cy="40" r="3" fill="var(--on-red)" />
					</g>
				)}
				{mark === "offline" && (
					<g
						fill="none"
						stroke="var(--on-gold)"
						strokeWidth="4"
						strokeLinecap="round"
					>
						<path d="M124 34 a24 24 0 0 1 32 0" opacity=".35" />
						<path d="M131 42 a13 13 0 0 1 18 0" opacity=".35" />
						<circle cx="140" cy="50" r="2" fill="var(--on-gold)" />
						<path d="M124 22 L156 56" stroke="var(--red)" />
					</g>
				)}
			</svg>
		</div>
	);
}
