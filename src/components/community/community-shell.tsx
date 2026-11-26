import type { ReactNode } from "react";
import { BottomNav } from "../home/bottom-nav";
import type { NavSection } from "../home/nav-sections";
import { QuillartLogo } from "../home/quillart-logo";
import { ThemeToggle } from "../home/theme-toggle";
import { TopNav } from "../home/top-nav";
import { useStore } from "./use-community";

interface CommunityShellProps {
	current: NavSection;
	children: ReactNode;
	/** Quillart AI entry point; same value as homeContent.aiHref. */
	aiHref?: string;
}

/** Page frame for the community screens: header, content column and tab bar. */
export function CommunityShell({
	current,
	children,
	aiHref = "/prueba-guia",
}: CommunityShellProps) {
	const store = useStore();
	return (
		<div className="mx-auto flex min-h-[calc(100dvh-3px)] w-full max-w-md flex-col lg:max-w-6xl">
			<header className="flex items-center gap-3 px-4 pt-4 lg:gap-6 lg:px-8 lg:pt-6">
				<a
					href="/inicio"
					className="flex min-w-0 flex-1 no-underline text-inherit"
				>
					<QuillartLogo />
				</a>
				<TopNav current={current} aiHref={aiHref} />
				<ThemeToggle />
			</header>
			{store.mode === "device" && (
				<p className="q-sm q-muted mx-4 mt-3 rounded-[var(--radius-md)] bg-[var(--gold-soft)] px-4 py-2 text-[var(--gold-text)] lg:mx-8">
					Sin conexión con el servidor de la comunidad: lo que publiques se
					guarda en este dispositivo.
				</p>
			)}
			<main className="flex flex-1 flex-col gap-5 px-4 pt-4 pb-24 lg:gap-8 lg:px-8 lg:pt-8 lg:pb-16">
				{children}
			</main>
			<BottomNav current={current} aiHref={aiHref} />
		</div>
	);
}
