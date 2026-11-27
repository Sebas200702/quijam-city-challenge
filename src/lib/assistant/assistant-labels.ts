// Names of the specialized agents (in the interface language), shown next to each answer.

import { messages } from "../i18n/messages";
import { getLanguage } from "../i18n/use-language";
import type { AssistantAgentId } from "./assistant-types";

export const AGENT_LABELS: Record<AssistantAgentId, string> = new Proxy(
	{} as Record<AssistantAgentId, string>,
	{
		get: (_target, key) =>
			typeof key === "string"
				? (messages[getLanguage()].shared.agents as Record<string, string>)[key]
				: undefined,
		has: (_target, key) =>
			typeof key === "string" && key in messages.es.shared.agents,
		ownKeys: () => Object.keys(messages.es.shared.agents),
		getOwnPropertyDescriptor: (_target, key) =>
			typeof key === "string" && key in messages.es.shared.agents
				? { enumerable: true, configurable: true }
				: undefined,
	},
);

/** Where the conversation lives; `?q=` starts it with a question. */
export const ASSISTANT_HREF = "/inicio";

export function askHref(prompt: string): string {
	return `${ASSISTANT_HREF}?q=${encodeURIComponent(prompt)}`;
}
