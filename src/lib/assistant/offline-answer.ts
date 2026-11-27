// Quillart AI without network (#47): the same orchestrator keywords and
// local agents as the server, run on the phone. Nothing can be published or
// sent offline, so action tools are dropped and the person is told why.

import { AGENTS } from "./assistant-agents";
import {
	type AssistantRequest,
	type AssistantResponse,
	type AssistantToolCall,
	isActionTool,
} from "./assistant-types";
import { answerLocally } from "./local-agents";
import { routeMessage } from "./orchestrator";

export interface OfflineNotes {
	/** Before the first answer of a turn: "Sin conexión: …". */
	offline: string;
	/** When the agent wanted to publish, register or report. */
	noActions: string;
}

export async function answerOffline(
	request: AssistantRequest,
	notes: OfflineNotes,
	newId: () => string = () => crypto.randomUUID(),
): Promise<AssistantResponse> {
	const { messages, context } = request;
	const { agent, routedBy } = await routeMessage(messages, context, {
		openJev: null,
	});
	const turn = answerLocally(agent, messages, context);
	const allowed = turn.toolCalls.filter((call) =>
		AGENTS[agent].tools.includes(call.name),
	);
	const reads = allowed.filter((call) => !isActionTool(call.name));
	const text = reads.length < allowed.length ? notes.noActions : turn.text;
	// A wrap-up after tool results continues the same answer: no second note.
	const wrapUp = messages.at(-1)?.role === "tool";
	return {
		agent,
		routedBy,
		text: wrapUp ? text : `${notes.offline} ${text}`,
		toolCalls: reads.map(
			(call) => ({ id: newId(), ...call }) as AssistantToolCall,
		),
		source: "local",
		suggestions: AGENTS[agent].suggestions,
	};
}
