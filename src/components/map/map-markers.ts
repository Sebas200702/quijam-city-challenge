// QUILLART pins (q-pin) and the "you are here" marker (q-user) for Leaflet.
// Every pin carries a glyph and a word, never colour alone (epic #57, rule 9).
// The glyphs are static Lucide strokes; labels are set with textContent, so
// data is never parsed as HTML.

import L from "leaflet";
import type { StatusTone } from "../../lib/corridor/corridor-types";

const PIN_CLASS: Record<StatusTone, string> = {
	green: "q-pin--fluid",
	gold: "q-pin--event",
	red: "q-pin--alert",
	neutral: "q-pin--event corridor-pin--muted",
};

export type PinGlyph = "transit" | "star" | "alert" | "water" | "store";

const svg = (paths: string, size = 16) =>
	`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;

const GLYPHS: Record<PinGlyph, string> = {
	// Lucide "bus-front": a stop is where you take the Transmetro.
	transit: svg(
		'<path d="M4 6 2 7"/><path d="M10 6h4"/><path d="m22 7-2-1"/><rect width="16" height="16" x="4" y="3" rx="2"/><path d="M4 11h16"/><path d="M8 15h.01"/><path d="M16 15h.01"/><path d="M6 19v2"/><path d="M18 21v-2"/>',
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
	// Lucide "store"
	store: svg(
		'<path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7"/>',
	),
};

// Lucide "accessibility": the user marker in accessible mode.
const ACCESSIBLE_GLYPH = svg(
	'<circle cx="16" cy="4" r="1"/><path d="m18 19 1-7-6 1"/><path d="m5 8 3-3 5.5 3-2.36 3.5"/><path d="M4.24 14.5a5 5 0 0 0 6.88 6"/><path d="M13.76 17.5a5 5 0 0 0-6.88-6"/>',
	16,
);

interface PinOptions {
	tone: StatusTone;
	glyph: PinGlyph;
	label: string;
	/** Status in one word or two ("Alerta activa", "Abierto"); shown under the name. */
	status?: string;
	/** Show the label even when the pin is not selected and the map is far. */
	labeled?: boolean;
}

export function pinIcon({
	tone,
	glyph,
	label,
	status,
	labeled = false,
}: PinOptions): L.DivIcon {
	// Hidden from screen readers: the marker's title already names the pin and its status.
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
	const nameNode = document.createElement("span");
	nameNode.className = "corridor-pin__name";
	nameNode.textContent = label;
	labelNode.append(nameNode);
	if (status) {
		const statusNode = document.createElement("span");
		statusNode.className = `corridor-pin__status corridor-pin__status--${tone}`;
		statusNode.textContent = status;
		labelNode.append(statusNode);
	}

	pin.append(head, labelNode);
	return L.divIcon({
		className: "corridor-pin",
		html: pin,
		iconSize: [44, 44],
		iconAnchor: [22, 22],
	});
}

/** The visitor's position: the QUILLART 8-point star, or the accessibility glyph in accessible mode. */
export function userIcon({
	accessible,
	label,
}: {
	accessible: boolean;
	label: string;
}): L.DivIcon {
	const user = document.createElement("span");
	user.className = "q-user q-user--static";
	user.setAttribute("aria-hidden", "true");

	const pulse = document.createElement("span");
	pulse.className = "q-user__pulse";
	const dot = document.createElement("span");
	dot.className = "q-user__dot";
	dot.innerHTML = accessible
		? ACCESSIBLE_GLYPH
		: '<span class="q-star corridor-user__star"></span>';

	const labelNode = document.createElement("span");
	labelNode.className = "corridor-user__label";
	labelNode.textContent = label;

	user.append(pulse, dot, labelNode);
	return L.divIcon({
		className: "corridor-user",
		html: user,
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
