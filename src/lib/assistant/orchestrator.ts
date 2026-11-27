// The orchestrator: picks ONE specialized agent for each turn.
//
// Order:
// 1. Continuation. A tool-results turn, or a short follow-up ("sí", "el
//    segundo", "dale", "inscríbeme") after an assistant turn, stays with the
//    agent that answered last, so the conversation does not jump sections,
//    unless its keywords clearly name another section.
// 2. Keywords. A pure, accent-insensitive keyword score in Spanish, English,
//    Portuguese and French. The agent with the highest score wins when it is
//    the only one on top.
//    A question about a word of the costeño slang glossary ("¿qué significa
//    bacano?") always goes to Places, which owns lookup_slang, even as a short
//    follow-up or on another section's screen.
// 3. Screen. Without a clear keyword, the agent that owns the screen the
//    person is looking at answers (Agenda on /agenda, Mobility on /mapa), and
//    it wins a keyword tie it is part of (audit v2, U06).
// 4. OpenJev. When keywords are null or tied and a client exists, a choice
//    question over the agent descriptions; accepted at confidence >= 0.35.
//    Only the person's message text is sent (no names, no context).
// 5. Default. A tie is broken by section priority (reports and mobility are
//    time sensitive), and with no signal at all the Agenda agent answers: it is
//    the main reason people open the platform ("¿qué hay pa' hacer?" questions
//    without a place go to Places through the keywords instead).

import type { OpenJevClient } from "../openjev/openjev-types";
import { SLANG_TERMS } from "../visitor-menu/slang-source";
import { AGENT_IDS, AGENTS } from "./assistant-agents";
import {
	countKeywords,
	hasAnyKeyword,
	hasKeyword,
	normalizeText,
} from "./assistant-text";
import type {
	AssistantAgentId,
	AssistantContext,
	AssistantMessage,
	AssistantResponse,
} from "./assistant-types";
import { agentForScreen } from "./screen-context";

export const MIN_ROUTING_CONFIDENCE = 0.35;
export const DEFAULT_AGENT: AssistantAgentId = "agenda";
/** Takes typed requests that span several sections or match none. */
export const ORCHESTRATOR_AGENT: AssistantAgentId = "quillart";

/** Tie-break order, most time-sensitive first. */
const TIE_BREAK_ORDER: readonly AssistantAgentId[] = [
	"city_reports",
	"mobility",
	"account",
	"agenda",
	"community",
	"places",
	"city_data",
	"quillart",
];

export interface RouteDecision {
	agent: AssistantAgentId;
	routedBy: AssistantResponse["routedBy"];
}

export interface RouteDeps {
	openJev: OpenJevClient | null;
}

/**
 * Keywords per agent, normalized (no accents, lower case). A trailing "*"
 * matches a word prefix. Phrases count double: they are more specific.
 */
const AGENT_KEYWORDS: Record<AssistantAgentId, string[]> = {
	agenda: [
		"evento*",
		"event",
		"events",
		"plan",
		"planes",
		"agenda",
		"concierto*",
		"festival*",
		"taller*",
		"fiesta*",
		"rumba",
		"fin de semana",
		"finde",
		"weekend",
		"tonight",
		"esta noche",
		"inscrib*",
		"anotame",
		"anotarme",
		"register me",
		"sign me up",
		"cupo*",
		"publicar un evento",
		"crear un evento",
		"organizar",
		"voluntariado",
		"que hay",
		"actividades",
	],
	community: [
		"foro",
		"forum",
		"comunidad",
		"community",
		"conversacion*",
		"hilo",
		"vecino*",
		"neighbors",
		"debate",
		"opinion*",
		"responder",
		"reply",
		"comentar*",
		"preguntarle a la gente",
		"que dice la gente",
		"de que se habla",
	],
	places: [
		"lugar*",
		"place*",
		"sitio*",
		"parque*",
		"park*",
		"naturaleza",
		"nature",
		"manglar*",
		"cienaga",
		"mallorquin",
		"malecon",
		"museo*",
		"museum",
		"zoologico",
		"aves",
		"birds",
		"sendero*",
		"playa*",
		"beach",
		"muelle",
		"bocas de ceniza",
		"salamanca",
		"visitar",
		"visit",
		"conocer",
		"que hacer",
		"what to do",
		"al aire libre",
		"outdoor*",
		"turismo",
		"recomiend*",
		// The slang glossary (lookup_slang) lives with Places.
		"jerga",
		"significa",
		"slang",
		"costeno",
		"costenol",
		"palabra",
	],
	mobility: [
		"como llego",
		"como llegar",
		"como me voy",
		"llevame",
		"llevame al",
		"llevame a la",
		"lleveme",
		"llevarme",
		"llevanos",
		"take me",
		"ruta a",
		"ruta al",
		"ruta hacia",
		"how do i get",
		"how to get",
		"ruta*",
		"route*",
		"transmetro",
		"bus",
		"buses",
		"buseta*",
		"taxi*",
		"pasaje",
		"tarifa*",
		"fare*",
		"transporte",
		"transport",
		"moverme",
		"movilidad",
		"trancon",
		"traffic",
		"alerta de arroyo",
		"arroyos hoy",
	],
	city_reports: [
		"reportar",
		"reporte*",
		"report",
		"denunci*",
		"queja*",
		"hueco*",
		"bache*",
		"pothole*",
		"basura",
		"trash",
		"danad*",
		"roto",
		"rota",
		"broken",
		"inundad*",
		"flooded",
		"arroyo crecido",
		"se crecio",
		"alumbrado",
		"poste*",
		"fuga",
		"emergencia*",
		"emergency",
		"accidente*",
		"peligro*",
		"cobro de mas",
		"me cobraron",
		"overcharg*",
		"inseguridad",
	],
	account: [
		"mi perfil",
		"perfil",
		"profile",
		"mi cuenta",
		"cuenta",
		"account",
		"mis inscripciones",
		"mis eventos",
		"mis planes",
		"mis publicaciones",
		"my registrations",
		"iniciar sesion",
		"inicio de sesion",
		"cerrar sesion",
		"sign in",
		"log in",
		"login",
		"crear cuenta",
		"crear una cuenta",
		"registrarme en la plataforma",
		"contrasena",
		"password",
		"estoy inscrito",
		"estoy inscrita",
	],
	// Only specific words: generic "datos", "precio" or "tarifa" stay with
	// agenda and mobility.
	city_data: [
		"novedad*",
		"aviso",
		"avisos",
		"noticia*",
		"news",
		"datos abiertos",
		"open data",
		"dataset*",
		"estadistica*",
		"statistic*",
		"historic*",
		"historia",
		"simulacion",
		"simulador",
		"simulation",
		"indicador*",
		"indicator*",
		"sintetic*",
		"synthetic",
		"tendencia*",
		"trends",
		"ocupacion",
		"occupancy",
		"aforo",
	],
	// The orchestrator has no keywords of its own: it takes compound requests.
	quillart: [],
};

/**
 * Portuguese and French keywords, kept apart so the Spanish and English lists
 * stay as they were. None of them is a Spanish word or shares a prefix with
 * one, so Spanish messages score exactly as before.
 */
const OTHER_LANGUAGE_KEYWORDS: Record<AssistantAgentId, string[]> = {
	agenda: [
		"evenement*",
		"fim de semana",
		"week end",
		"ce soir",
		"esta noite",
		"festa*",
		"fete*",
		"concert",
		"concerts",
		"atelier*",
		"sortie*",
		"inscrev*",
		"inscrire*",
		"o que tem",
	],
	community: [
		"comunidade",
		"communaute",
		"vizinho*",
		"voisin*",
		"discussion*",
		"o que se fala",
		"qu on dit",
	],
	places: [
		"lieu",
		"lieux",
		"endroit*",
		"praia*",
		"plage*",
		"museu*",
		"musee*",
		"natureza",
		"parc",
		"parcs",
		"passaro*",
		"oiseau*",
		"visiter",
		"conhecer",
		"tourisme",
		"o que fazer",
		"que faire",
		"quoi faire",
		"ar livre",
		"plein air",
	],
	mobility: [
		"como chego",
		"como chegar",
		"comment aller",
		"comment y aller",
		"comment me rendre",
		"comment arriver",
		"onibus",
		"trajet*",
		"itineraire*",
		"passagem",
		"embouteillage*",
	],
	city_reports: [
		"signaler",
		"signalement*",
		"buraco*",
		"nid de poule",
		"nids de poule",
		"lixo",
		"ordures",
		"dechets",
		"inond*",
		"enchente*",
		"urgence*",
		"acidente*",
		"accident",
		"accidents",
		"perigo*",
		"danger*",
		"plainte",
	],
	account: [
		"meu perfil",
		"minha conta",
		"mon profil",
		"mon compte",
		"profil",
		"compte",
		"senha",
		"mot de passe",
		"se connecter",
		"connexion",
		"minhas inscricoes",
		"mes inscriptions",
		"meus eventos",
		"mes evenements",
	],
	city_data: [
		"novidade*",
		"nouveaute*",
		"actualite*",
		"dados abertos",
		"donnees ouvertes",
		"estatistica*",
		"statistique*",
		"simulacao",
		"indicateur*",
		"synthetique*",
		"frequentation",
		"lotacao",
	],
	// The orchestrator has no keywords of its own: it takes compound requests.
	quillart: [],
};

/** Score per agent; phrases (with a space) weigh 2, single words 1. */
export function keywordScores(text: string): Record<AssistantAgentId, number> {
	const normalized = normalizeText(text);
	const scores = {} as Record<AssistantAgentId, number>;
	for (const agent of AGENT_IDS) {
		const keywords = [
			...AGENT_KEYWORDS[agent],
			...OTHER_LANGUAGE_KEYWORDS[agent],
		];
		const phrases = keywords.filter((keyword) => keyword.includes(" "));
		const singles = keywords.filter((keyword) => !keyword.includes(" "));
		scores[agent] =
			2 * countKeywords(normalized, phrases) +
			countKeywords(normalized, singles);
	}
	return scores;
}

/** The agent the keywords clearly point to, or null when none or tied. */
export function routeByKeywords(text: string): AssistantAgentId | null {
	const ranked = rankByKeywords(text);
	if (ranked.length === 0) return null;
	if (ranked.length > 1 && ranked[0].score === ranked[1].score) return null;
	return ranked[0].agent;
}

function rankByKeywords(
	text: string,
): { agent: AssistantAgentId; score: number }[] {
	const scores = keywordScores(text);
	return AGENT_IDS.map((agent) => ({ agent, score: scores[agent] }))
		.filter((entry) => entry.score > 0)
		.sort((a, b) => b.score - a.score);
}

/** Words that join two requests in one message, in the four languages. */
const JOINERS = ["y", "e", "and", "et", "ademas", "tambien", "also", "aussi"];

/**
 * A request for several sections: keywords of two or more agents, either tied
 * on top or joined ("eventos hoy y cómo llego"). A weak extra match without a
 * joiner ("planes ... cerca del parque") stays with the top agent.
 */
export function isCompound(text: string): boolean {
	const ranked = rankByKeywords(text);
	if (ranked.length < 2) return false;
	if (ranked[0].score === ranked[1].score) return true;
	return countKeywords(normalizeText(text), JOINERS) > 0;
}

/** Every agent at least one keyword points to. */
export function matchedAgents(text: string): AssistantAgentId[] {
	return rankByKeywords(text).map((entry) => entry.agent);
}

/** Agents tied on top, in tie-break order; empty when no keyword matched. */
function tiedAgents(text: string): AssistantAgentId[] {
	const ranked = rankByKeywords(text);
	if (ranked.length === 0) return [];
	const top = ranked[0].score;
	const tied = new Set(
		ranked.filter((entry) => entry.score === top).map((entry) => entry.agent),
	);
	return TIE_BREAK_ORDER.filter((agent) => tied.has(agent));
}

const FOLLOW_UP_KEYWORDS = [
	"si",
	"sii",
	"no",
	"dale",
	"ok",
	"okay",
	"vale",
	"listo",
	"claro",
	"de una",
	"hagale",
	"hazlo",
	"confirmo",
	"perfecto",
	"gracias",
	"ese",
	"esa",
	"eso",
	"este",
	"esta",
	"el primero",
	"el segundo",
	"el tercero",
	"el cuarto",
	"el ultimo",
	"la primera",
	"la segunda",
	"la tercera",
	"la ultima",
	"primero",
	"segundo",
	"tercero",
	"ultimo",
	"otro",
	"otra",
	"mas",
	"inscribeme",
	"anotame",
	"yes",
	"sure",
	"the first",
	"the second",
	"the third",
	"that one",
	"more",
	"sim",
	"isso",
	"o primeiro",
	"o segundo",
	"obrigado",
	"obrigada",
	"oui",
	"d accord",
	"le premier",
	"le deuxieme",
	"celui la",
	"merci",
];

const MAX_FOLLOW_UP_WORDS = 5;

/** A short reply that only makes sense after the previous assistant turn. */
export function isFollowUp(text: string): boolean {
	const normalized = normalizeText(text);
	const wordCount = normalized.trim().split(" ").filter(Boolean).length;
	if (wordCount === 0 || wordCount > MAX_FOLLOW_UP_WORDS) return false;
	return (
		hasAnyKeyword(normalized, FOLLOW_UP_KEYWORDS) ||
		routeByKeywords(text) === null
	);
}

function lastAssistantAgent(
	messages: AssistantMessage[],
): AssistantAgentId | null {
	for (let index = messages.length - 1; index >= 0; index -= 1) {
		const message = messages[index];
		if (message.role === "assistant") return message.agent;
	}
	return null;
}

/** Text of the latest user message, or "" when there is none. */
export function latestUserText(messages: AssistantMessage[]): string {
	for (let index = messages.length - 1; index >= 0; index -= 1) {
		const message = messages[index];
		if (message.role === "user") return message.text;
	}
	return "";
}

/** Words that ask what something means, in the four languages. */
const MEANING_CUES = [
	"significa*",
	"significado",
	"quiere decir",
	"que es",
	"que son",
	"what does",
	"what is",
	"mean",
	"means",
	"meaning",
	"define",
	"o que e",
	"quer dizer",
	"veut dire",
	"c est quoi",
	"qu est ce",
	"signifie",
];

/**
 * Every other word a slang question may carry besides the term: the meaning
 * cue itself, articles, courtesy and "here / in Barranquilla". Anything else
 * ("¿qué es el trancón en la vía 40 hoy?") makes it a different question.
 */
const SLANG_QUESTION_WORDS = new Set([
	...[
		"que significa significan significado quiere decir es son eso esto esa este",
		"what does is s mean means meaning define that this the word",
		"o que e quer dizer isso palavra significa",
		"c est quoi qu ce veut dire signifie mot",
		"un una el la lo los las a an um uma le les une de del da do du",
		"palabra expresion termino term expression termo jerga slang giria argot",
		"en in em a barranquilla costa costeno costenol aqui here aca",
		"por favor please oye hey quillart y and me dime explicame explica tell",
		"espanol ingles english spanish portugues frances french anglais",
	].flatMap((line) => line.split(" ")),
]);

/**
 * The glossary term a message asks the meaning of ("¿qué significa bacano?",
 * "what does mamar gallo mean"), or null for any other message.
 */
export function slangQuestionTerm(text: string): string | null {
	const normalized = normalizeText(text);
	if (!hasAnyKeyword(normalized, MEANING_CUES)) return null;
	for (const term of SLANG_TERMS) {
		const key = normalizeText(term).trim();
		if (!key || !hasKeyword(normalized, key)) continue;
		const rest = normalized.replace(` ${key} `, " ").trim().split(" ");
		if (rest.every((word) => word === "" || SLANG_QUESTION_WORDS.has(word))) {
			return term;
		}
	}
	return null;
}

/** Choice question over the agents; only the message text leaves the server. */
export async function routeWithOpenJev(
	client: OpenJevClient,
	text: string,
): Promise<AssistantAgentId | null> {
	let result: Awaited<ReturnType<OpenJevClient["decide"]>>;
	try {
		result = await client.decide(
			{ message: text },
			{
				agent: {
					type: "choice",
					instructions:
						"Which section of a Barranquilla citizen platform should answer this message? The message may be written in Spanish, English, Portuguese or French.",
					criteria: Object.fromEntries(
						AGENT_IDS.map((agent) => [agent, AGENTS[agent].description]),
					),
				},
			},
		);
	} catch {
		return null;
	}
	if (!result.ok) return null;
	const answer = result.answers.agent;
	if (answer?.type !== "choice") return null;
	if (!(AGENT_IDS as readonly string[]).includes(answer.choice)) return null;
	if (answer.confidence < MIN_ROUTING_CONFIDENCE) return null;
	return answer.choice as AssistantAgentId;
}

export async function routeMessage(
	messages: AssistantMessage[],
	context: AssistantContext,
	deps: RouteDeps,
): Promise<RouteDecision> {
	const previous = lastAssistantAgent(messages);
	const latest = messages.at(-1);
	if (previous && latest?.role === "tool") {
		return { agent: previous, routedBy: "continuation" };
	}

	const text = latestUserText(messages);
	// Only Places holds lookup_slang: a slang question never stays elsewhere.
	if (slangQuestionTerm(text)) return { agent: "places", routedBy: "keywords" };

	const byKeywords = routeByKeywords(text);
	// A follow-up that clearly names another section ("¿y planes esta noche?")
	// goes there; otherwise it stays with the previous agent.
	if (
		previous &&
		isFollowUp(text) &&
		(byKeywords === null || byKeywords === previous)
	) {
		return { agent: previous, routedBy: "continuation" };
	}

	// Several sections in one request ("eventos hoy y cómo llego"): the
	// orchestrator agent holds every tool and answers each part.
	if (isCompound(text)) {
		return { agent: ORCHESTRATOR_AGENT, routedBy: "keywords" };
	}

	if (byKeywords) return { agent: byKeywords, routedBy: "keywords" };

	const tied = tiedAgents(text);
	const screenAgent = agentForScreen(context.screen);
	if (screenAgent && (tied.length === 0 || tied.includes(screenAgent))) {
		return { agent: screenAgent, routedBy: "screen" };
	}

	if (deps.openJev && text.trim() !== "") {
		const chosen = await routeWithOpenJev(deps.openJev, text);
		if (chosen) return { agent: chosen, routedBy: "openjev" };
	}

	return { agent: tied[0] ?? ORCHESTRATOR_AGENT, routedBy: "keywords" };
}
