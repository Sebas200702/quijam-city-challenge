import type { ReactNode } from "react";
import { useT } from "../../lib/i18n/use-language";
import { BottomNav } from "../home/bottom-nav";
import type { NavSection } from "../home/nav-sections";
import { EventNotifier } from "../notices/event-notifier";
import { FloodNotifier } from "../notices/flood-notifier";
import { useStore } from "./use-community";

interface CommunityShellProps {
	current: NavSection;
	children: ReactNode;
	/** Quillart AI entry point; same value as homeContent.aiHref. */
	aiHref?: string;
}

/**
 * Page frame for the community screens: content column and tab bar.
 * The header and footer are rendered by the page (SiteHeader / SiteFooter).
 */
export function CommunityShell({
	current,
	children,
	aiHref = "/inicio",
}: CommunityShellProps) {
	const store = useStore();
	const t = useT();
	return (
		<div className="mx-auto flex min-h-[calc(100dvh-3px-var(--q-dock-space,0px))] w-full max-w-md flex-col lg:max-w-6xl">
			{store.mode === "device" && (
				<p className="q-sm q-muted mx-4 mt-3 rounded-[var(--radius-md)] bg-[var(--gold-soft)] px-4 py-2 text-[var(--gold-text)] lg:mx-8">
					{t.shared.ui.deviceMode}
				</p>
			)}
			<main className="flex flex-1 flex-col gap-5 px-4 pt-4 pb-8 lg:gap-8 lg:px-8 lg:pt-8 lg:pb-16">
				{children}
			</main>
			<BottomNav current={current} aiHref={aiHref} />
			<FloodNotifier />
			<EventNotifier />
		</div>
	);
}
