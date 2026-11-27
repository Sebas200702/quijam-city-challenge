// Flat, token-coloured illustrations for the map chrome's empty, offline and
// host-pair moments. Decorative only: always aria-hidden.

/** The corridor as a winding gold line with a stop, an arroyo and a business. */
export function CorridorArt({ className }: { className?: string }) {
	return (
		<svg
			aria-hidden="true"
			focusable="false"
			className={className}
			viewBox="0 0 200 120"
		>
			<ellipse cx="100" cy="68" rx="94" ry="46" fill="var(--line)" />
			<path
				d="M22 96 C 56 96 52 52 92 56 S 138 86 176 30"
				fill="none"
				stroke="var(--gold)"
				strokeWidth="7"
				strokeLinecap="round"
			/>
			<path
				d="M22 96 C 56 96 52 52 92 56 S 138 86 176 30"
				fill="none"
				stroke="var(--surface)"
				strokeWidth="1.5"
				strokeDasharray="4 6"
				strokeLinecap="round"
			/>
			<circle cx="60" cy="78" r="13" fill="var(--red)" fillOpacity="0.22" />
			<circle cx="60" cy="78" r="5" fill="var(--red)" />
			<path
				d="M92 22 a11 11 0 0 1 11 11 c0 9 -11 19 -11 19 s-11 -10 -11 -19 a11 11 0 0 1 11 -11 Z"
				fill="var(--green)"
			/>
			<circle cx="92" cy="33" r="4" fill="var(--surface)" />
			<rect x="140" y="52" width="30" height="20" rx="4" fill="var(--gold)" />
			<path d="M136 54 h38 l-4 -9 h-30 Z" fill="var(--gold-text)" />
			<rect x="151" y="60" width="8" height="12" fill="var(--surface)" />
		</svg>
	);
}

/** Two hosts side by side, the host pair that helps at a stop. */
export function HostPairArt({ className }: { className?: string }) {
	return (
		<svg
			aria-hidden="true"
			focusable="false"
			className={className}
			viewBox="0 0 120 96"
		>
			<ellipse cx="60" cy="84" rx="54" ry="10" fill="var(--line)" />
			{/* Older host */}
			<circle cx="38" cy="26" r="11" fill="var(--ink-muted)" />
			<path d="M27 22 a11 11 0 0 1 22 0 Z" fill="var(--surface)" />
			<rect x="26" y="40" width="24" height="34" rx="10" fill="var(--green)" />
			<path
				d="M56 50 v32"
				stroke="var(--gold-text)"
				strokeWidth="3"
				strokeLinecap="round"
			/>
			<path
				d="M50 52 h6"
				stroke="var(--gold-text)"
				strokeWidth="3"
				strokeLinecap="round"
			/>
			{/* Young host */}
			<circle cx="80" cy="24" r="11" fill="var(--ink)" />
			<rect x="68" y="38" width="24" height="38" rx="10" fill="var(--gold)" />
			{/* Speech bubble: ES / EN */}
			<rect x="88" y="2" width="30" height="18" rx="9" fill="var(--surface)" />
			<path d="M94 18 l-4 7 l9 -6 Z" fill="var(--surface)" />
			<circle cx="97" cy="11" r="2.5" fill="var(--green)" />
			<circle cx="103" cy="11" r="2.5" fill="var(--gold)" />
			<circle cx="109" cy="11" r="2.5" fill="var(--red)" />
		</svg>
	);
}

/** A folded map with a no-signal badge: the map works with saved data. */
export function OfflineArt({ className }: { className?: string }) {
	return (
		<svg
			aria-hidden="true"
			focusable="false"
			className={className}
			viewBox="0 0 120 80"
		>
			<path
				d="M14 18 l28 -8 l28 8 l28 -8 v52 l-28 8 l-28 -8 l-28 8 Z"
				fill="var(--surface)"
				stroke="var(--line-control)"
				strokeWidth="2"
			/>
			<path d="M42 10 v52 l28 8 v-52 Z" fill="var(--gold-soft)" />
			<path
				d="M22 52 c8 -12 18 -2 26 -12 s18 -4 26 -12"
				fill="none"
				stroke="var(--gold-text)"
				strokeWidth="2.5"
				strokeDasharray="4 5"
				strokeLinecap="round"
			/>
			<circle
				cx="96"
				cy="56"
				r="15"
				fill="var(--surface-raised)"
				stroke="var(--ink-muted)"
				strokeWidth="2"
			/>
			<path
				d="M88 54 a12 12 0 0 1 16 0 M91.5 58 a7 7 0 0 1 9 0"
				fill="none"
				stroke="var(--ink-muted)"
				strokeWidth="2"
				strokeLinecap="round"
			/>
			<path
				d="M87 47 l18 18"
				stroke="var(--red)"
				strokeWidth="2.5"
				strokeLinecap="round"
			/>
		</svg>
	);
}
