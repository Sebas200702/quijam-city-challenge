import { CloudRain, Map as MapIcon, Users } from "lucide-react";
import type {
	FloodZone,
	ZoneVisitorCount,
} from "../../../lib/city-dashboard-types";
import {
	calculateOccupancyPercent,
	crowdDotCount,
	getDensityVisualState,
	SATURATION_GLYPHS,
	ZONE_LABELS,
} from "../../../lib/city-dashboard-utils";
import {
	MAP_FLOODS,
	MAP_MAJOR_ROADS,
	MAP_MINOR_ROADS,
	MAP_PARKS,
	MAP_RIVER,
	MAP_STOPS,
	MAP_VIEW_BOX,
	MAP_ZONES,
	seededRandom,
} from "./corridor-zone-map-layout";

interface CorridorZoneMapProps {
	zones: readonly ZoneVisitorCount[];
	floodZones: readonly FloodZone[];
	/** Clock shown in the map tag, e.g. "16:00". */
	clockLabel: string;
}

function ZoneHalos({ zones }: { zones: readonly ZoneVisitorCount[] }) {
	return zones.map((zone) => {
		const point = MAP_ZONES[zone.zone];
		if (!point) return null;
		const visual = getDensityVisualState(calculateOccupancyPercent(zone));
		return (
			<g key={zone.zone}>
				<circle
					className={`cs-map-zone cs-map-zone--${visual.tone}`}
					cx={point.x}
					cy={point.y}
					r={44}
				/>
				<text
					className={`cs-map-word cs-map-word--${visual.tone}`}
					x={point.x + point.wordDx}
					y={point.y + point.wordDy}
					textAnchor="middle"
				>
					{SATURATION_GLYPHS[visual.tone]} {visual.label}
				</text>
			</g>
		);
	});
}

function CrowdDots({ zones }: { zones: readonly ZoneVisitorCount[] }) {
	return zones.flatMap((zone) => {
		const point = MAP_ZONES[zone.zone];
		if (!point) return [];
		const random = seededRandom(point.x * 7 + point.y);
		return Array.from(
			{ length: crowdDotCount(zone.active_visitors) },
			(_, i) => {
				const angle = random() * Math.PI * 2;
				const distance = Math.sqrt(random()) * 42;
				return (
					<circle
						// Dots are positional only; the index is their identity.
						// biome-ignore lint/suspicious/noArrayIndexKey: static decorative dots
						key={`${zone.zone}-${i}`}
						className="cs-map-crowd"
						cx={(point.x + Math.cos(angle) * distance).toFixed(1)}
						cy={(point.y + Math.sin(angle) * distance).toFixed(1)}
						r={1.8}
					/>
				);
			},
		);
	});
}

function FloodMarks({ floodZones }: { floodZones: readonly FloodZone[] }) {
	return floodZones.map((flood) => {
		const point = MAP_FLOODS[flood.code];
		if (!point) return null;
		const on = flood.alert_active;
		return (
			<g key={flood.code}>
				{on && (
					<circle
						className="cs-map-flood--active cs-map-pulse"
						cx={point.x}
						cy={point.y}
						r={point.r}
					/>
				)}
				<circle
					className={`cs-map-flood${on ? " cs-map-flood--active" : ""}`}
					cx={point.x}
					cy={point.y}
					r={point.r}
				>
					<title>{`${flood.name}${on ? " · activo" : ""}`}</title>
				</circle>
				{on && (
					<>
						<circle
							className="cs-map-flood-dot"
							cx={point.x}
							cy={point.y}
							r={9}
						/>
						<text
							className="cs-map-flood-glyph"
							x={point.x}
							y={point.y + 4.5}
							textAnchor="middle"
						>
							!
						</text>
						<text
							className="cs-map-label"
							x={point.x + point.r + 4}
							y={point.y + 4}
						>
							{flood.name}
						</text>
					</>
				)}
			</g>
		);
	});
}

function Stops() {
	return MAP_STOPS.map((stop) => {
		const lx =
			stop.side === "l"
				? stop.x - 12
				: stop.side === "r"
					? stop.x + 12
					: stop.x;
		const ly = stop.side === "b" ? stop.y + 22 : stop.y + 4;
		const anchor =
			stop.side === "l" ? "end" : stop.side === "r" ? "start" : "middle";
		return (
			<g key={stop.code}>
				<circle className="cs-map-stop" cx={stop.x} cy={stop.y} r={6} />
				<text className="cs-map-label" x={lx} y={ly} textAnchor={anchor}>
					{stop.name}
				</text>
			</g>
		);
	});
}

/** Plain-language summary read by screen readers instead of the drawing. */
function describeMap(
	zones: readonly ZoneVisitorCount[],
	floodZones: readonly FloodZone[],
): string {
	const zoneText = zones
		.map((zone) => {
			const visual = getDensityVisualState(calculateOccupancyPercent(zone));
			return `${ZONE_LABELS[zone.zone]}: ${visual.label}`;
		})
		.join(", ");
	const active = floodZones.filter((flood) => flood.alert_active);
	const floodText =
		active.length > 0
			? `Arroyos activos: ${active.map((flood) => flood.name).join(", ")}.`
			: "Ningún arroyo activo.";
	return `Mapa del corredor Estadio – Gran Malecón. ${zoneText}. ${floodText}`;
}

/** Schematic corridor map: each zone shows its saturation as word, glyph and halo stroke. */
export function CorridorZoneMap({
	zones,
	floodZones,
	clockLabel,
}: CorridorZoneMapProps) {
	return (
		<div className="cs-mapcol" id="mapa">
			<div className="q-map cs-map">
				<span className="cs-maptag">
					<MapIcon size={16} strokeWidth={1.75} aria-hidden="true" />
					Corredor piloto · {clockLabel}
				</span>
				{/* Rule 9: the corridor seed carries the reference-data tag, once per screen. */}
				<span className="q-sim-tag cs-map-ref">Datos de referencia</span>
				<svg
					viewBox={MAP_VIEW_BOX}
					preserveAspectRatio="xMidYMid meet"
					role="img"
					aria-label={describeMap(zones, floodZones)}
				>
					<rect
						className="m-land"
						x={-800}
						y={-600}
						width={2000}
						height={2000}
					/>
					{MAP_PARKS.map((d) => (
						<path key={d} className="m-park" d={d} />
					))}
					<path className="m-water" d={MAP_RIVER} />
					<text
						className="cs-map-area"
						x={372}
						y={260}
						transform="rotate(72 372 260)"
					>
						RÍO MAGDALENA
					</text>
					{MAP_MINOR_ROADS.map((d) => (
						<path key={d} className="m-road" d={d} />
					))}
					{MAP_MAJOR_ROADS.map((d) => (
						<path key={d} className="m-major" d={d} />
					))}
					<ZoneHalos zones={zones} />
					<CrowdDots zones={zones} />
					<FloodMarks floodZones={floodZones} />
					<Stops />
				</svg>
			</div>
			<ul className="cs-legend" aria-label="Leyenda del mapa">
				<li>
					<b>○ Fluido</b> halo continuo
				</li>
				<li>
					<b>◐ Moderado</b> halo discontinuo
				</li>
				<li>
					<b>● Saturado</b> halo punteado
				</li>
				<li>
					<CloudRain size={16} strokeWidth={1.75} aria-hidden="true" />
					<b>!</b> Arroyo activo
				</li>
				<li>
					<Users size={16} strokeWidth={1.75} aria-hidden="true" />
					Puntos: 100 personas
				</li>
			</ul>
		</div>
	);
}
