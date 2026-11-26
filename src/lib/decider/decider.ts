import type {
	Chooser,
	Decision,
	DecisionState,
	RouteOption,
} from "./decider-types";
import { applyHardRules } from "./hard-rules";
import { createWeightedChooser } from "./weighted-chooser";

const defaultChooser = createWeightedChooser();

function clamp01(value: number): number {
	if (Number.isNaN(value)) {
		return 0;
	}
	return Math.min(1, Math.max(0, value));
}

/**
 * Decider: state + options -> option + confidence.
 * Hard rules run first and always win. The chooser (OpenJev or the weighted
 * score) only sees the options that passed. If the chooser fails or returns an
 * option that was not allowed, the weighted score decides instead.
 */
export function decide(
	state: DecisionState,
	options: RouteOption[],
	chooser: Chooser = defaultChooser,
): Decision {
	const { allowed, discarded } = applyHardRules(state, options);
	if (allowed.length === 0) {
		return { option: null, confidence: 0, discarded };
	}

	let result: ReturnType<Chooser>;
	try {
		result = chooser(state, allowed);
	} catch {
		result = defaultChooser(state, allowed);
	}

	let option = allowed.find((candidate) => candidate.id === result.optionId);
	if (!option) {
		result = defaultChooser(state, allowed);
		option = allowed.find((candidate) => candidate.id === result.optionId);
	}

	return {
		option: option ?? null,
		confidence: clamp01(result.confidence),
		discarded,
	};
}
