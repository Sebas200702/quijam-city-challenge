// The chosen interface language: one shared value for every React island on the
// page. It is read from, and saved through, the visitor language module
// (src/lib/home-content-language.ts): the saved choice first, then the browser's
// language, then Spanish. The visitor shell (language sheet, secondary menu) and
// the translated pages follow each other through its change event.

import { useSyncExternalStore } from "react";
import {
	browserLanguages,
	DEFAULT_LANGUAGE,
	detectLanguage,
	LANGUAGE_CHANGE_EVENT,
	LANGUAGE_STORAGE_KEY,
	readSavedLanguage,
	saveLanguage,
} from "../home-content-language";
import { isLanguage, type Language } from "./languages";
import { type Messages, messages } from "./messages";

const listeners = new Set<() => void>();
let current: Language | null = null;

function resolve(): Language {
	return (
		readSavedLanguage() ??
		detectLanguage(browserLanguages()) ??
		DEFAULT_LANGUAGE
	);
}

export function getLanguage(): Language {
	if (typeof window === "undefined") return DEFAULT_LANGUAGE;
	current ??= resolve();
	return current;
}

/** Saves the choice on this device and tells every island (ours and the visitor shell). */
export function setLanguage(next: Language): void {
	saveLanguage(next);
}

function subscribe(listener: () => void): () => void {
	listeners.add(listener);
	const refresh = (event?: Event) => {
		// The change event carries the choice, so it applies even when storage is blocked.
		const announced = (event as CustomEvent<{ language?: unknown }> | undefined)
			?.detail?.language;
		current = isLanguage(announced) ? announced : resolve();
		document.documentElement.lang = current;
		listener();
	};
	const onStorage = (event: StorageEvent) => {
		if (event.key === LANGUAGE_STORAGE_KEY) refresh();
	};
	// The visitor shell and `setLanguage` announce changes with this event;
	// another tab changes the language through `storage`.
	window.addEventListener(LANGUAGE_CHANGE_EVENT, refresh);
	window.addEventListener("storage", onStorage);
	return () => {
		listeners.delete(listener);
		window.removeEventListener(LANGUAGE_CHANGE_EVENT, refresh);
		window.removeEventListener("storage", onStorage);
	};
}

/** For code outside React (the static Astro text) that must react to a change. */
export const subscribeLanguage = subscribe;

/** The server and the first client render use Spanish, then the saved choice applies. */
export function useLanguage(): Language {
	return useSyncExternalStore(subscribe, getLanguage, () => DEFAULT_LANGUAGE);
}

/** The interface text in the chosen language. */
export function useT(): Messages {
	return messages[useLanguage()];
}
