import type { NavSection } from "./bottom-nav";
import { QuillartLogo } from "./quillart-logo";
import { TopNav } from "./top-nav";

interface TopBarProps {
	current: NavSection;
	aiHref: string;
}

/** Desktop-only bar for full-screen pages (the map): logo on the left, sections on the right. */
export function TopBar({ current, aiHref }: TopBarProps) {
	return (
		<header className="hidden items-center gap-6 border-b border-[var(--line)] bg-[var(--surface)] px-8 py-2 lg:flex">
			<QuillartLogo />
			<TopNav current={current} aiHref={aiHref} />
		</header>
	);
}
