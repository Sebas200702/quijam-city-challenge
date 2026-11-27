// Spanish names of the specialized agents, shown next to each answer.

import type { AssistantAgentId } from "./assistant-types";

export const AGENT_LABELS: Record<AssistantAgentId, string> = {
	agenda: "Agente de Agenda",
	community: "Agente de Comunidad",
	places: "Agente de Lugares y naturaleza",
	mobility: "Agente de Movilidad",
	city_reports: "Agente de Reportes a la ciudad",
	account: "Agente de tu Cuenta",
};

/** Where the conversation lives; `?q=` starts it with a question. */
export const ASSISTANT_HREF = "/inicio";

export function askHref(prompt: string): string {
	return `${ASSISTANT_HREF}?q=${encodeURIComponent(prompt)}`;
}
