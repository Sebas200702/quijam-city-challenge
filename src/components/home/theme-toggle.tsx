import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "quillart-theme";

function readCurrentTheme(): Theme {
	return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

/** Switches the page between the light (tourist) and dark theme. */
export function ThemeToggle() {
	const [theme, setTheme] = useState<Theme>("light");

	useEffect(() => {
		setTheme(readCurrentTheme());
	}, []);

	function toggle() {
		const next: Theme = theme === "light" ? "dark" : "light";
		document.documentElement.dataset.theme = next;
		try {
			localStorage.setItem(THEME_STORAGE_KEY, next);
		} catch {
			// Storage can be blocked (private mode); the theme still applies.
		}
		setTheme(next);
	}

	const label =
		theme === "light" ? "Cambiar a tema oscuro" : "Cambiar a tema claro";

	return (
		<button type="button" className="q-fab" aria-label={label} onClick={toggle}>
			{theme === "light" ? (
				<Moon size={20} strokeWidth={1.75} aria-hidden="true" />
			) : (
				<Sun size={20} strokeWidth={1.75} aria-hidden="true" />
			)}
		</button>
	);
}
