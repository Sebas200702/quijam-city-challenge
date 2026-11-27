import type { ReactNode } from "react";
import { BottomNav } from "../home/bottom-nav";
import { HomeHeader } from "../home/home-header";
import { APP_HOME_HREF } from "../home/nav-sections";

interface MenuShellProps {
	online: boolean;
	children: ReactNode;
}

/**
 * Frame for the secondary-menu pages (pasaporte, jerga): the app header
 * and tab bar, so the pages sit inside the app navigation. None of the tabs is
 * active because these pages live in the secondary menu, not in a tab.
 */
export function MenuShell({ online, children }: MenuShellProps) {
	return (
		<div className="mx-auto flex min-h-[calc(100dvh-3px)] w-full max-w-md flex-col lg:max-w-6xl">
			<div className="px-4 pt-4 lg:px-8 lg:pt-6">
				<HomeHeader current="ai" aiHref={APP_HOME_HREF} />
			</div>
			<main className="flex flex-1 flex-col px-4 pt-4 pb-6 lg:px-8 lg:pt-8 lg:pb-16">
				<div className="vm-page">
					{!online && (
						<span className="q-badge q-badge--neutral self-start">
							Sin conexión
						</span>
					)}
					{children}
				</div>
			</main>
			<BottomNav current="ai" />
		</div>
	);
}
