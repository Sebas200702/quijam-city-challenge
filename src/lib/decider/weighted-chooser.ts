import type { Chooser, DecisionWeights, RouteOption } from "./decider-types";

export const DEFAULT_WEIGHTS: DecisionWeights = {
	duration: 0.5,
	fare: 0.3,
	crowd: 0.2,
};

type Criterion = keyof DecisionWeights;

const criterionValue: Record<Criterion, (option: RouteOption) => number> = {
	duration: (option) => option.durationMinutes,
	fare: (option) => option.fareCop,
	crowd: (option) => option.crowdLevel,
};

/** Maps each value to 0..1 where 1 is the best (lowest) value among the options. */
function normalizeLowerIsBetter(values: number[]): number[] {
	const min = Math.min(...values);
	const max = Math.max(...values);
	if (max === min) {
		return values.map(() => 1);
	}
	return values.map((value) => (max - value) / (max - min));
}

/** Weighted score per option, from 0 (worst on every criterion) to 1 (best on every criterion). */
export function scoreOptions(
	options: RouteOption[],
	weights: DecisionWeights,
): number[] {
	const criteria = Object.keys(weights) as Criterion[];
	const totalWeight = criteria.reduce(
		(sum, criterion) => sum + weights[criterion],
		0,
	);
	if (totalWeight <= 0) {
		throw new Error("Decision weights must add up to more than 0.");
	}
	const scores = options.map(() => 0);
	for (const criterion of criteria) {
		const normalized = normalizeLowerIsBetter(
			options.map(criterionValue[criterion]),
		);
		normalized.forEach((value, index) => {
			scores[index] += (weights[criterion] / totalWeight) * value;
		});
	}
	return scores;
}

/**
 * Fallback chooser when OpenJev does not run: highest weighted score wins.
 * Confidence grows with the gap to the runner-up: 0.5 on a tie, 1 when the
 * winner is best on everything and the runner-up worst, 1 with a single option.
 */
export function createWeightedChooser(
	weights: DecisionWeights = DEFAULT_WEIGHTS,
): Chooser {
	return (_state, options) => {
		if (options.length === 0) {
			throw new Error("The weighted chooser needs at least one option.");
		}
		const scores = scoreOptions(options, weights);
		const ranked = scores
			.map((score, index) => ({ score, index }))
			.sort((a, b) => b.score - a.score);
		const best = ranked[0];
		const runnerUp = ranked[1];
		const confidence = runnerUp ? 0.5 + 0.5 * (best.score - runnerUp.score) : 1;
		return { optionId: options[best.index].id, confidence };
	};
}
