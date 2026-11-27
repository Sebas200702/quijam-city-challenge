// The chosen interface language: one shared value for every React island on the
// page, kept in localStorage and mirrored on <html lang>.

import { useSyncExternalStore } from "react";
import {
	DEFAULT_LANGUAGE,
	isLanguage,
	LANGUAGE_STORAGE_KEY,
	type Language,
} from "./languages";
import { type Messages, messages } from "./messages";

const listeners = new Set<() => void>();
let current: Language | null = null;

function readStored(): Language {
	try {
		const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
		if (isLanguage(stored)) return stored;
	} catch {
		// Storage can be blocked (private mode): fall back to the default.
	}
	return DEFAULT_LANGUAGE;
}

export function getLanguage(): Language {
	if (typeof window === "undefined") return DEFAULT_LANGUAGE;
	current ??= readStored();
	return current;
}

export function setLanguage(next: Language): void {
	current = next;
	try {
		localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
	} catch {
		// The language still applies for this visit.
	}
	document.documentElement.lang = next;
	for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
	listeners.add(listener);
	// Another tab changed the language.
	const onStorage = (event: StorageEvent) => {
		if (event.key !== LANGUAGE_STORAGE_KEY) return;
		current = readStored();
		document.documentElement.lang = current;
		listener();
	};
	window.addEventListener("storage", onStorage);
	return () => {
		listeners.delete(listener);
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
