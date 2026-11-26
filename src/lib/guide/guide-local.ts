// The Guide without a model: detects language and destination with keywords and
// answers from templates. Used when Gemini is not configured or fails, so the
// demo never depends on the network.

import type { TransportMode } from "../corridor/corridor-types";
import {
	DESTINATIONS,
	type DestinationKey,
	type TripPlan,
	VISITOR_ORIGIN,
} from "../trip/trip-planner";

export const GUIDE_LANGUAGES = ["es", "en", "pt", "fr", "de"] as const;
export type GuideLanguage = (typeof GUIDE_LANGUAGES)[number];

/** Lower case, no accents, words only. */
function words(text: string): string[] {
	return text
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase()
		.split(/[^a-z0-9]+/)
		.filter(Boolean);
}

// Only words that tell the languages apart: Spanish and Portuguese share
// "como", "ir" and "por favor", so those count for neither.
const LANGUAGE_WORDS: Record<GuideLanguage, string[]> = {
	es: [
		"llego",
		"donde",
		"quiero",
		"cuanto",
		"hola",
		"gracias",
		"voy",
		"puedo",
		"al",
		"del",
		"el",
		"cuesta",
	],
	en: [
		"how",
		"do",
		"i",
		"get",
		"where",
		"is",
		"the",
		"to",
		"want",
		"go",
		"much",
		"hello",
		"hi",
		"please",
		"can",
		"what",
	],
	pt: [
		"chego",
		"onde",
		"fica",
		"quero",
		"quanto",
		"ola",
		"obrigado",
		"obrigada",
		"ao",
		"posso",
		"voce",
		"estou",
		"custa",
	],
	fr: [
		"comment",
		"aller",
		"ou",
		"est",
		"le",
		"au",
		"je",
		"veux",
		"combien",
		"bonjour",
		"merci",
		"peux",
		"stade",
	],
	de: [
		"wie",
		"komme",
		"ich",
		"zum",
		"wo",
		"ist",
		"das",
		"will",
		"hallo",
		"danke",
		"bitte",
		"kann",
		"nach",
	],
};

/** Most likely language of a question; English when nothing matches (foreign visitor). */
export function detectLanguage(text: string): GuideLanguage {
	const tokens = words(text);
	let best: GuideLanguage = "en";
	let bestScore = 0;
	for (const language of GUIDE_LANGUAGES) {
		const vocabulary = new Set(LANGUAGE_WORDS[language]);
		const score = tokens.filter((token) => vocabulary.has(token)).length;
		if (score > bestScore) {
			best = language;
			bestScore = score;
		}
	}
	return best;
}

const DESTINATION_WORDS: Record<DestinationKey, string[]> = {
	estadio: [
		"estadio",
		"stadium",
		"stade",
		"stadion",
		"metropolitano",
		"partido",
		"match",
		"game",
		"jogo",
		"spiel",
		"futbol",
		"football",
		"soccer",
		"fussball",
	],
	barrio_abajo: ["barrio", "abajo", "carnaval", "carnival", "karneval"],
	centro: ["centro", "downtown", "center", "centre", "zentrum", "paz", "plaza"],
};

export function detectDestination(text: string): DestinationKey | null {
	const tokens = new Set(words(text));
	for (const key of Object.keys(DESTINATION_WORDS) as DestinationKey[]) {
		if (DESTINATION_WORDS[key].some((word) => tokens.has(word))) return key;
	}
	return null;
}

const LOCALES: Record<GuideLanguage, string> = {
	es: "es-CO",
	en: "en-US",
	pt: "pt-BR",
	fr: "fr-FR",
	de: "de-DE",
};

export function formatFare(amount: number, language: GuideLanguage): string {
	return `$${new Intl.NumberFormat(LOCALES[language]).format(amount)} COP`;
}

const MODE_NAMES: Record<GuideLanguage, Record<TransportMode, string>> = {
	es: {
		transmetro: "el Transmetro",
		bus: "el bus",
		taxi_verified: "un taxi verificado",
		walk: "a pie",
		bike: "en bici",
	},
	en: {
		transmetro: "the Transmetro",
		bus: "the bus",
		taxi_verified: "a verified taxi",
		walk: "on foot",
		bike: "by bike",
	},
	pt: {
		transmetro: "o Transmetro",
		bus: "o ônibus",
		taxi_verified: "um táxi verificado",
		walk: "a pé",
		bike: "de bicicleta",
	},
	fr: {
		transmetro: "le Transmetro",
		bus: "le bus",
		taxi_verified: "un taxi vérifié",
		walk: "à pied",
		bike: "à vélo",
	},
	de: {
		transmetro: "den Transmetro",
		bus: "den Bus",
		taxi_verified: "ein geprüftes Taxi",
		walk: "zu Fuß",
		bike: "mit dem Rad",
	},
};

interface Phrases {
	ask: string;
	green: (mode: string, place: string, minutes: number, fare: string) => string;
	free: string;
	noGreen: (place: string) => string;
	taxi: (min: string, max: string) => string;
	report: string;
}

const PHRASES: Record<GuideLanguage, Phrases> = {
	es: {
		ask: `Estás en el ${VISITOR_ORIGIN.name}. Puedo llevarte al Estadio, a Barrio Abajo o al Centro. ¿A dónde quieres ir?`,
		green: (mode, place, minutes, fare) =>
			`Ve ${mode} hasta ${place}: unos ${minutes} min, tarifa de referencia ${fare}.`,
		free: "Es gratis y es la opción más verde.",
		noGreen: (place) => `No hay una ruta verde directa hasta ${place}.`,
		taxi: (min, max) =>
			`Si prefieres taxi verificado, lo justo es entre ${min} y ${max}.`,
		report: "Si te cobran de más, repórtalo aquí mismo.",
	},
	en: {
		ask: `You are at the ${VISITOR_ORIGIN.name}. I can take you to the Estadio, Barrio Abajo or the Centro. Where do you want to go?`,
		green: (mode, place, minutes, fare) =>
			`Take ${mode} to ${place}: about ${minutes} min, reference fare ${fare}.`,
		free: "It is free and the greenest option.",
		noGreen: (place) => `There is no direct green route to ${place}.`,
		taxi: (min, max) =>
			`If you prefer a verified taxi, a fair fare is between ${min} and ${max}.`,
		report: "If anyone overcharges you, report it right here.",
	},
	pt: {
		ask: `Você está no ${VISITOR_ORIGIN.name}. Posso te levar ao Estádio, a Barrio Abajo ou ao Centro. Para onde você quer ir?`,
		green: (mode, place, minutes, fare) =>
			`Vá com ${mode} até ${place}: cerca de ${minutes} min, tarifa de referência ${fare}.`,
		free: "É grátis e a opção mais verde.",
		noGreen: (place) => `Não há uma rota verde direta até ${place}.`,
		taxi: (min, max) =>
			`Se preferir táxi verificado, o justo é entre ${min} e ${max}.`,
		report: "Se cobrarem a mais, denuncie aqui mesmo.",
	},
	fr: {
		ask: `Vous êtes au ${VISITOR_ORIGIN.name}. Je peux vous guider vers l'Estadio, Barrio Abajo ou le Centro. Où voulez-vous aller ?`,
		green: (mode, place, minutes, fare) =>
			`Prenez ${mode} jusqu'à ${place} : environ ${minutes} min, tarif de référence ${fare}.`,
		free: "C'est gratuit et le choix le plus vert.",
		noGreen: (place) => `Il n'y a pas d'itinéraire vert direct vers ${place}.`,
		taxi: (min, max) =>
			`Si vous préférez un taxi vérifié, le juste prix est entre ${min} et ${max}.`,
		report: "Si on vous fait payer trop, signalez-le ici.",
	},
	de: {
		ask: `Sie sind am ${VISITOR_ORIGIN.name}. Ich bringe Sie zum Estadio, nach Barrio Abajo oder ins Centro. Wohin möchten Sie?`,
		green: (mode, place, minutes, fare) =>
			`Nehmen Sie ${mode} bis ${place}: etwa ${minutes} Min., Richtpreis ${fare}.`,
		free: "Das ist kostenlos und die grünste Wahl.",
		noGreen: (place) => `Es gibt keine direkte grüne Route nach ${place}.`,
		taxi: (min, max) =>
			`Mit einem geprüften Taxi ist ein fairer Preis zwischen ${min} und ${max}.`,
		report: "Wenn Ihnen zu viel berechnet wird, melden Sie es hier.",
	},
};

/** Answer built only from our data, in the visitor's language. */
export function localReply(
	language: GuideLanguage,
	plan: TripPlan | null,
): string {
	const phrases = PHRASES[language];
	if (!plan) return phrases.ask;

	const place = DESTINATIONS[plan.destination].name;
	const parts: string[] = [];
	if (plan.green) {
		const { transport_mode, estimated_minutes, reference_fare_cop } =
			plan.green;
		const mode = MODE_NAMES[language][transport_mode];
		parts.push(
			phrases.green(
				mode,
				place,
				estimated_minutes,
				formatFare(reference_fare_cop, language),
			),
		);
		if (reference_fare_cop === 0) parts.push(phrases.free);
	} else {
		parts.push(phrases.noGreen(place));
	}
	if (plan.taxi) {
		parts.push(
			phrases.taxi(
				formatFare(plan.taxi.fare_min_cop, language),
				formatFare(plan.taxi.fare_max_cop, language),
			),
		);
		parts.push(phrases.report);
	}
	return parts.join(" ");
}
