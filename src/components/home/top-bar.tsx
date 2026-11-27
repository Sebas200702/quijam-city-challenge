import { useT } from "../../lib/i18n/use-language";
import { SecondaryMenu } from "../visitor-home/secondary-menu";
import { type NavSection, sectionLabel } from "./nav-sections";
import { QuillartLogo } from "./quillart-logo";
import { TopNav } from "./top-nav";

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
		<header className="flex items-center gap-3 border-b border-[var(--line)] bg-[var(--surface)] px-3 py-2 lg:gap-6 lg:px-8">
			<QuillartLogo />
			{untabbed && (
				<p className="m-0 min-w-0 truncate border-l border-[var(--line)] pl-3 font-semibold text-[15px] text-[var(--ink)] lg:hidden">
					{sectionLabel(t, current)}
				</p>
			)}
			<TopNav current={current} aiHref={aiHref} />
			<SecondaryMenu />
		</header>
	);
}
