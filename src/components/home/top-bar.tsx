import { SecondaryMenu } from "../visitor-home/secondary-menu";
import type { NavSection } from "./nav-sections";
import { QuillartLogo } from "./quillart-logo";
import { TopNav } from "./top-nav";

interface TopBarProps {
	current: NavSection;
	aiHref: string;
	/**
	 * Shows the secondary menu (language + Pasaporte, Jerga, Datos, Idioma). Then the bar
	 * also shows on phones, so mount TopBar with `client:load`. Off by default.
	 */
	menu?: boolean;
}

/** Bar for full-screen pages (the map): logo on the left, sections on the right. Desktop only unless `menu`. */
export function TopBar({ current, aiHref, menu = false }: TopBarProps) {
	return (
		<header
			className={`${menu ? "flex px-3 lg:px-8" : "hidden px-8 lg:flex"} items-center gap-3 border-b border-[var(--line)] bg-[var(--surface)] py-2 lg:gap-6`}
		>
			<QuillartLogo />
			<TopNav current={current} aiHref={aiHref} />
			{menu && <SecondaryMenu />}
		</header>
	);
}
