// The app sections, shared by the mobile tab bar and the desktop navigation.
// Quillart AI is the home: the conversation at /inicio is the entry point.

import type { Messages } from "../../lib/i18n/messages";

export type NavSection =
	| "home"
	| "agenda"
	| "forum"
	| "places"
	| "map"
	/** Kept for compatibility; Quillart AI now lives in "home". */
	| "ai"
	| "profile";

export const APP_HOME_HREF = "/inicio";

export interface NavLink {
	section: NavSection;
	label: string;
	href: string;
}

/** Label of a section in the chosen language. */
export function sectionLabel(t: Messages, section: NavSection): string {
	switch (section) {
		case "agenda":
			return t.nav.agenda;
		case "forum":
			return t.nav.forum;
		case "places":
			return t.nav.places;
		case "map":
			return t.nav.map;
		case "profile":
			return t.nav.profile;
		default:
			return t.nav.home;
	}
}

/** Desktop order (TopNav adds Perfil). The mobile tab bar is in bottom-nav. */
export function navLinks(_aiHref?: string): NavLink[] {
	return [
		{ section: "home", label: "Quillart", href: APP_HOME_HREF },
		{ section: "agenda", label: "Agenda", href: "/agenda" },
		{ section: "forum", label: "Comunidad", href: "/foro" },
		{ section: "places", label: "Lugares", href: "/lugares" },
		{ section: "map", label: "Mapa", href: "/mapa" },
	];
}
