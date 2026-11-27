/**
 * Flat, unDraw-style illustrations for the visitor menu pages.
 * Decorative only (aria-hidden); colours come from tokens through the .il-* classes.
 */

const STAR_PATH =
	"M0,-9 L2.3,-5.6 6.4,-6.4 5.6,-2.3 9,0 5.6,2.3 6.4,6.4 2.3,5.6 0,9 -2.3,5.6 -6.4,6.4 -5.6,2.3 -9,0 -5.6,-2.3 -6.4,-6.4 -2.3,-5.6 Z";

interface IllustrationProps {
	className?: string;
}

/** Open stamp book: a business seal, a green-event seal and an empty slot. */
export function StampBookIllustration({ className }: IllustrationProps) {
	return (
		<svg
			className={`vm-ill ${className ?? ""}`}
			viewBox="0 0 200 120"
			aria-hidden="true"
			focusable="false"
		>
			<ellipse className="il-bg" cx="100" cy="66" rx="92" ry="48" />
			<path
				className="il-green"
				d="M28 30 h68 v76 h-68 Z"
				transform="rotate(-6 62 68)"
			/>
			<path className="il-surface" d="M100 26 h72 v78 h-72 Z" />
			<path className="il-surface" d="M30 26 h72 v78 h-72 Z" />
			<rect className="il-subtle" x="40" y="88" width="50" height="4" rx="2" />
			<rect
				className="il-subtle"
				x="110"
				y="96"
				width="34"
				height="3"
				rx="1.5"
				opacity=".5"
			/>
			<circle className="il-goldsoft" cx="60" cy="56" r="17" />
			<circle
				className="il-line"
				cx="60"
				cy="56"
				r="17"
				style={{ stroke: "var(--gold-text)" }}
			/>
			<path className="il-gold" transform="translate(60 56)" d={STAR_PATH} />
			<circle className="il-greensoft" cx="132" cy="50" r="15" />
			<circle
				className="il-line"
				cx="132"
				cy="50"
				r="15"
				style={{ stroke: "var(--green)" }}
			/>
			<path
				className="il-green"
				d="M126 54 c0-8 6-12 12-12 c0 7 -4 12 -12 12 Z"
			/>
			<circle
				className="il-line"
				cx="150"
				cy="84"
				r="12"
				style={{ stroke: "var(--line-control)", strokeDasharray: "4 4" }}
			/>
			<rect className="il-ink" x="99" y="26" width="2" height="78" />
		</svg>
	);
}

/** Two speech bubbles: "¡Ajá!" and its translation hint. */
export function SlangBubblesIllustration({ className }: IllustrationProps) {
	return (
		<svg
			className={`vm-ill ${className ?? ""}`}
			viewBox="0 0 200 120"
			aria-hidden="true"
			focusable="false"
		>
			<ellipse className="il-bg" cx="100" cy="66" rx="92" ry="48" />
			<path
				className="il-gold"
				d="M30 18 h86 a12 12 0 0 1 12 12 v26 a12 12 0 0 1 -12 12 h-54 l-18 16 v-16 h-14 a12 12 0 0 1 -12 -12 v-26 a12 12 0 0 1 12 -12 Z"
			/>
			<text className="il-text" x="73" y="51" textAnchor="middle" fontSize="22">
				¡Ajá!
			</text>
			<path
				className="il-surface"
				d="M112 62 h62 a10 10 0 0 1 10 10 v18 a10 10 0 0 1 -10 10 h-8 v12 l-14 -12 h-40 a10 10 0 0 1 -10 -10 v-18 a10 10 0 0 1 10 -10 Z"
			/>
			<rect className="il-subtle" x="120" y="74" width="46" height="4" rx="2" />
			<rect
				className="il-subtle"
				x="120"
				y="84"
				width="30"
				height="4"
				rx="2"
				opacity=".55"
			/>
			<path
				className="il-gold"
				transform="translate(170 30) scale(.8)"
				d={STAR_PATH}
			/>
		</svg>
	);
}

/** Magnifier over a folded map: nothing found for the search. */
export function EmptySearchIllustration({ className }: IllustrationProps) {
	return (
		<svg
			className={`vm-ill ${className ?? ""}`}
			viewBox="0 0 200 120"
			aria-hidden="true"
			focusable="false"
		>
			<ellipse className="il-bg" cx="100" cy="66" rx="88" ry="48" />
			<path
				className="il-surface"
				d="M36 40 l40 -12 l40 12 l40 -12 v66 l-40 12 l-40 -12 l-40 12 Z"
			/>
			<path
				className="il-line"
				d="M50 84 c10 -16 24 -6 34 -18"
				style={{ stroke: "var(--ink-subtle)", strokeDasharray: "5 6" }}
			/>
			<circle className="il-goldsoft" cx="112" cy="58" r="22" />
			<circle className="il-line" cx="112" cy="58" r="22" />
			<path className="il-line" d="M128 74 l18 18" style={{ strokeWidth: 6 }} />
			<path
				className="il-gold"
				transform="translate(112 58) scale(.9)"
				d={STAR_PATH}
			/>
		</svg>
	);
}

/** Folded map with a warning dot: something failed to load. */
export function LoadErrorIllustration({ className }: IllustrationProps) {
	return (
		<svg
			className={`vm-ill ${className ?? ""}`}
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
				className="il-line"
				d="M52 80 c10 -18 24 -4 34 -18 s24 -6 34 -16 s16 -4 26 -10"
				style={{ stroke: "var(--ink-subtle)", strokeDasharray: "5 6" }}
			/>
			<circle className="il-red" cx="150" cy="80" r="16" />
			<text
				className="il-onred"
				x="150"
				y="87"
				textAnchor="middle"
				fontSize="20"
			>
				!
			</text>
		</svg>
	);
}
