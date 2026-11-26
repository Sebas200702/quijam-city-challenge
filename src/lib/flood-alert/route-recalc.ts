import { type Decision, decide, type RouteOption } from "../decider";
import type { FloodZoneRef } from "./flood-countdown";

export interface RouteRecalc {
	/** True when the current route crosses a blocked arroyo and the visitor gets a new one. */
	changed: boolean;
	decision: Decision;
	/** One short sentence for the visitor. Details stay in "ver detalles". */
	reason: string | null;
}

/**
 * Checks the visitor's current route against blocked arroyos and picks a new
 * one with the Decider when needed. The Decider's hard rules make sure the new
 * route never crosses a blocked arroyo.
 */
export function recalculateRoute(input: {
	currentOptionId: string | null;
	options: readonly RouteOption[];
	blockedFloodZoneIds: readonly string[];
	floodZones: readonly FloodZoneRef[];
	accessibleMode: boolean;
}): RouteRecalc {
	const blocked = new Set(input.blockedFloodZoneIds);
	const decision = decide(
		{ activeFloodZoneIds: [...blocked], accessibleMode: input.accessibleMode },
		[...input.options],
	);
	const current = input.options.find(
		(option) => option.id === input.currentOptionId,
	);
	const crossed =
		current?.floodZoneIds.filter((code) => blocked.has(code)) ?? [];
	if (!current || crossed.length === 0) {
		return { changed: false, decision, reason: null };
	}

	const names = crossed.map(
		(code) => input.floodZones.find((zone) => zone.code === code)?.name ?? code,
	);
	const reason = decision.option
		? `Cambiamos tu ruta a ${decision.option.label}: evitamos ${names.join(" y ")}.`
		: `Tu ruta cruza ${names.join(" y ")} y ahora no hay una ruta segura. Espera en un lugar seguro o busca a un anfitrión.`;
	return { changed: true, decision, reason };
}
