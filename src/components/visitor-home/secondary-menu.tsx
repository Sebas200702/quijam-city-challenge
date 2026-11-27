import { Globe, Menu } from "lucide-react";
import { useState } from "react";
import { SECONDARY_MENU_HREFS } from "../../lib/home-content";
import { languageName } from "../../lib/home-content-language";
import { useTheme } from "../home/use-theme";
import { LanguageSheet } from "./language-sheet";
import { useOnlineStatus } from "./use-online-status";
import { useVisitorLanguage } from "./use-visitor-language";
import { VisitorMenuSheet } from "./visitor-menu-sheet";
import "./visitor-sheets.css";

type Sheet = "menu" | "language" | null;

/**
 * Secondary menu for the header (mockups visitante/base-02-menu and base-03-idioma):
 * the language in one tap and a menu with Pasaporte, Jerga, Datos and Idioma.
 * It sits next to the main navigation and never repeats its sections.
 */
export function SecondaryMenu() {
	const { language, detected, copy, choose } = useVisitorLanguage();
	const online = useOnlineStatus();
	const { theme, toggle: toggleTheme } = useTheme();
	const [sheet, setSheet] = useState<Sheet>(null);
	const name = languageName(language);

	return (
		<div className="secondary-menu" lang={language}>
			<button
				type="button"
				className="visitor-chip-btn lab-chip"
				aria-label={copy.changeLanguage(name)}
				aria-haspopup="dialog"
				onClick={() => setSheet("language")}
			>
				<Globe size={18} strokeWidth={1.75} aria-hidden="true" />
				<span aria-hidden="true">{language.toUpperCase()}</span>
			</button>
			<button
				type="button"
				className="q-fab"
				aria-label={copy.openMenu}
				aria-haspopup="dialog"
				aria-expanded={sheet === "menu"}
				onClick={() => setSheet("menu")}
			>
				<Menu size={22} strokeWidth={1.75} aria-hidden="true" />
			</button>
			{sheet === "menu" ? (
				<VisitorMenuSheet
					copy={copy}
					lang={language}
					languageName={name}
					hrefs={SECONDARY_MENU_HREFS}
					online={online}
					onOpenLanguage={() => setSheet("language")}
					theme={theme}
					onToggleTheme={toggleTheme}
					onClose={() => setSheet(null)}
				/>
			) : null}
			{sheet === "language" ? (
				<LanguageSheet
					copy={copy}
					current={language}
					detected={detected}
					online={online}
					onChoose={(next) => {
						choose(next);
						setSheet(null);
					}}
					onClose={() => setSheet(null)}
				/>
			) : null}
		</div>
	);
}
