import { CalendarDays, MapPin, MessagesSquare, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { useT } from "../../lib/i18n/use-language";
import { APP_HOME_HREF, type NavSection } from "./nav-sections";

export type { NavSection } from "./nav-sections";

interface BottomNavProps {
	current: NavSection;
	/** Unused: Quillart AI is the home tab now. Kept so callers keep compiling. */
	aiHref?: string;
}

/** Mobile tab bar (hidden on large screens, where TopNav takes over). */
export function BottomNav({ current }: BottomNavProps) {
	const t = useT();
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
		<nav
			aria-label={t.nav.sections}
			className="q-bottom-nav sticky bottom-0 z-30 lg:hidden"
		>
			<div className="q-tabs">
				{tab("home", APP_HOME_HREF, t.nav.home, () => (
					<span
						className="q-star"
						style={{ width: 22, height: 22 }}
						aria-hidden="true"
					/>
				))}
				{tab("agenda", "/agenda", t.nav.agenda, (w) => (
					<CalendarDays size={22} strokeWidth={w} aria-hidden="true" />
				))}
				{tab("forum", "/foro", t.nav.forum, (w) => (
					<MessagesSquare size={22} strokeWidth={w} aria-hidden="true" />
				))}
				{tab("places", "/lugares", t.nav.places, (w) => (
					<MapPin size={22} strokeWidth={w} aria-hidden="true" />
				))}
				{tab("profile", "/perfil", t.nav.profile, (w) => (
					<UserRound size={22} strokeWidth={w} aria-hidden="true" />
				))}
			</div>
		</nav>
	);
}
