import type { RouteOption } from "../decider";
import type { RouteSegment, SegmentMode } from "./route-segments-seed";

const MODE_LABELS: Record<SegmentMode, string> = {
	walk: "a pie",
	bus: "bus",
	transmetro: "Transmetro",
	taxi_verified: "taxi verificado",
	bike: "bici",
};

/** No crowd data per route yet: every option gets the same neutral value. */
const NEUTRAL_CROWD = 0.5;

function toOption(path: RouteSegment[]): RouteOption {
	const modes = [...new Set(path.map((segment) => MODE_LABELS[segment.mode]))];
	return {
		id: path.map((segment) => segment.code).join("+"),
		label: modes.join(" + "),
		durationMinutes: path.reduce((sum, segment) => sum + segment.minutes, 0),
		fareCop: path.reduce((sum, segment) => sum + segment.fareCop, 0),
		crowdLevel: NEUTRAL_CROWD,
		accessible: path.every((segment) => segment.accessible),
		floodZoneIds: path.flatMap((segment) =>
			segment.floodZoneCode ? [segment.floodZoneCode] : [],
		),
	};
}

/** Every way from one stop to another by chaining segments, without visiting a stop twice. */
export function buildRouteOptions(
	segments: readonly RouteSegment[],
	fromStop: string,
	toStop: string,
): RouteOption[] {
	const options: RouteOption[] = [];
	const walk = (stop: string, path: RouteSegment[], visited: Set<string>) => {
		if (stop === toStop) {
			options.push(toOption(path));
			return;
		}
		for (const segment of segments) {
			if (segment.from === stop && !visited.has(segment.to)) {
				walk(segment.to, [...path, segment], new Set([...visited, segment.to]));
			}
		}
	};
	walk(fromStop, [], new Set([fromStop]));
	return options;
}
