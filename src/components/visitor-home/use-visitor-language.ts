import { useCallback, useEffect, useState } from "react";
import { VISITOR_SHELL_COPY } from "../../lib/home-content-copy";
import {
	browserLanguages,
	DEFAULT_LANGUAGE,
	detectLanguage,
	isVisitorLanguage,
	LANGUAGE_CHANGE_EVENT,
	readSavedLanguage,
	saveLanguage,
} from "../../lib/home-content-language";
import type { VisitorLanguage } from "../../lib/home-content-types";

/**
 * The visitor's language: the saved choice, else the browser's, else Spanish.
 * `detected` is null when the browser asks for none of the supported languages.
 */
export function useVisitorLanguage() {
	const [detected] = useState(() => detectLanguage(browserLanguages()));
	const [language, setLanguage] = useState<VisitorLanguage>(
		() => readSavedLanguage() ?? detected ?? DEFAULT_LANGUAGE,
	);

	// Follow changes made by another island or another tab.
	useEffect(() => {
		const onChange = (event: Event) => {
			const next = (event as CustomEvent<{ language?: unknown }>).detail
				?.language;
			if (isVisitorLanguage(next)) setLanguage(next);
		};
		const onStorage = () => {
			const saved = readSavedLanguage();
			if (saved) setLanguage(saved);
		};
		window.addEventListener(LANGUAGE_CHANGE_EVENT, onChange);
		window.addEventListener("storage", onStorage);
		return () => {
			window.removeEventListener(LANGUAGE_CHANGE_EVENT, onChange);
			window.removeEventListener("storage", onStorage);
		};
	}, []);

	const choose = useCallback((next: VisitorLanguage) => {
		saveLanguage(next);
		setLanguage(next);
	}, []);

	return { language, detected, copy: VISITOR_SHELL_COPY[language], choose };
}
