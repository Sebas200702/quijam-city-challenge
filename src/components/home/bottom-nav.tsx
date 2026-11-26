import { CalendarDays, House, MessagesSquare, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { APP_HOME_HREF, type NavSection } from "./nav-sections";

export type { NavSection } from "./nav-sections";

interface BottomNavProps {
	current: NavSection;
	aiHref: string;
}

/** Mobile tab bar (hidden on large screens, where TopNav takes over). */
export function BottomNav({ current, aiHref }: BottomNavProps) {
	const tab = (
		section: NavSection,
		href: string,
		label: string,
		icon: (strokeWidth: number) => ReactNode,
	) => {
		const on = current === section;
		return (
			<a
				className={`q-tab${on ? " is-on" : ""}`}
				href={href}
				aria-current={on ? "page" : undefined}
			>
				{icon(on ? 2 : 1.75)}
				{label}
			</a>
		);
	};

	return (
		<nav aria-label="Secciones" className="sticky bottom-0 z-30 lg:hidden">
			<div className="q-tabs">
				{tab("home", APP_HOME_HREF, "Inicio", (w) => (
					<House size={22} strokeWidth={w} aria-hidden="true" />
				))}
				{tab("agenda", "/agenda", "Agenda", (w) => (
					<CalendarDays size={22} strokeWidth={w} aria-hidden="true" />
				))}
				{tab("ai", aiHref, "Quillart AI", () => (
					<span
						className="q-star"
						style={{ width: 22, height: 22 }}
						aria-hidden="true"
					/>
				))}
				{tab("forum", "/foro", "Comunidad", (w) => (
					<MessagesSquare size={22} strokeWidth={w} aria-hidden="true" />
				))}
				{tab("profile", "/perfil", "Perfil", (w) => (
					<UserRound size={22} strokeWidth={w} aria-hidden="true" />
				))}
			</div>
		</nav>
	);
}
