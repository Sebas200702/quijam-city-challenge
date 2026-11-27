// Flat, token-coloured illustrations for the city dashboard states. Decorative only.

interface IllustrationProps {
	width?: number;
	height?: number;
}

const STAR_POINTS =
	"138.0,18.0 139.6,24.1 145.1,20.9 141.9,26.4 148.0,28.0 141.9,29.6 145.1,35.1 139.6,31.9 138.0,38.0 136.4,31.9 130.9,35.1 134.1,29.6 128.0,28.0 134.1,26.4 130.9,20.9 136.4,24.1";

/** Quiet waterfront with the sun and a star: nothing pending, nothing counted yet. */
export function CalmCorridorIllustration({
	width = 150,
	height = 94,
}: IllustrationProps) {
	return (
		<div className="q-illus cs-illus" aria-hidden="true">
			<svg
				viewBox="0 0 180 112"
				width={width}
				height={height}
				focusable="false"
				aria-hidden="true"
			>
				<circle className="il-gold" cx="44" cy="30" r="15" />
				<path
					className="il-water"
					d="M0 72 Q22 64 45 72 T90 72 T135 72 T180 72 V112 H0 Z"
				/>
				<path
					className="il-st"
					d="M8 66 H172 M14 50 H166 M24 66 V50 M62 66 V50 M100 66 V50 M138 66 V50"
				/>
				<path
					className="il-st"
					d="M18 88 Q30 82 42 88 M120 96 Q132 90 144 96"
					opacity=".6"
				/>
				<polygon className="il-gold" points={STAR_POINTS} />
			</svg>
		</div>
	);
}

/** Folded map with a warning badge: the corridor data could not be read. */
export function MapErrorIllustration({
	width = 150,
	height = 94,
}: IllustrationProps) {
	return (
		<div className="q-illus cs-illus" aria-hidden="true">
			<svg
				viewBox="0 0 180 112"
				width={width}
				height={height}
				focusable="false"
				aria-hidden="true"
			>
				<path
					className="il-white"
					d="M28 30 L64 18 L98 30 L134 18 V86 L98 98 L64 86 L28 98 Z"
				/>
				<path
					className="il-case"
					d="M44 82 L64 62 L86 70 L112 44"
					strokeDasharray="2 10"
				/>
				<path
					className="il-st"
					d="M28 30 L64 18 L98 30 L134 18 V86 L98 98 L64 86 L28 98 Z M64 18 V86 M98 30 V98"
				/>
				<circle className="il-red" cx="138" cy="28" r="18" />
				<rect
					className="il-white"
					x="135.5"
					y="16"
					width="5"
					height="15"
					rx="2.5"
				/>
				<circle className="il-white" cx="138" cy="38" r="3" />
			</svg>
		</div>
	);
}

/** Antenna with a slash: the live channel dropped. */
export function OfflineIllustration({
	width = 96,
	height = 60,
}: IllustrationProps) {
	return (
		<div className="q-illus cs-illus" aria-hidden="true">
			<svg
				viewBox="0 0 180 112"
				width={width}
				height={height}
				focusable="false"
				aria-hidden="true"
			>
				<path
					className="il-st"
					d="M90 40 L72 100 M90 40 L108 100 M78 80 H102 M82 66 H98"
				/>
				<circle className="il-gold" cx="90" cy="36" r="8" />
				<path
					className="il-st"
					d="M68 18 A30 30 0 0 0 68 54 M112 18 A30 30 0 0 1 112 54 M56 8 A46 46 0 0 0 56 64 M124 8 A46 46 0 0 1 124 64"
					opacity=".5"
				/>
				<path className="il-slash" d="M54 12 L126 84" />
				<path className="il-water" d="M0 100 H180 V112 H0 Z" />
			</svg>
		</div>
	);
}
