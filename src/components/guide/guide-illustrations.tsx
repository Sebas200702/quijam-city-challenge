// Flat illustrations for the Guide's states, coloured with QUILLART tokens so
// they follow light and dark themes. All decorative: hidden from screen readers.

const STAR =
	"M0,-9 L2.3,-5.6 6.4,-6.4 5.6,-2.3 9,0 5.6,2.3 6.4,6.4 2.3,5.6 0,9 -2.3,5.6 -6.4,6.4 -5.6,2.3 -9,0 -5.6,-2.3 -6.4,-6.4 -2.3,-5.6 Z";

interface IllustrationProps {
	className?: string;
}

/** Empty conversation: two speech bubbles, the Guide's star in the first. */
export function GuideChatIllustration({ className }: IllustrationProps) {
	return (
		<svg
			className={`guide-ill ${className ?? ""}`}
			viewBox="0 0 200 120"
			aria-hidden="true"
			focusable="false"
		>
			<ellipse className="il-bg" cx="100" cy="66" rx="90" ry="48" />
			<path
				className="il-green"
				d="M40 30 h70 a10 10 0 0 1 10 10 v24 a10 10 0 0 1 -10 10 h-50 l-14 12 v-12 h-6 a10 10 0 0 1 -10 -10 v-24 a10 10 0 0 1 10 -10 Z"
			/>
			<path className="il-gold" transform="translate(56 52)" d={STAR} />
			<rect
				className="il-surface"
				x="70"
				y="44"
				width="38"
				height="5"
				rx="2.5"
			/>
			<rect
				className="il-surface"
				x="70"
				y="55"
				width="26"
				height="5"
				rx="2.5"
			/>
			<path
				className="il-gold"
				d="M96 64 h66 a10 10 0 0 1 10 10 v14 a10 10 0 0 1 -10 10 h-6 v12 l-14 -12 h-46 a10 10 0 0 1 -10 -10 v-14 a10 10 0 0 1 10 -10 Z"
			/>
			<rect className="il-ink" x="104" y="76" width="44" height="5" rx="2.5" />
			<rect
				className="il-surface"
				x="156"
				y="70"
				width="10"
				height="16"
				rx="5"
			/>
		</svg>
	);
}

/** Offline: a phone with a saved map and a crossed-out signal. */
export function GuideOfflineIllustration({ className }: IllustrationProps) {
	return (
		<svg
			className={`guide-ill ${className ?? ""}`}
			viewBox="0 0 200 120"
			aria-hidden="true"
			focusable="false"
		>
			<ellipse className="il-bg" cx="100" cy="66" rx="88" ry="48" />
			<rect className="il-ink" x="66" y="14" width="52" height="92" rx="12" />
			<rect
				className="il-surface"
				x="71"
				y="22"
				width="42"
				height="76"
				rx="6"
			/>
			<path
				className="il-goldsoft"
				d="M71 50 l14 -8 l14 8 l14 -8 v40 l-14 8 l-14 -8 l-14 8 Z"
			/>
			<path
				className="il-line il-line--gold"
				d="M78 70 c6 -10 14 4 22 -6 s8 -6 10 -4"
			/>
			<circle className="il-surface il-ring" cx="136" cy="40" r="18" />
			<path
				className="il-line il-line--muted"
				d="M127 40 a12 12 0 0 1 18 0 M131 45 a6 6 0 0 1 10 0 M126 31 l20 20"
			/>
		</svg>
	);
}

/** The Guide could not answer: a folded map with a red warning. */
export function GuideErrorIllustration({ className }: IllustrationProps) {
	return (
		<svg
			className={`guide-ill ${className ?? ""}`}
			viewBox="0 0 200 120"
			aria-hidden="true"
			focusable="false"
		>
			<ellipse className="il-bg" cx="100" cy="66" rx="88" ry="48" />
			<path
				className="il-surface"
				d="M40 34 l40 -12 l40 12 l40 -12 v74 l-40 12 l-40 -12 l-40 12 Z"
			/>
			<path className="il-goldsoft" d="M80 22 v74 l40 12 v-74 Z" />
			<path
				className="il-line il-line--dashed"
				d="M52 80 c10 -18 24 -4 34 -18 s24 -6 34 -16 s16 -4 26 -10"
			/>
			<circle className="il-red" cx="150" cy="80" r="16" />
			<rect className="il-onred" x="148" y="70" width="4" height="12" rx="2" />
			<circle className="il-onred" cx="150" cy="88" r="2.4" />
		</svg>
	);
}

/** The mic did not hear anything: a microphone with sound waves and a red mark. */
export function GuideMicIllustration({ className }: IllustrationProps) {
	return (
		<svg
			className={`guide-ill ${className ?? ""}`}
			viewBox="0 0 200 120"
			aria-hidden="true"
			focusable="false"
		>
			<ellipse className="il-bg" cx="100" cy="66" rx="88" ry="48" />
			<rect className="il-green" x="84" y="20" width="32" height="54" rx="16" />
			<rect className="il-surface" x="92" y="34" width="16" height="4" rx="2" />
			<rect className="il-surface" x="92" y="44" width="16" height="4" rx="2" />
			<path
				className="il-line"
				d="M72 58 a28 28 0 0 0 56 0 M100 86 v14 M86 100 h28"
			/>
			<path
				className="il-line il-line--gold"
				d="M58 44 c-6 8 -6 20 0 28 M46 38 c-10 12 -10 28 0 40"
			/>
			<circle className="il-red" cx="146" cy="40" r="15" />
			<path
				className="il-line il-line--onred"
				d="M140 34 l12 12 M152 34 l-12 12"
			/>
		</svg>
	);
}
