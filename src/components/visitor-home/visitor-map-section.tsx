import type {
	CorridorData,
	CorridorDataSource,
} from "../../lib/corridor/corridor-types";
import { MAP_NEXT_STEP } from "../../lib/home-content";
import { APP_HOME_HREF } from "../home/nav-sections";
import CorridorMap from "../map/corridor-map";
import { MapErrorBoundary } from "./map-error-boundary";
import { MapErrorState } from "./map-error-state";
import { useVisitorLanguage } from "./use-visitor-language";
import "./visitor-map.css";
import "./visitor-sheets.css";

interface VisitorMapSectionProps {
	data: CorridorData;
	source: CorridorDataSource;
}

/**
 * The /mapa section: the corridor map, full-bleed, and its error state. No suggested
 * trip on arrival: a route shows up only when the visitor asks for one (Quillart AI's
 * `map.showRoute`, or `/mapa?destino=`), in the map's own dismissible route sheet.
 */
export default function VisitorMapSection({
	data,
	source,
}: VisitorMapSectionProps) {
	const { language, copy } = useVisitorLanguage();
	const askHref = `${APP_HOME_HREF}?q=${encodeURIComponent(
		copy.askRoute(MAP_NEXT_STEP.destinationName),
	)}`;

	return (
		<div className="visitor-map">
			<MapErrorBoundary
				fallback={
					<MapErrorState copy={copy} lang={language} askHref={askHref} />
				}
			>
				{/* No match-day timeline here: visitors ignore `tiempo`; it lives in the city
				    dashboard and the presenter panel (docs/26 §3, docs/30 U39). */}
				<CorridorMap data={data} source={source} />
			</MapErrorBoundary>
		</div>
	);
}
