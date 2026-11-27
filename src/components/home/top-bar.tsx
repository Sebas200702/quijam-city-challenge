import { SecondaryMenu } from "../visitor-home/secondary-menu";
import type { NavSection } from "./nav-sections";
import { QuillartLogo } from "./quillart-logo";
import { TopNav } from "./top-nav";

interface TopBarProps {
	current: NavSection;
	aiHref: string;
}

/** Bar for full-screen pages (the map): logo on the left, sections and the secondary menu on the right, on every width. Mount it with `client:load`. */
export function TopBar({ current, aiHref }: TopBarProps) {
	return (
		<header className="flex items-center gap-3 border-b border-[var(--line)] bg-[var(--surface)] px-3 py-2 lg:gap-6 lg:px-8">
			<QuillartLogo />
			<TopNav current={current} aiHref={aiHref} />
			<SecondaryMenu />
		</header>
	);
}
