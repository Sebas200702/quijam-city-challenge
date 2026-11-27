/** Languages the visitor shell speaks. Spanish is the city's language and the fallback. */
export type VisitorLanguage = "es" | "en" | "pt" | "fr";

/** The trip the map section suggests first: the same default the map's route card plans. */
export interface MapNextStep {
	/** Corridor stop codes, as in `corridor_stops.code`. */
	origin: string;
	destination: string;
	/** Short name for the card title, e.g. "Estadio Metropolitano". */
	destinationName: string;
}

/** Entries of the secondary menu (rule 2: everything that is not a main section). */
export type VisitorMenuItemId =
	| "passport"
	| "slang"
	| "data"
	| "language"
	| "theme";

/** Every string the visitor shell shows, in one language. */
export interface VisitorShellCopy {
	openMenu: string;
	changeLanguage: (languageName: string) => string;
	close: string;
	menuTitle: string;
	menuItems: Record<VisitorMenuItemId, { title: string; hint: string }>;
	languageHint: (languageName: string) => string;
	/** Hint of the theme item: the current theme and what the tap does. */
	themeHint: (dark: boolean) => string;
	menuOfflineNote: string;
	/** Quiet link under the menu tiles to the privacy policy (/privacidad). */
	privacyLink: string;
	nextStepEyebrow: string;
	nextStepTitle: (destination: string) => string;
	nextStepRouteLabel: string;
	nextStepTimeLabel: string;
	nextStepFareLabel: string;
	minutes: (value: number) => string;
	free: string;
	greenRoute: string;
	nextStepAction: string;
	nextStepLoadingTitle: string;
	nextStepLoadingText: string;
	emptyTitle: string;
	emptyWhy: string;
	/** Question handed to Quillart AI (Movilidad) for the suggested trip. */
	askRoute: (destination: string) => string;
	talkToGuide: string;
	guidePrompt: string;
	offlineNote: string;
	mapErrorTitle: string;
	mapErrorText: string;
	retry: string;
	languageTitle: string;
	languageIntro: string;
	languageLegend: string;
	languageDetected: string;
	languageCity: string;
	languageAvailable: string;
	languageUse: string;
	languageEmptyTitle: string;
	languageEmptyText: string;
	languageOfflineNote: string;
}
