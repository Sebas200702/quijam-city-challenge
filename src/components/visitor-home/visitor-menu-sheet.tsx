import {
	BookOpenCheck,
	Globe,
	type LucideIcon,
	MessagesSquare,
	Moon,
	ShieldCheck,
	Sun,
	WifiOff,
} from "lucide-react";
import { PRIVACY_HREF } from "../../lib/home-content";
import type {
	VisitorMenuItemId,
	VisitorShellCopy,
} from "../../lib/home-content-types";
import { MenuIllustration } from "./visitor-illustrations";
import { VisitorSheet } from "./visitor-sheet";

const ITEMS: { id: VisitorMenuItemId; Icon: LucideIcon; tone: string }[] = [
	{ id: "passport", Icon: BookOpenCheck, tone: "q-tile--gold" },
	{ id: "slang", Icon: MessagesSquare, tone: "q-tile--green" },
	{ id: "data", Icon: ShieldCheck, tone: "visitor-tile--neutral" },
	{ id: "language", Icon: Globe, tone: "visitor-tile--neutral" },
	{ id: "theme", Icon: Moon, tone: "visitor-tile--neutral" },
];

interface VisitorMenuSheetProps {
	copy: VisitorShellCopy;
	lang: string;
	languageName: string;
	hrefs: Record<Exclude<VisitorMenuItemId, "language" | "theme">, string>;
	online: boolean;
	onOpenLanguage: () => void;
	theme: "light" | "dark";
	onToggleTheme: () => void;
	onClose: () => void;
}

/**
 * Secondary menu (mockup visitante/base-02-menu): four options of equal weight and no
 * primary button. Everything that is not the home's one action lives here (rule 2).
 */
export function VisitorMenuSheet({
	copy,
	lang,
	languageName,
	hrefs,
	online,
	onOpenLanguage,
	theme,
	onToggleTheme,
	onClose,
}: VisitorMenuSheetProps) {
	return (
		<VisitorSheet
			title={copy.menuTitle}
			hero={<MenuIllustration />}
			closeLabel={copy.close}
			onClose={onClose}
			lang={lang}
		>
			<nav aria-label={copy.menuTitle}>
				<ul className="visitor-menu">
					{ITEMS.map(({ id, Icon: BaseIcon, tone }) => {
						const { title } = copy.menuItems[id];
						const dark = theme === "dark";
						// The theme icon shows what the tap switches to.
						const Icon = id === "theme" ? (dark ? Sun : Moon) : BaseIcon;
						const hint =
							id === "language"
								? copy.languageHint(languageName)
								: id === "theme"
									? copy.themeHint(dark)
									: copy.menuItems[id].hint;
						const content = (
							<>
								<span className={`q-tile ${tone}`} aria-hidden="true">
									<Icon size={22} strokeWidth={1.75} />
								</span>
								<b>{title}</b>
								<span>{hint}</span>
							</>
						);
						return (
							<li key={id}>
								{id === "language" || id === "theme" ? (
									<button
										type="button"
										className="q-feature visitor-menu__item"
										onClick={id === "language" ? onOpenLanguage : onToggleTheme}
									>
										{content}
									</button>
								) : (
									<a className="q-feature visitor-menu__item" href={hrefs[id]}>
										{content}
									</a>
								)}
							</li>
						);
					})}
				</ul>
			</nav>
			<p className="q-sm visitor-note">
				<a className="q-muted underline" href={PRIVACY_HREF}>
					{copy.privacyLink}
				</a>
			</p>
			{online ? null : (
				<p className="q-sm q-muted visitor-note">
					<WifiOff size={16} strokeWidth={1.75} aria-hidden="true" />
					{copy.menuOfflineNote}
				</p>
			)}
		</VisitorSheet>
	);
}
