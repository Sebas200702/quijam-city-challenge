// Interface labels around the Guide's answer, in the visitor's language. On
// the map the Guide is Quillart AI's mobility agent: it answers in five
// languages; the cards around it use Spanish for Spanish speakers and English
// for everyone else. Coastal slang is glossed
// in all five languages so the visitor understands it inline.

import type { TransportMode } from "../../lib/corridor/corridor-types";
import {
	detectLanguage,
	GUIDE_LANGUAGES,
	type GuideLanguage,
} from "../../lib/guide/guide-local";

/** Icon hint for a suggested question; the panel maps it to a lucide icon. */
export type GuideSuggestionIcon = "route" | "taxi" | "slang" | "language";

export interface GuideSuggestion {
	text: string;
	/** Language of the question, when it differs from the panel's. */
	lang?: GuideLanguage;
	icon: GuideSuggestionIcon;
}

export interface GuidePanelText {
	eyebrow: string;
	title: string;
	close: string;
	referenceData: string;
	readAloud: string;
	openAssistant: string;
	offline: string;
	greeting: string;
	tryThis: string;
	suggestions: GuideSuggestion[];
	suggestionsLabel: string;
	talk: string;
	stopTalking: string;
	tapToTalk: string;
	listening: string;
	voiceOffline: string;
	typeLabel: string;
	typePlaceholder: string;
	send: string;
	thinking: string;
	guide: string;
	saidByVoice: string;
	detected: (language: GuideLanguage) => string;
	sourceSlang: string;
	savedAnswer: string;
	savedAnswers: string;
	offlineIntro: string;
	offlineMissTitle: string;
	offlineMissText: string;
	errorTitle: string;
	errorText: string;
	retry: string;
	micErrorTitle: string;
	micErrorText: string;
	micBlockedText: string;
}

export interface GuideText {
	greenRoute: string;
	noGreenRoute: string;
	referenceFare: string;
	free: string;
	minutes: (value: number) => string;
	fairTaxi: string;
	floodBlocked: string;
	showOnMap: string;
	reportOvercharge: string;
	modes: Record<TransportMode, string>;
	panel: GuidePanelText;
	report: {
		title: string;
		route: string;
		referenceFare: string;
		overchargeEstimate: (percent: number | null, deltaCop: string) => string;
		withinReference: string;
		vehicle: string;
		vehicles: Record<"taxi" | "bus" | "informal" | "other", string>;
		charged: string;
		driverCode: string;
		notes: string;
		optional: string;
		send: string;
		sending: string;
		cancel: string;
		close: string;
		saved: (percent: number | null) => string;
		savedOffline: string;
		failed: string;
		privacy: string;
		amountEmpty: string;
		amountFormat: string;
		amountRange: string;
		driverCodeInvalid: string;
	};
}

const ES: GuideText = {
	greenRoute: "Ruta verde",
	noGreenRoute: "Sin ruta verde directa",
	referenceFare: "Tarifa de referencia",
	free: "Gratis",
	minutes: (value) => `${value} min`,
	fairTaxi: "Taxi verificado, tarifa justa",
	floodBlocked: "Evitamos un tramo con alerta de arroyo.",
	showOnMap: "Ver en el mapa",
	reportOvercharge: "Reportar cobro abusivo",
	modes: {
		transmetro: "Transmetro",
		bus: "Bus",
		taxi_verified: "Taxi verificado",
		walk: "A pie",
		bike: "Bici",
	},
	panel: {
		eyebrow: "Agente de Movilidad",
		title: "Quillart AI",
		close: "Cerrar la conversación",
		referenceData: "Datos de referencia",
		readAloud: "Leer respuestas en voz alta",
		openAssistant: "Seguir en Quillart AI",
		offline: "Sin conexión",
		greeting:
			"Hola. Soy Quillart AI. Te ayudo a moverte por el corredor: toca el micrófono y habla en tu idioma, o escribe abajo.",
		tryThis: "Prueba con",
		suggestions: [
			{ text: "¿Cómo llego al estadio?", icon: "route" },
			{ text: "¿Cuánto cuesta un taxi al estadio?", icon: "taxi" },
			{ text: "¿Qué significa ajá?", icon: "slang" },
			{ text: "How do I get to Barrio Abajo?", lang: "en", icon: "language" },
		],
		suggestionsLabel: "Preguntas sugeridas",
		talk: "Hablar con Quillart",
		stopTalking: "Dejar de escuchar",
		tapToTalk: "Toca y habla en tu idioma",
		listening: "Escuchando… habla en tu idioma",
		voiceOffline: "Sin conexión no hay voz. Escribe tu pregunta.",
		typeLabel: "O escribe tu pregunta",
		typePlaceholder: "O escribe tu pregunta…",
		send: "Enviar pregunta",
		thinking: "Quillart está pensando",
		guide: "Agente de Movilidad",
		saidByVoice: "Dicho por voz",
		detected: (language) => `${LANGUAGE_NAMES.es[language]} detectado`,
		sourceSlang: "Jerga de la costa",
		savedAnswer: "Respuesta guardada",
		savedAnswers: "Respuestas guardadas",
		offlineIntro:
			"Estás sin conexión. Te respondo con lo que tengo guardado: las rutas que ya preguntaste y la jerga.",
		offlineMissTitle: "Aún no tengo esa respuesta",
		offlineMissText:
			"Sin conexión solo respondo lo que ya preguntaste y la jerga. Inténtalo cuando vuelva la señal.",
		errorTitle: "No pude responder ahora",
		errorText: "Inténtalo otra vez en un momento.",
		retry: "Reintentar",
		micErrorTitle: "No pudimos escucharte",
		micErrorText:
			"Hay mucho ruido o no se oyó nada. Habla más cerca o escribe tu pregunta abajo.",
		micBlockedText: "No diste permiso al micrófono. Escribe tu pregunta abajo.",
	},
	report: {
		title: "Reportar cobro abusivo",
		route: "Trayecto",
		referenceFare: "Tarifa de referencia",
		overchargeEstimate: (percent, deltaCop) =>
			percent !== null
				? `+${deltaCop} (+${percent} % sobre la referencia)`
				: `+${deltaCop} sobre la referencia`,
		withinReference: "Dentro de la tarifa de referencia",
		vehicle: "¿En qué ibas?",
		vehicles: { taxi: "Taxi", bus: "Bus", informal: "Informal", other: "Otro" },
		charged: "¿Cuánto te cobraron? (COP)",
		driverCode: "Código QR del conductor",
		notes: "¿Qué pasó?",
		optional: "opcional",
		send: "Enviar reporte",
		sending: "Enviando…",
		cancel: "Cancelar",
		close: "Cerrar",
		saved: (percent) =>
			percent !== null && percent > 0
				? `Reporte enviado. Te cobraron ${percent} % más que la tarifa de referencia; la ciudad ya lo ve.`
				: "Reporte enviado. La ciudad ya lo ve.",
		savedOffline: "No pudimos enviarlo ahora. Lo guardamos en este teléfono.",
		failed:
			"No pudimos enviar el reporte. Revisa los datos e intenta de nuevo.",
		privacy: "No pedimos tu nombre ni tu ubicación.",
		amountEmpty: "Escribe cuánto te cobraron. Ejemplo: 35000.",
		amountFormat:
			"Escribe cuánto te cobraron, solo con números. Ejemplo: 35000.",
		amountRange: "Revisa el monto: debe estar entre $1 y $2.000.000.",
		driverCodeInvalid:
			"El código solo lleva letras, números y guiones. Ejemplo: TX-0417.",
	},
};

const EN: GuideText = {
	greenRoute: "Green route",
	noGreenRoute: "No direct green route",
	referenceFare: "Reference fare",
	free: "Free",
	minutes: (value) => `${value} min`,
	fairTaxi: "Verified taxi, fair fare",
	floodBlocked: "We avoided a leg with a flood alert.",
	showOnMap: "Show on map",
	reportOvercharge: "Report an overcharge",
	modes: {
		transmetro: "Transmetro",
		bus: "Bus",
		taxi_verified: "Verified taxi",
		walk: "On foot",
		bike: "Bike",
	},
	panel: {
		eyebrow: "Mobility agent",
		title: "Quillart AI",
		close: "Close the conversation",
		referenceData: "Reference data",
		readAloud: "Read answers aloud",
		openAssistant: "Continue in Quillart AI",
		offline: "Offline",
		greeting:
			"Hi. I am Quillart AI. I help you get around the corridor: tap the mic and speak your language, or type below.",
		tryThis: "Try",
		suggestions: [
			{ text: "How do I get to the stadium?", icon: "route" },
			{ text: "How much is a taxi to the stadium?", icon: "taxi" },
			{ text: "What does ajá mean?", icon: "slang" },
			{ text: "Comment aller au Centro ?", lang: "fr", icon: "language" },
		],
		suggestionsLabel: "Suggested questions",
		talk: "Talk to Quillart",
		stopTalking: "Stop listening",
		tapToTalk: "Tap and speak your language",
		listening: "Listening… speak your language",
		voiceOffline: "Voice needs a connection. Type your question.",
		typeLabel: "Or type your question",
		typePlaceholder: "Or type your question…",
		send: "Send question",
		thinking: "Quillart is thinking",
		guide: "Mobility agent",
		saidByVoice: "Said by voice",
		detected: (language) => `${LANGUAGE_NAMES.en[language]} detected`,
		sourceSlang: "Coastal slang",
		savedAnswer: "Saved answer",
		savedAnswers: "Saved answers",
		offlineIntro:
			"You are offline. I reply with what I have saved: the routes you already asked about and slang.",
		offlineMissTitle: "I do not have that answer yet",
		offlineMissText:
			"Offline I only answer what you already asked and slang. Try again when you are back online.",
		errorTitle: "I could not answer right now",
		errorText: "Please try again in a moment.",
		retry: "Try again",
		micErrorTitle: "We could not hear you",
		micErrorText:
			"It is too noisy or nothing was heard. Speak closer or type your question below.",
		micBlockedText: "The mic is blocked. Type your question below.",
	},
	report: {
		title: "Report an overcharge",
		route: "Route",
		referenceFare: "Reference fare",
		overchargeEstimate: (percent, deltaCop) =>
			percent !== null
				? `+${deltaCop} (+${percent}% above reference)`
				: `+${deltaCop} above reference`,
		withinReference: "Within the reference fare",
		vehicle: "What were you riding?",
		vehicles: {
			taxi: "Taxi",
			bus: "Bus",
			informal: "Informal",
			other: "Other",
		},
		charged: "How much did they charge? (COP)",
		driverCode: "Driver's QR code",
		notes: "What happened?",
		optional: "optional",
		send: "Send report",
		sending: "Sending…",
		cancel: "Cancel",
		close: "Close",
		saved: (percent) =>
			percent !== null && percent > 0
				? `Report sent. You were charged ${percent}% above the reference fare; the city can see it now.`
				: "Report sent. The city can see it now.",
		savedOffline: "We could not send it now. It is saved on this phone.",
		failed: "We could not send the report. Check the details and try again.",
		privacy: "We never ask for your name or location.",
		amountEmpty: "Type how much you were charged. Example: 35000.",
		amountFormat:
			"Type how much you were charged, numbers only. Example: 35000.",
		amountRange: "Check the amount: it must be between $1 and $2,000,000.",
		driverCodeInvalid:
			"The code only has letters, numbers and dashes. Example: TX-0417.",
	},
};

export function guideText(language: GuideLanguage): GuideText {
	return language === "es" ? ES : EN;
}

const LANGUAGE_NAMES: Record<"es" | "en", Record<GuideLanguage, string>> = {
	es: {
		es: "Español",
		en: "Inglés",
		pt: "Portugués",
		fr: "Francés",
		de: "Alemán",
	},
	en: {
		es: "Spanish",
		en: "English",
		pt: "Portuguese",
		fr: "French",
		de: "German",
	},
};

/** Panel language from the browser: the visitor never has to pick it. */
export function browserLanguage(): GuideLanguage {
	if (typeof navigator === "undefined") return "es";
	const code = navigator.language.slice(0, 2).toLowerCase();
	return GUIDE_LANGUAGES.includes(code as GuideLanguage)
		? (code as GuideLanguage)
		: "en";
}

// ── Coastal slang ──
// The Guide may use local words; we gloss them inline, in the visitor's
// language, so nobody is left out. Same terms as the slang sheet mockup.

interface SlangTerm {
	term: string;
	/** Lower case spellings, without accents. */
	spellings: string[];
	gloss: Record<GuideLanguage, string>;
}

const SLANG: SlangTerm[] = [
	{
		term: "ajá",
		spellings: ["aja"],
		gloss: {
			es: "saludo para todo, como «claro» o «¿y qué?»",
			en: "all-purpose greeting, like “sure” or “so?”",
			pt: "saudação para tudo, como “claro” ou “e aí?”",
			fr: "salut passe-partout, comme « bien sûr » ou « alors ? »",
			de: "Gruß für alles, wie „klar“ oder „na?“",
		},
	},
	{
		term: "trancón",
		spellings: ["trancon"],
		gloss: {
			es: "atasco de carros",
			en: "traffic jam",
			pt: "engarrafamento",
			fr: "embouteillage",
			de: "Stau",
		},
	},
	{
		term: "bacano",
		spellings: ["bacano", "bacana"],
		gloss: {
			es: "muy bueno, chévere",
			en: "great, cool",
			pt: "muito legal",
			fr: "génial",
			de: "super, cool",
		},
	},
	{
		term: "mamar gallo",
		spellings: ["mamar gallo", "mamando gallo"],
		gloss: {
			es: "bromear",
			en: "to joke, to tease",
			pt: "brincar, zoar",
			fr: "plaisanter",
			de: "Spaß machen",
		},
	},
	{
		term: "arroyo",
		spellings: ["arroyo", "arroyos"],
		gloss: {
			es: "corriente de agua en la calle cuando llueve; no la cruces",
			en: "street flash flood when it rains; do not cross it",
			pt: "enxurrada na rua quando chove; não atravesse",
			fr: "torrent dans la rue quand il pleut ; ne le traversez pas",
			de: "Sturzflut auf der Straße bei Regen; nicht überqueren",
		},
	},
	{
		term: "pelao",
		spellings: ["pelao", "pelaos"],
		gloss: {
			es: "niño o joven",
			en: "kid, young person",
			pt: "criança, jovem",
			fr: "gamin, jeune",
			de: "Kind, junger Mensch",
		},
	},
	{
		term: "mi llave",
		spellings: ["mi llave"],
		gloss: {
			es: "amigo",
			en: "buddy, friend",
			pt: "amigo, parceiro",
			fr: "pote, ami",
			de: "Kumpel",
		},
	},
];

/** Lower case, no accents, same length as the input (one code unit per letter). */
function fold(text: string): string {
	return Array.from(text, (char) => {
		const plain = char
			.normalize("NFD")
			.replace(/\p{Diacritic}/gu, "")
			.toLowerCase();
		return plain.length === char.length ? plain : char;
	}).join("");
}

function wordPattern(spelling: string, unexplained: boolean): RegExp {
	// Not inside a longer word; optionally not already followed by "(…)".
	const after = unexplained ? "(?!\\s*\\()" : "";
	return new RegExp(`(?<!\\p{L})${spelling}(?!\\p{L})${after}`, "u");
}

/** A piece of an answer; slang pieces carry their gloss. */
export interface GlossedPart {
	text: string;
	gloss?: string;
}

/**
 * Splits an answer so each slang word (first use only) can be shown with its
 * meaning right after it. Words the answer already explains in parentheses
 * are left alone.
 */
export function glossSlang(
	text: string,
	language: GuideLanguage,
): GlossedPart[] {
	const folded = fold(text);
	const hits: { start: number; end: number; gloss: string }[] = [];
	for (const slang of SLANG) {
		for (const spelling of slang.spellings) {
			const match = wordPattern(spelling, true).exec(folded);
			if (match) {
				hits.push({
					start: match.index,
					end: match.index + spelling.length,
					gloss: slang.gloss[language],
				});
				break;
			}
		}
	}
	hits.sort((a, b) => a.start - b.start);
	const parts: GlossedPart[] = [];
	let cursor = 0;
	for (const hit of hits) {
		if (hit.start < cursor) continue;
		if (hit.start > cursor) parts.push({ text: text.slice(cursor, hit.start) });
		parts.push({ text: text.slice(hit.start, hit.end), gloss: hit.gloss });
		cursor = hit.end;
	}
	if (cursor < text.length) parts.push({ text: text.slice(cursor) });
	return parts;
}

// "What does X mean?" in the five languages the Guide speaks.
const MEANING_WORDS: { pattern: RegExp; language: GuideLanguage | null }[] = [
	{ pattern: /\bquer dizer\b/, language: "pt" },
	{ pattern: /\bsignifica\b/, language: null },
	{ pattern: /\bmeans?\b/, language: "en" },
	{ pattern: /\b(veut dire|signifie)\b/, language: "fr" },
	{ pattern: /\bbedeutet\b/, language: "de" },
];

const SLANG_ANSWER: Record<
	GuideLanguage,
	(term: string, gloss: string) => string
> = {
	es: (term, gloss) => `«${term}» es jerga de la costa: ${gloss}.`,
	en: (term, gloss) => `“${term}” is coastal slang: ${gloss}.`,
	pt: (term, gloss) => `“${term}” é gíria da costa: ${gloss}.`,
	fr: (term, gloss) => `« ${term} » est de l'argot de la côte : ${gloss}.`,
	de: (term, gloss) => `„${term}“ ist Küstenslang: ${gloss}.`,
};

/**
 * Answers "what does <slang> mean?" right on the phone, so it works offline.
 * Null when the question is not about a slang word we know.
 */
export function answerSlang(
	question: string,
): { reply: string; language: GuideLanguage } | null {
	const folded = fold(question);
	const asked = MEANING_WORDS.find(({ pattern }) => pattern.test(folded));
	if (!asked) return null;
	const slang = SLANG.find(({ spellings }) =>
		spellings.some((spelling) => wordPattern(spelling, false).test(folded)),
	);
	if (!slang) return null;
	// "significa" is Spanish and Portuguese: trust the detector only for Portuguese.
	const language =
		asked.language ?? (detectLanguage(question) === "pt" ? "pt" : "es");
	return {
		reply: SLANG_ANSWER[language](slang.term, slang.gloss[language]),
		language,
	};
}
