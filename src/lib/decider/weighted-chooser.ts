import type { Chooser, DecisionWeights, RouteOption } from "./decider-types";

export const DEFAULT_WEIGHTS: DecisionWeights = {
	duration: 0.45,
	fare: 0.25,
	crowd: 0.15,
	shade: 0.15,
};

type Criterion = keyof DecisionWeights;

/** Value of each criterion per option; lower is better, so shade counts negative. */
const criterionValue: Record<Criterion, (option: RouteOption) => number> = {
	duration: (option) => option.durationMinutes,
	fare: (option) => option.fareCop,
	crowd: (option) => option.crowdLevel,
	shade: (option) => -(option.shadeShare ?? 0),
};

/** Maps each value to 0..1 where 1 is the best (lowest) value among the options. */
function normalizeLowerIsBetter(values: number[]): number[] {
	const min = Math.min(...values);
	const max = Math.max(...values);
	return values.map((value) => (max - value) / (max - min));
}

/**
 * Weighted score per option, from 0 (worst on every criterion) to 1 (best on every criterion).
 * A criterion where every option is the same says nothing about which is better, so it is
 * left out and the other weights share its part. With no difference at all, every option scores 1.
 */
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
	let usedWeight = 0;
	for (const criterion of criteria) {
		const values = options.map(criterionValue[criterion]);
		if (Math.min(...values) === Math.max(...values)) continue;
		usedWeight += weights[criterion];
		normalizeLowerIsBetter(values).forEach((value, index) => {
			scores[index] += weights[criterion] * value;
		});
	}
	if (usedWeight <= 0) return options.map(() => 1);
	return scores.map((score) => score / usedWeight);
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

/** Below this share of shaded stops a route is not called "with shade". */
export const SHADED_ROUTE_MIN_SHARE = 1;

/** True when every stop of the route has shade, so the visitor can be told so. */
export function isShadedRoute(option: RouteOption): boolean {
	return (option.shadeShare ?? 0) >= SHADED_ROUTE_MIN_SHARE;
}
