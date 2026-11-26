import type { CorridorZone } from "../corridor/corridor-types";

/**
 * Writes simulated counts to zone_visitor_counts. Only the city role may write
 * (RLS), and every row stays marked as simulated.
 */
export async function writeSimulatedCounts(
	counts: Record<CorridorZone, number>,
): Promise<void> {
	const { supabase } = await import("../supabase");
	const results = await Promise.all(
		Object.entries(counts).map(([zone, visitors]) =>
			supabase
				.from("zone_visitor_counts")
				.update({ active_visitors: visitors, is_simulated: true })
				.eq("zone", zone),
		),
	);
	const failed = results.find((result) => result.error);
	if (failed?.error) {
		throw new Error(failed.error.message);
	}
}
