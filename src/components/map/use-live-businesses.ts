import { useEffect, useState } from "react";
import type { CorridorData } from "../../lib/corridor/corridor-types";

/**
 * Keeps the map's businesses current: when a vendor taps "Marcarme abierta"
 * (#49), Supabase Realtime sends the change and the pin and card update
 * without reloading. Without Supabase the data stays as loaded.
 */
export function useLiveBusinesses(data: CorridorData): CorridorData {
	const [live, setLive] = useState(data);

	useEffect(() => {
		setLive(data);
		let stop = () => {};
		let cancelled = false;
		void import("../../lib/supabase")
			.then(({ supabase }) => {
				if (cancelled) return;
				const channel = supabase
					.channel("map-businesses")
					.on(
						"postgres_changes",
						{ event: "UPDATE", schema: "public", table: "businesses" },
						({ new: row }) => {
							const changed = row as {
								code?: string;
								is_open?: boolean;
								name?: string;
							};
							if (!changed.code) return;
							setLive((current) => ({
								...current,
								businesses: current.businesses.map((business) =>
									business.code === changed.code
										? {
												...business,
												is_open: changed.is_open ?? business.is_open,
												name: changed.name ?? business.name,
											}
										: business,
								),
							}));
						},
					)
					.subscribe();
				stop = () => void supabase.removeChannel(channel);
			})
			.catch(() => {
				// No Supabase configured: the seed data is all there is.
			});
		return () => {
			cancelled = true;
			stop();
		};
	}, [data]);

	return live;
}
