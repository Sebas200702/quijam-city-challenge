import { useEffect, useMemo, useRef, useState } from "react";
import type {
	CorridorData,
	CorridorDataSource,
} from "../../lib/corridor/corridor-types";
import { MAP_NEXT_STEP } from "../../lib/home-content";
import { APP_HOME_HREF } from "../home/nav-sections";
import CorridorMap from "../map/corridor-map";
import { useRoutePlan } from "../map/use-route-plan";
import { MapErrorBoundary } from "./map-error-boundary";
import { MapErrorState } from "./map-error-state";
import { NextStepCard } from "./next-step-card";
import { useOnlineStatus } from "./use-online-status";
import { useVisitorLanguage } from "./use-visitor-language";
import "./visitor-map.css";
import "./visitor-sheets.css";

interface VisitorMapSectionProps {
	data: CorridorData;
	source: CorridorDataSource;
}

const NO_FLOODS: string[] = [];
const NO_CROWD = {};

/**
 * True when the map's bottom area shows something other than its route card: the one
 * allowed interruption (an active arroyo), the Guide or a tapped point. Then the
 * next-step card steps aside so it never hides them.
 */
function mapNeedsBottom(detail: Element): boolean {
	if (detail.querySelector('[role="alert"], .q-alert')) return true;
	const guide = detail.querySelector(".guide-panel");
	if (guide && !guide.closest("[hidden]")) return true;
	return detail.querySelector(".corridor-detail:not(.route-card)") !== null;
}

/**
 * The /mapa section: the corridor map, ONE "Tu siguiente paso" card with the Quillart AI bar
 * on top (mockup visitante/base-01-inicio, now a section and not the home), and the
 * loading, error and offline states. "Ver la ruta" hands the bottom to the map's route card.
 */
export default function VisitorMapSection({
	data,
	source,
}: VisitorMapSectionProps) {
	const { language, copy } = useVisitorLanguage();
	const online = useOnlineStatus();
	const [nextStepOpen, setNextStepOpen] = useState(true);
	const rootRef = useRef<HTMLDivElement>(null);
	const query = useMemo(
		() => ({
			origin: MAP_NEXT_STEP.origin,
			destination: MAP_NEXT_STEP.destination,
			accessibleMode: false,
		}),
		[],
	);
	const { plan, error } = useRoutePlan(query, NO_FLOODS, NO_CROWD);

	// Watch the map's bottom area and step aside when it needs the space.
	useEffect(() => {
		if (!nextStepOpen) return;
		const root = rootRef.current;
		if (!root) return;
		const check = () => {
			const detail = root.querySelector(".corridor-app__detail");
			if (detail && mapNeedsBottom(detail)) setNextStepOpen(false);
		};
		check();
		const observer = new MutationObserver(check);
		observer.observe(root, {
			subtree: true,
			childList: true,
			attributes: true,
			attributeFilter: ["hidden"],
		});
		return () => observer.disconnect();
	}, [nextStepOpen]);

	const askHref = `${APP_HOME_HREF}?q=${encodeURIComponent(
		copy.askRoute(MAP_NEXT_STEP.destinationName),
	)}`;

	return (
		<div
			ref={rootRef}
			className="visitor-map"
			data-next-step={nextStepOpen ? "open" : "closed"}
		>
			<MapErrorBoundary
				fallback={
					<MapErrorState copy={copy} lang={language} askHref={askHref} />
				}
			>
				<CorridorMap data={data} source={source} />
				{nextStepOpen ? (
					<NextStepCard
						copy={copy}
						lang={language}
						step={MAP_NEXT_STEP}
						plan={plan}
						failed={error !== null}
						online={online}
						onShowRoute={() => setNextStepOpen(false)}
						askHref={askHref}
					/>
				) : null}
			</MapErrorBoundary>
		</div>
	);
}
