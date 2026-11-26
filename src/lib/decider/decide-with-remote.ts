import type {
	AsyncChooser,
	Chooser,
	DecisionState,
	DecisionWithSource,
	RouteOption,
} from "./decider-types";
import { applyHardRules } from "./hard-rules";
import { createWeightedChooser } from "./weighted-chooser";

/** Below this confidence the remote answer is ignored and the weighted score decides. */
export const DEFAULT_MIN_CONFIDENCE = 0.35;

export interface DecideWithRemoteOptions {
	/** OpenJev or any async chooser. Optional: without it the weighted score decides. */
	remote?: AsyncChooser;
	minConfidence?: number;
	fallback?: Chooser;
}

function clamp01(value: number): number {
	if (Number.isNaN(value)) return 0;
	return Math.min(1, Math.max(0, value));
}

/**
 * Decider with an async chooser. Hard rules run first and always win; the
 * remote chooser only sees allowed options. Any remote failure, low confidence
 * or disallowed pick falls back to the weighted score.
 */
export async function decideWithRemote(
	state: DecisionState,
	options: RouteOption[],
	settings: DecideWithRemoteOptions = {},
): Promise<DecisionWithSource> {
	const { allowed, discarded } = applyHardRules(state, options);
	if (allowed.length === 0) {
		return { option: null, confidence: 0, discarded, chosenBy: "none" };
	}

	const minConfidence = settings.minConfidence ?? DEFAULT_MIN_CONFIDENCE;
	if (settings.remote) {
		try {
			const result = await settings.remote(state, allowed);
			const option = result
				? allowed.find((candidate) => candidate.id === result.optionId)
				: undefined;
			if (result && option && result.confidence >= minConfidence) {
				return {
					option,
					confidence: clamp01(result.confidence),
					discarded,
					chosenBy: "openjev",
				};
			}
		} catch {
			// Fall through to the weighted score.
		}
	}

	const fallback = settings.fallback ?? createWeightedChooser();
	const result = fallback(state, allowed);
	const option =
		allowed.find((candidate) => candidate.id === result.optionId) ?? allowed[0];
	return {
		option,
		confidence: clamp01(result.confidence),
		discarded,
		chosenBy: "weighted",
	};
}
