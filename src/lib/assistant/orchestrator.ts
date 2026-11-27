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
// 3. OpenJev. When keywords are null or tied and a client exists, a choice
//    question over the six agent descriptions; accepted at confidence >= 0.35.
//    Only the person's message text is sent (no names, no context).
// 4. Default. A tie is broken by section priority (reports and mobility are
//    time sensitive), and with no signal at all the Agenda agent answers: it is
//    the main reason people open the platform ("¿qué hay pa' hacer?" questions
//    without a place go to Places through the keywords instead).

import type { OpenJevClient } from "../openjev/openjev-types";
import { AGENT_IDS, AGENTS } from "./assistant-agents";
import { countKeywords, hasAnyKeyword, normalizeText } from "./assistant-text";
import type {
	AssistantAgentId,
	AssistantContext,
	AssistantMessage,
	AssistantResponse,
} from "./assistant-types";

export const MIN_ROUTING_CONFIDENCE = 0.35;
export const DEFAULT_AGENT: AssistantAgentId = "agenda";

/** Tie-break order, most time-sensitive first. */
const TIE_BREAK_ORDER: readonly AssistantAgentId[] = [
	"city_reports",
	"mobility",
	"account",
	"agenda",
	"community",
	"places",
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
	],
	mobility: [
		"como llego",
		"como llegar",
		"como me voy",
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
	_context: AssistantContext,
	deps: RouteDeps,
): Promise<RouteDecision> {
	const previous = lastAssistantAgent(messages);
	const latest = messages.at(-1);
	if (previous && latest?.role === "tool") {
		return { agent: previous, routedBy: "continuation" };
	}

	const text = latestUserText(messages);
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

	if (byKeywords) return { agent: byKeywords, routedBy: "keywords" };

	if (deps.openJev && text.trim() !== "") {
		const chosen = await routeWithOpenJev(deps.openJev, text);
		if (chosen) return { agent: chosen, routedBy: "openjev" };
	}

	const tied = tiedAgents(text);
	return { agent: tied[0] ?? DEFAULT_AGENT, routedBy: "keywords" };
}
