import { useEffect, useState } from "react";
import { ambAnchor } from "../../lib/geo/amb-boundary";
import type { Messages } from "../../lib/i18n/messages";
import {
	type MapPoint,
	type PointLayer,
	registeredMapLayers,
} from "./map-layer-registry";

export interface LoadedPointLayer {
	layer: PointLayer;
	/** Points the map draws, already moved onto the AMB when they sat on the water. */
	points: MapPoint[];
	/** Ids that fall outside the Metropolitan Area: listed elsewhere, never drawn. */
	outside: Set<string>;
	status: "loading" | "ready" | "error";
}

/** Loads every registered point layer; each one fails on its own without breaking the map. */
export function usePointLayers(t: Messages): LoadedPointLayer[] {
	const [loaded, setLoaded] = useState<LoadedPointLayer[]>(() =>
		registeredMapLayers().map((layer) => ({
			layer,
			points: [],
			outside: new Set(),
			status: "loading",
		})),
	);

	useEffect(() => {
		let cancelled = false;
		const layers = registeredMapLayers();
		const update = (index: number, next: LoadedPointLayer) => {
			if (cancelled) return;
			setLoaded((current) => {
				const copy = [...current];
				copy[index] = next;
				return copy;
			});
		};
		layers.forEach((layer, index) => {
			layer
				.load(t)
				.then((points) => {
					const inside: MapPoint[] = [];
					const outside = new Set<string>();
					for (const point of points) {
						const anchor = ambAnchor(point.lat, point.lng);
						if (anchor)
							inside.push({ ...point, lat: anchor[0], lng: anchor[1] });
						else outside.add(point.id);
					}
					update(index, { layer, points: inside, outside, status: "ready" });
				})
				.catch(() =>
					update(index, {
						layer,
						points: [],
						outside: new Set(),
						status: "error",
					}),
				);
		});
		return () => {
			cancelled = true;
		};
	}, [t]);

	return loaded;
}
