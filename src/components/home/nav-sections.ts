// The app sections, shared by the mobile tab bar and the desktop navigation.

export type NavSection =
	| "home"
	| "agenda"
	| "forum"
	| "places"
	| "map"
	| "ai"
	| "profile";

export const APP_HOME_HREF = "/inicio";

export interface NavLink {
	section: NavSection;
	label: string;
	href: string;
}

/** Desktop order. The mobile tab bar shows a subset (see bottom-nav). */
export function navLinks(aiHref: string): NavLink[] {
	return [
		{ section: "home", label: "Inicio", href: APP_HOME_HREF },
		{ section: "agenda", label: "Agenda", href: "/agenda" },
		{ section: "forum", label: "Comunidad", href: "/foro" },
		{ section: "places", label: "Lugares", href: "/lugares" },
		{ section: "map", label: "Mapa", href: "/mapa" },
		{ section: "ai", label: "Quillart AI", href: aiHref },
	];
}
