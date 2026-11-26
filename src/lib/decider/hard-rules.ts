import type {
	DecisionState,
	DiscardedOption,
	DiscardReason,
	RouteOption,
} from "./decider-types";

function discardReason(
	state: DecisionState,
	option: RouteOption,
): DiscardReason | null {
	const activeFloods = new Set(state.activeFloodZoneIds);
	if (option.floodZoneIds.some((zoneId) => activeFloods.has(zoneId))) {
		return "active-flood";
	}
	if (state.accessibleMode && !option.accessible) {
		return "not-accessible";
	}
	return null;
}

/**
 * Safety rules that no model can override: drop routes crossing an active flood
 * and, in accessible mode, routes that are not accessible.
 */
export function applyHardRules(
	state: DecisionState,
	options: RouteOption[],
): { allowed: RouteOption[]; discarded: DiscardedOption[] } {
	const allowed: RouteOption[] = [];
	const discarded: DiscardedOption[] = [];
	for (const option of options) {
		const reason = discardReason(state, option);
		if (reason) {
			discarded.push({ optionId: option.id, reason });
		} else {
			allowed.push(option);
		}
	}
	return { allowed, discarded };
}
