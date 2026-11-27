/**
 * Flat illustrations for the visitor shell, painted with theme tokens (il-* classes in
 * visitor-sheets.css) so they follow light and dark. Always decorative.
 */

const STAR =
	"M0,-9 L2.3,-5.6 6.4,-6.4 5.6,-2.3 9,0 5.6,2.3 6.4,6.4 2.3,5.6 0,9 -2.3,5.6 -6.4,6.4 -5.6,2.3 -9,0 -5.6,-2.3 -6.4,-6.4 -2.3,-5.6 Z";

/** Malecón at sunset with a palm tree and the QUILLART star: the menu's hero. */
export function MenuIllustration() {
	return (
		<svg
			className="visitor-ill"
			viewBox="0 0 200 120"
			aria-hidden="true"
			focusable="false"
		>
			<ellipse className="il-bg" cx="100" cy="66" rx="94" ry="48" />
			<circle className="il-gold" cx="150" cy="30" r="14" />
			<path
				className="il-water"
				d="M8 74 c30 -6 60 6 92 0 s62 -6 92 0 v40 h-184 Z"
			/>
			<path
				className="il-wline"
				d="M30 88 c10 -4 20 4 30 0 M110 96 c10 -4 20 4 30 0"
			/>
			<rect
				className="il-goldsoft"
				x="8"
				y="66"
				width="120"
				height="10"
				rx="4"
			/>
			<rect className="il-ink" x="44" y="26" width="4" height="42" rx="2" />
			<path
				className="il-green"
				d="M46 26 c-14 -8 -22 0 -24 4 c8 -4 16 -2 24 -4 Z M46 26 c14 -8 22 0 24 4 c-8 -4 -16 -2 -24 -4 Z M46 26 c-4 -12 2 -18 6 -18 c-2 6 -2 12 -6 18 Z"
			/>
			<circle className="il-ink" cx="90" cy="54" r="5" />
			<rect className="il-green" x="85" y="59" width="10" height="9" rx="3" />
			<path
				className="il-gold"
				transform="translate(110 46) scale(0.8)"
				d={STAR}
			/>
		</svg>
	);
}

/** A globe with two speech bubbles: the language sheet's hero. */
export function LanguageIllustration() {
	return (
		<svg
			className="visitor-ill"
			viewBox="0 0 200 120"
			aria-hidden="true"
			focusable="false"
		>
			<ellipse className="il-bg" cx="100" cy="66" rx="90" ry="48" />
			<circle className="il-green" cx="88" cy="66" r="34" />
			<path
				className="il-greensoft"
				d="M70 44 c10 4 8 14 18 14 s6 12 -2 16 s-12 10 -8 18 c-10 -4 -20 -16 -18 -30 c2 -8 4 -14 10 -18 Z M104 40 c6 6 12 8 14 18 c-6 -2 -12 2 -16 -4 Z"
			/>
			<path
				className="il-surface"
				d="M128 18 h46 a7 7 0 0 1 7 7 v14 a7 7 0 0 1 -7 7 h-30 l-8 7 v-7 h-8 a7 7 0 0 1 -7 -7 v-14 a7 7 0 0 1 7 -7 Z"
			/>
			<path className="il-line" d="M140 32 h22" />
			<path
				className="il-gold"
				d="M130 64 h40 a7 7 0 0 1 7 7 v12 a7 7 0 0 1 -7 7 h-26 l-8 7 v-7 h-6 a7 7 0 0 1 -7 -7 v-12 a7 7 0 0 1 7 -7 Z"
			/>
			<path className="il-line" d="M140 77 h22" />
			<path
				className="il-gold"
				transform="translate(36 30) scale(0.8)"
				d={STAR}
			/>
		</svg>
	);
}

/** A folded map with a broken dashed route and a red warning: map failed to load. */
export function MapErrorIllustration() {
	return (
		<svg
			className="visitor-ill"
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
				className="il-dash"
				d="M52 80 c10 -18 24 -4 34 -18 s24 -6 34 -16 s16 -4 26 -10"
			/>
			<circle className="il-red" cx="150" cy="80" r="16" />
			<rect className="il-onred" x="148" y="70" width="4" height="12" rx="2" />
			<circle className="il-onred" cx="150" cy="88" r="2.4" />
		</svg>
	);
}
