import { useCallback, useEffect, useState } from "react";
import {
	applyTheme,
	readTheme,
	THEME_CHANGE_EVENT,
	THEME_STORAGE_KEY,
	type Theme,
} from "../../lib/theme";

export type { Theme };
export { THEME_STORAGE_KEY };

/** The page theme (light for visitors, dark optional), kept on this device. */
export function useTheme() {
	const [theme, setTheme] = useState<Theme>("light");

	// Follows every change, not only this toggle's: Quillart AI (`app.theme`),
	// or the map's own toggle can switch it too.
	useEffect(() => {
		const sync = () => setTheme(readTheme());
		sync();
		const observer = new MutationObserver(sync);
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["data-theme"],
		});
		window.addEventListener(THEME_CHANGE_EVENT, sync);
		return () => {
			observer.disconnect();
			window.removeEventListener(THEME_CHANGE_EVENT, sync);
		};
	}, []);

	const toggle = useCallback(() => {
		const next: Theme = readTheme() === "light" ? "dark" : "light";
		applyTheme(next);
		setTheme(next);
	}, []);

	return { theme, toggle };
}
