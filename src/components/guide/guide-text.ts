// Interface labels around the Guide's answer, in the language chosen for the
// interface (the text lives in src/lib/i18n/dictionaries/map.ts).

import type { Language } from "../../lib/i18n/languages";
import { messages } from "../../lib/i18n/messages";

export type GuideText = (typeof messages)["es"]["map"]["cards"];

export function guideText(language: Language): GuideText {
	return messages[language].map.cards;
}
