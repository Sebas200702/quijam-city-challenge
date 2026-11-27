import { useState } from "react";
import { VISITOR_SHELL_COPY } from "../../lib/home-content-copy";
import {
	browserLanguages,
	detectLanguage,
} from "../../lib/home-content-language";
import { setLanguage, useLanguage } from "../../lib/i18n/use-language";

/**
 * The visitor shell's view of the one shared interface language (src/lib/i18n/use-language.ts):
 * the same value every translated island reads, plus the shell's own copy and what the
 * browser asked for. `detected` is null when the browser asks for none of the supported languages.
 */
export function useVisitorLanguage() {
	const language = useLanguage();
	const [detected] = useState(() =>
		typeof window === "undefined" ? null : detectLanguage(browserLanguages()),
	);
	return {
		language,
		detected,
		copy: VISITOR_SHELL_COPY[language],
		choose: setLanguage,
	};
}
