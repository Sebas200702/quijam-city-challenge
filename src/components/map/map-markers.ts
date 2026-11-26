// QUILLART pins (q-pin) for Leaflet markers. The glyphs are static Lucide-style
// strokes; the label is set with textContent, so data is never parsed as HTML.

import L from "leaflet";
import type { StatusTone } from "../../lib/corridor/corridor-types";

const PIN_CLASS: Record<StatusTone, string> = {
	green: "q-pin--fluid",
	gold: "q-pin--event",
	red: "q-pin--alert",
	neutral: "q-pin--event corridor-pin--muted",
};

export type PinGlyph = "transit" | "star" | "alert" | "water";

const svg = (paths: string) =>
	`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;

const GLYPHS: Record<PinGlyph, string> = {
	// Lucide "arrow-left-right": the QUILLART glyph for flow.
	transit: svg(
		'<path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>',
	),
	star: '<span class="q-star"></span>',
	// Lucide "triangle-alert"
	alert: svg(
		'<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
	),
	// Lucide "droplet"
	water: svg(
		'<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
	),
};

interface PinOptions {
	tone: StatusTone;
	glyph: PinGlyph;
	label: string;
	/** Show the label even when the pin is not selected. */
	labeled?: boolean;
}

export function pinIcon({
	tone,
	glyph,
	label,
	labeled = false,
}: PinOptions): L.DivIcon {
	// Hidden from screen readers: the marker's title already names the pin.
	const pin = document.createElement("span");
	pin.className = `q-pin q-pin--static ${PIN_CLASS[tone]}${labeled ? " corridor-pin--labeled" : ""}`;
	pin.setAttribute("aria-hidden", "true");

	const head = document.createElement("span");
	head.className = "q-pin__head";
	const glyphNode = document.createElement("span");
	glyphNode.className = "q-pin__glyph";
	glyphNode.innerHTML = GLYPHS[glyph];
	head.append(glyphNode);

	const labelNode = document.createElement("span");
	labelNode.className = "q-pin__label";
	labelNode.textContent = label;

	pin.append(head, labelNode);
	return L.divIcon({
		className: "corridor-pin",
		html: pin,
		iconSize: [44, 44],
		iconAnchor: [22, 22],
	});
}

/** Marks a marker as selected (bigger pin, its glow and its label) or clears the mark. */
export function setMarkerSelected(marker: L.Marker, selected: boolean) {
	const pin = marker.getElement()?.querySelector(".q-pin");
	pin?.classList.toggle("is-selected", selected);
	marker.setZIndexOffset(selected ? 1000 : 0);
}
