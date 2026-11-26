import type { OpenJevClient } from "../openjev/openjev-types";
import type { AsyncChooser, RouteOption } from "./decider-types";

function describeOption(option: RouteOption): string {
	const fare = option.fareCop === 0 ? "free" : `${option.fareCop} COP`;
	const crowd = Math.round(option.crowdLevel * 100);
	return `${option.label}: ${option.durationMinutes} min, ${fare}, crowding ${crowd}%`;
}

/**
 * Adapts the OpenJev client to the Decider. Only sends route summaries and the
 * accessibility flag: no location or personal data leaves the server.
 */
export function createOpenJevChooser(client: OpenJevClient): AsyncChooser {
	return async (state, options) => {
		const criteria = Object.fromEntries(
			options.map((option) => [option.id, describeOption(option)]),
		);
		const result = await client.decide(
			{
				context: "Barranquilla resident or visitor choosing a route",
				needs_accessible_route: state.accessibleMode,
			},
			{
				route: {
					type: "choice",
					instructions:
						"Which route is best for this visitor: arrives on time, low cost, low crowding, low emissions",
					criteria,
				},
			},
		);
		if (!result.ok) return null;
		const answer = result.answers.route;
		if (answer?.type !== "choice") return null;
		return { optionId: answer.choice, confidence: answer.confidence };
	};
}
