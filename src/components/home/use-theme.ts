import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "quillart-theme";

function readCurrentTheme(): Theme {
	return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

/** The page theme (light for visitors, dark optional), kept on this device. */
export function useTheme() {
	const [theme, setTheme] = useState<Theme>("light");

	useEffect(() => {
		setTheme(readCurrentTheme());
	}, []);

	const toggle = useCallback(() => {
		const next: Theme = readCurrentTheme() === "light" ? "dark" : "light";
		document.documentElement.dataset.theme = next;
		try {
			localStorage.setItem(THEME_STORAGE_KEY, next);
		} catch {
			// Storage can be blocked (private mode); the theme still applies to this visit.
		}
		setTheme(next);
	}, []);

	return { theme, toggle };
}
