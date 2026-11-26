// Copy for the public landing page: example questions, the six agents and the FAQ.

import { askHref } from "../../lib/assistant/assistant-labels";
import type { AssistantAgentId } from "../../lib/assistant/assistant-types";

export interface ExamplePrompt {
	label: string;
	href: string;
}

function prompt(label: string): ExamplePrompt {
	return { label, href: askHref(label) };
}

/** Chips under the hero ask box: one tap starts the conversation. */
export const HERO_PROMPTS: ExamplePrompt[] = [
	prompt("¿Qué planes gratis hay este fin de semana?"),
	prompt("Quiero publicar un evento de mi barrio"),
	prompt("¿Cómo llego al Malecón sin pasar por un arroyo?"),
	prompt("Quiero reportar una luminaria dañada"),
];

export interface AgentCardContent {
	id: AssistantAgentId;
	name: string;
	/** What the agent lets the person do, starting with the verb. */
	action: string;
	description: string;
	example: ExamplePrompt;
	tone: "gold" | "green" | "red";
}

export const AGENT_CARDS: AgentCardContent[] = [
	{
		id: "agenda",
		name: "Agenda",
		action: "Encuentra planes e inscríbete",
		description:
			"Busca por fecha, barrio o tema, te inscribe cuando confirmas y te ayuda a publicar tu propio evento.",
		example: prompt("¿Qué hay para hacer hoy en la tarde?"),
		tone: "gold",
	},
	{
		id: "community",
		name: "Comunidad",
		action: "Publica y conversa",
		description:
			"Te muestra los foros de tu barrio, abre una conversación nueva y publica tus respuestas.",
		example: prompt("Quiero abrir un foro sobre huertas urbanas"),
		tone: "green",
	},
	{
		id: "places",
		name: "Lugares y naturaleza",
		action: "Encuentra parques, ciénagas y espacios",
		description:
			"Qué hay en cada lugar, horarios, si es gratis y si es accesible, y qué planes hay allí.",
		example: prompt("¿Dónde puedo caminar cerca del río al atardecer?"),
		tone: "green",
	},
	{
		id: "mobility",
		name: "Movilidad",
		action: "Llega sin trancón ni arroyos",
		description:
			"Rutas a pie, en bus o en taxi, la tarifa justa de referencia y las alertas de arroyo antes de salir.",
		example: prompt("¿Cómo llego al Estadio Metropolitano?"),
		tone: "gold",
	},
	{
		id: "city_reports",
		name: "Reportes a la ciudad",
		action: "Reporta lo que ves en la calle",
		description:
			"Un hueco, una luminaria, basura o un cobro abusivo: el reporte llega a la ciudad y puedes ver su estado.",
		example: prompt("Quiero reportar basura en el parque de mi barrio"),
		tone: "red",
	},
	{
		id: "account",
		name: "Tu cuenta",
		action: "Organiza lo tuyo",
		description:
			"Tu perfil, los eventos a los que vas y lo que has publicado, en un solo lugar.",
		example: prompt("¿A qué eventos estoy inscrito?"),
		tone: "gold",
	},
];

export interface FaqItem {
	question: string;
	answer: string;
}

export const FAQ_ITEMS: FaqItem[] = [
	{
		question: "¿Necesito cuenta?",
		answer:
			"No para explorar: puedes preguntar, ver la agenda, los foros y los lugares sin registrarte. Para inscribirte, publicar un evento o comentar sí necesitas una cuenta, y crearla toma un minuto.",
	},
	{
		question: "¿Es gratis?",
		answer:
			"Sí. Usar Quillart no cuesta nada. Cada evento dice si es gratis o cuánto vale la entrada, para que lo sepas antes de inscribirte.",
	},
	{
		question: "¿Quién modera?",
		answer:
			"Todo lo que se publica pasa primero por un filtro automático. Lo que es claramente aceptable se publica; lo dudoso lo revisa una persona del equipo de moderación antes de mostrarse, y los riesgos en el espacio público se envían a la ciudad.",
	},
	{
		question: "¿Qué datos guardan?",
		answer:
			"Tu nombre visible, tu correo, tu barrio si lo indicas, tus inscripciones y lo que publicas. Tratamos tus datos según la Ley 1581 de 2012 y tus datos personales nunca se envían al servicio de moderación automática.",
	},
	{
		question: "¿Puedo usar la voz?",
		answer:
			"Sí. Toca el micrófono y habla en tu idioma; Quillart AI convierte lo que dices en texto y te puede responder en voz alta. La voz es solo el canal: escribir siempre funciona igual.",
	},
];
