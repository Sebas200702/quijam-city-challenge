import { useT } from "../../lib/i18n/use-language";
import { SecondaryMenu } from "../visitor-home/secondary-menu";
import { type NavSection, sectionLabel } from "./nav-sections";
import { QuillartLogo } from "./quillart-logo";
import { TopNav } from "./top-nav";
import "../../styles/life-shell.css";


interface TopBarProps {
	current: NavSection;
	aiHref: string;
}

/** Bar for full-screen pages (the map): logo on the left, sections and the secondary menu on the right, on every width. Mount it with `client:load`. */
export function TopBar({ current, aiHref }: TopBarProps) {
	const t = useT();
	// Phones have no "Mapa" tab: the top bar names the section (U24).
	const untabbed = current === "map";
	return (
		<header className="ls-topbar ls-topbar--bar">
			<QuillartLogo />
			{untabbed && (
				<p className="ls-topbar__section lg:hidden">
					{sectionLabel(t, current)}
				</p>
			)}
			<TopNav current={current} aiHref={aiHref} />
			<SecondaryMenu />
		</header>
	);
}
