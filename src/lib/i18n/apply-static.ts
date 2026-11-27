// Text of the static Astro pages (the landing, page titles). Those elements are
// rendered in Spanish by the server and carry a key; this script swaps their
// text for the chosen language when the page loads and when the language changes.
//
//   <h1 data-i18n="landing.hero.title">Texto en español</h1>
//   <a href="/" data-i18n-attr="aria-label:landing.header.homeLabel">...</a>
//   (several attributes: data-i18n-attr="title:a.b;aria-label:c.d")
//
// Keys are paths into the dictionaries in ./messages (e.g. "landing.hero.title").
// Only plain text is swapped: for text with a link or emphasis inside, wrap each
// piece in its own element with its own key.

import { messages } from "./messages";
import {
	getLanguage,
	subscribeLanguage,
	syncDocumentLanguage,
} from "./use-language";

function lookup(source: unknown, path: string): string | undefined {
	let value: unknown = source;
	for (const part of path.split(".")) {
		if (value === null || typeof value !== "object") return undefined;
		value = (value as Record<string, unknown>)[part];
	}
	return typeof value === "string" ? value : undefined;
}

export function applyStaticText(root: ParentNode = document): void {
	const dictionary = messages[getLanguage()];
	for (const element of root.querySelectorAll<HTMLElement>("[data-i18n]")) {
		const text = lookup(dictionary, element.dataset.i18n ?? "");
		if (text !== undefined) element.textContent = text;
	}
	for (const element of root.querySelectorAll<HTMLElement>(
		"[data-i18n-attr]",
	)) {
		for (const pair of (element.dataset.i18nAttr ?? "").split(";")) {
			const [attribute, key] = pair.split(":").map((part) => part.trim());
			if (!attribute || !key) continue;
			const text = lookup(dictionary, key);
			if (text !== undefined) element.setAttribute(attribute, text);
		}
	}
}

/** Applies the language now and every time it changes. */
export function initStaticText(): void {
	// The language may come from the browser (nothing saved yet): mirror it on <html lang>.
	syncDocumentLanguage(getLanguage());
	applyStaticText();
	subscribeLanguage(() => applyStaticText());
}
