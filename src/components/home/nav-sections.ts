// The app sections, shared by the mobile tab bar and the desktop navigation.
// Quillart AI is the home: the conversation at /inicio is the entry point.

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
