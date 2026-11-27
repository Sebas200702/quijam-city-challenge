// Leaflet only loads on the pages that show a map: the point picker of the forms and
// the minimap of a detail page come in their own chunk (docs/30, U08, U15).

import { lazy, Suspense } from "react";
import type { MiniMapProps } from "../map/mini-map";
import type { PointPickerProps } from "../map/point-picker";
import { Loading } from "./community-ui";

const PointPicker = lazy(() => import("../map/point-picker"));
const MiniMap = lazy(() => import("../map/mini-map"));

export function LazyPointPicker(props: PointPickerProps) {
	return (
		<Suspense fallback={<Loading />}>
			<PointPicker {...props} />
		</Suspense>
	);
}

export function LazyMiniMap(props: MiniMapProps) {
	return (
		<Suspense fallback={<div className="h-[168px]" aria-hidden="true" />}>
			<MiniMap {...props} />
		</Suspense>
	);
}
