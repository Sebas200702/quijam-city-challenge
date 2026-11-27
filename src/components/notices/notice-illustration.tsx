import type { ComponentType } from "react";
import type { NoticeKind } from "../../lib/notices/notice-types";

/** Flat, token-coloured scenes for each notice. Always decorative. */

const fill = (token: string) => ({ fill: `var(${token})` });
const stroke = (token: string, width = 3) => ({
	fill: "none",
	stroke: `var(${token})`,
	strokeWidth: width,
	strokeLinecap: "round" as const,
});

function Arroyo() {
	return (
		<>
			<ellipse cx="100" cy="68" rx="94" ry="48" style={fill("--red-soft")} />
			<path
				d="M54 56a18 18 0 0 1 10-33 24 24 0 0 1 44-4 18 18 0 0 1 22 18 14 14 0 0 1-4 19Z"
				style={fill("--surface-raised")}
			/>
			<path
				d="M64 66l-5 10M84 66l-5 10M104 66l-5 10M124 66l-5 10"
				style={stroke("--ink-muted")}
			/>
			<path
				d="M20 96c20-8 40 8 60 0s40-8 60 0 30 4 40 0v14H20Z"
				style={fill("--map-water")}
			/>
			<path
				d="M30 92c10-4 20 4 30 0M120 92c10-4 20 4 30 0"
				style={stroke("--surface-raised", 2.5)}
			/>
			<circle cx="156" cy="62" r="14" style={fill("--red")} />
			<path d="M156 54v9M156 69v.5" style={stroke("--on-red", 3.5)} />
		</>
	);
}

function Host() {
	return (
		<>
			<ellipse cx="100" cy="68" rx="94" ry="48" style={fill("--green-soft")} />
			<path
				d="M58 108V78c0-10 8-16 18-16s18 6 18 16v30Z"
				style={fill("--green")}
			/>
			<circle cx="76" cy="46" r="12" style={fill("--gold-soft")} />
			<path d="M58 36h36M68 30h16" style={stroke("--ink", 2)} />
			<path
				d="M110 108V80c0-9 7-14 16-14s16 5 16 14v28Z"
				style={fill("--gold")}
			/>
			<circle cx="126" cy="52" r="11" style={fill("--gold-soft")} />
			<path d="M115 50c0-10 22-12 22 0-6-4-16-4-22 0Z" style={fill("--ink")} />
			<path
				d="M146 20h28a6 6 0 0 1 6 6v10a6 6 0 0 1-6 6h-18l-8 6v-6h-2a6 6 0 0 1-6-6V26a6 6 0 0 1 6-6Z"
				style={fill("--surface-raised")}
			/>
			<path d="M154 31l5 5 9-9" style={stroke("--green", 3)} />
		</>
	);
}

function Barrio() {
	return (
		<>
			<ellipse cx="100" cy="68" rx="94" ry="48" style={fill("--gold-soft")} />
			<path d="M30 108V66l22-16 22 16v42Z" style={fill("--red")} />
			<path d="M78 108V58l24-18 24 18v50Z" style={fill("--green")} />
			<path d="M130 108V70l20-14 20 14v38Z" style={fill("--gold")} />
			<rect
				x="44"
				y="84"
				width="16"
				height="24"
				rx="3"
				style={fill("--surface-raised")}
			/>
			<rect
				x="94"
				y="80"
				width="16"
				height="28"
				rx="3"
				style={fill("--surface-raised")}
			/>
			<rect
				x="142"
				y="86"
				width="16"
				height="22"
				rx="3"
				style={fill("--surface-raised")}
			/>
			<path d="M14 108h172" style={stroke("--ink-muted", 2.5)} />
			<circle cx="164" cy="30" r="10" style={fill("--gold")} />
		</>
	);
}

function Report() {
	return (
		<>
			<ellipse cx="100" cy="68" rx="94" ry="48" style={fill("--green-soft")} />
			<rect
				x="64"
				y="18"
				width="64"
				height="86"
				rx="8"
				style={fill("--surface-raised")}
			/>
			<path
				d="M78 40h36M78 54h36M78 68h22"
				style={stroke("--line-control", 3)}
			/>
			<circle cx="128" cy="88" r="20" style={fill("--green")} />
			<path d="M119 88l6 6 12-12" style={stroke("--on-green", 4)} />
		</>
	);
}

const SCENES: Record<NoticeKind, ComponentType> = {
	arroyo: Arroyo,
	anfitrion: Host,
	desvio: Barrio,
	reporte: Report,
};

export function NoticeIllustration({ kind }: { kind: NoticeKind }) {
	const Scene = SCENES[kind];
	return (
		<svg viewBox="0 0 200 120" aria-hidden="true" focusable="false">
			<Scene />
		</svg>
	);
}
