// Content for the public landing page: short labels, illustrations and the
// example questions that open Quillart AI.

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
	prompt("Planes gratis este finde"),
	prompt("Quiero publicar un evento"),
	prompt("Reportar un arroyo"),
];

export interface AgentTile {
	id: AssistantAgentId;
	title: string;
	illustration: string;
	example: ExamplePrompt;
}

/** One tile per specialized agent: an illustration, a few words and a question. */
export const AGENT_TILES: AgentTile[] = [
	{
		id: "agenda",
		title: "Encuentra planes",
		illustration: "/illustrations/celebration.svg",
		example: prompt("¿Qué hay para hacer hoy?"),
	},
	{
		id: "community",
		title: "Conecta con tus vecinos",
		illustration: "/illustrations/neighbors.svg",
		example: prompt("Quiero abrir un foro de mi barrio"),
	},
	{
		id: "places",
		title: "Sal a la naturaleza",
		illustration: "/illustrations/among-nature.svg",
		example: prompt("Un plan de naturaleza cerca"),
	},
	{
		id: "mobility",
		title: "Llega sin trancón",
		illustration: "/illustrations/directions.svg",
		example: prompt("¿Cómo llego al Malecón?"),
	},
	{
		id: "city_reports",
		title: "Avisa a la ciudad",
		illustration: "/illustrations/alert.svg",
		example: prompt("Hay un hueco en mi calle"),
	},
	{
		id: "account",
		title: "Todo lo tuyo",
		illustration: "/illustrations/mobile-profile.svg",
		example: prompt("¿A qué estoy inscrito?"),
	},
];
