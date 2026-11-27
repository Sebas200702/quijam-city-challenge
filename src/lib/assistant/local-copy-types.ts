// Shape of the sentences the local agents say, one copy per interface language.

export interface LocalCopy {
	/** Appended after the reason when an account is needed. */
	signIn: (reason: string) => string;
	signInLabel: string;
	reasons: {
		createEvent: string;
		register: string;
		forum: string;
		report: string;
		notSignedIn: string;
	};
	/** Server safety net when a model proposed an action without a session. */
	needAccount: string;
	/** Server safety net: a proposed action waits on its card for sign-in (U02). */
	actionKept: string;
	/** A turn that only changed the screen (UI tools) and said nothing else. */
	uiDone: string;
	createEvent: string;
	createEventLabel: string;
	/** A complete event draft waits on its confirmation card. */
	eventDrafted: string;
	/** A partial event draft opens the form already filled. */
	eventFormFilled: string;
	confirmUnregister: string;
	confirmRegister: string;
	whichToLeave: string;
	/** `category` is the event category label in this language, or null. */
	searchEvents: (category: string | null) => string;
	newThread: string;
	newThreadLabel: string;
	listThreads: string;
	directionsTo: (place: string) => string;
	aboutPlace: (place: string) => string;
	listPlaces: string;
	routeFromMalecon: string;
	whereTo: string;
	mapLabel: string;
	emergency: string;
	reportReady: string;
	/** The fare report form opens almost filled (U17). */
	fareReportReady: string;
	fareReportLabel: string;
	profile: string;
	profileLabel: string;
	myRegistrations: string;
	/** The mobility agent looks up the current fares. */
	fares: string;
	/** The city data agent looks up news, open data or indicators. */
	news: string;
	openData: string;
	indicators: string;
	openDataLabel: string;
	wrapUp: {
		failed: string;
		held: string;
		rejected: string;
		declined: string;
		eventsNone: string;
		eventsSome: string;
		eventsCount: (count: number) => string;
		eventDetails: string;
		registrationsNone: string;
		registrationsSome: string;
		registrationsCount: (count: number) => string;
		placesNone: string;
		placesSome: string;
		placesCount: (count: number) => string;
		placeInfo: (name: string | null) => string;
		directions: string;
		threadsNone: string;
		threadsSome: string;
		threadsCount: (count: number) => string;
		floodAlert: string;
		route: string;
		alreadyRegistered: string;
		registered: string;
		unregistered: string;
		eventPublished: string;
		threadPublished: string;
		replyPublished: string;
		reportSent: string;
		/** `list` is already formatted ("Transmetro: $3.500; ..."). */
		fares: (list: string) => string;
		news: (alerts: number, events: number) => string;
		openDataCatalog: (count: number) => string;
		openDataRecords: (count: number) => string;
		/** `list` is already formatted ("Territorio: 80 % (Meta: 90 %); ..."). */
		indicators: (list: string) => string;
		fallback: string;
	};
}
