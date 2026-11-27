import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import type { ZoneVisitorCount } from "../lib/city-dashboard-types";
import { getDensityVisualState } from "../lib/city-dashboard-utils";
import { useCityState } from "../lib/city-events/use-city-state";
import {
	boundsOf,
	corridorLine,
	type LatLngTuple,
} from "../lib/corridor/corridor-geometry";
import { CORRIDOR_SEED } from "../lib/corridor/corridor-seed";
import { CrowdSim, SIM_ZONES } from "../lib/crowd-sim/crowd-sim";
import { writeSimulatedCounts } from "../lib/crowd-sim/crowd-sim-store";

const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION =
	'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const AGENTS = 2000;
/** How often simulated counts are written to the database while running. */
const WRITE_EVERY_MS = 5000;
/** With reduced motion the dots move in steps, twice per second. */
const REDUCED_MOTION_STEP_MS = 500;
/** How far dots spread across the street, in screen pixels. */
const SPREAD_PX = 7;
const NUMBER = new Intl.NumberFormat("es-CO");

type Tone = "green" | "gold" | "red";

interface ZoneReading {
	zone: string;
	label: string;
	visitors: number;
	capacity: number;
	pct: number;
	tone: Tone;
	state: string;
}

function readZones(sim: CrowdSim, zones: ZoneVisitorCount[]): ZoneReading[] {
	const counts = sim.counts();
	return SIM_ZONES.flatMap((key) => {
		const zone = zones.find((item) => item.zone === key);
		if (!zone) return [];
		const visitors = counts[key];
		const pct = Math.round((visitors / zone.capacity_threshold) * 100);
		const visual = getDensityVisualState(pct);
		return [
			{
				zone: key,
				label: zone.zone_label,
				visitors,
				capacity: zone.capacity_threshold,
				pct,
				tone: visual.tone,
				state: visual.label,
			},
		];
	});
}

interface CrowdSimPanelProps {
	/** Zone counts when the panel opens: the simulation starts from them. */
	zones: ZoneVisitorCount[];
	/** Write simulated counts to zone_visitor_counts (city role only). */
	canWrite: boolean;
}

/**
 * City dashboard card: thousands of dots flowing along the corridor. Reacts to
 * `malecon_saturado`, `aguacero` and `reiniciar` from the presenter panel.
 * Never shown in the visitor app (epic #57, rule 1).
 */
export function CrowdSimPanel({ zones, canWrite }: CrowdSimPanelProps) {
	const mapRef = useRef<HTMLDivElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const simRef = useRef<CrowdSim | null>(null);
	const [running, setRunning] = useState(true);
	const [fps, setFps] = useState(0);
	const [writeError, setWriteError] = useState<string | null>(null);
	const [readings, setReadings] = useState<ZoneReading[]>([]);
	const [initialZones] = useState(zones);
	const runningRef = useRef(running);
	runningRef.current = running;

	// One simulation per panel, built from the counts the panel opened with.
	if (!simRef.current && initialZones.length > 0) {
		const path = corridorLine(CORRIDOR_SEED.stops);
		simRef.current = new CrowdSim({
			path,
			stops: CORRIDOR_SEED.stops,
			floodZones: CORRIDOR_SEED.floodZones,
			zones: initialZones.map((zone) => ({
				zone: zone.zone,
				visitors: zone.active_visitors,
				capacity: zone.capacity_threshold,
			})),
			agents: AGENTS,
		});
	}

	// Presenter events: Malecon saturation and reset. Floods come from the city state,
	// which already lists arroyos still counting down.
	const { state: city, lastEvent } = useCityState();
	useEffect(() => {
		if (lastEvent) simRef.current?.applyEvent(lastEvent);
	}, [lastEvent]);
	useEffect(() => {
		simRef.current?.setBlockedFloodZones(city.activeFloodZoneIds);
	}, [city.activeFloodZoneIds]);

	useEffect(() => {
		const container = mapRef.current;
		const canvas = canvasRef.current;
		const sim = simRef.current;
		if (!container || !canvas || !sim) return;

		const map = L.map(container, {
			zoomControl: true,
			attributionControl: true,
		});
		L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(
			map,
		);
		const path = corridorLine(CORRIDOR_SEED.stops);
		const style = getComputedStyle(container);
		const token = (name: string, fallback: string) =>
			style.getPropertyValue(name).trim() || fallback;
		const colors: Record<Tone, string> = {
			green: token("--green", "#1f8a4c"),
			gold: token("--gold", "#f2b705"),
			red: token("--red", "#d62839"),
		};
		L.polyline(path, {
			color: token("--line", "#c9cdd3"),
			weight: 10,
			opacity: 0.6,
			interactive: false,
		}).addTo(map);
		const bounds = boundsOf(path);
		if (bounds) map.fitBounds(bounds, { padding: [16, 16] });

		const context = canvas.getContext("2d");
		const point: LatLngTuple = [0, 0];
		const byTone: Record<Tone, number[]> = { green: [], gold: [], red: [] };

		const draw = () => {
			if (!context) return;
			const { x: width, y: height } = map.getSize();
			const ratio = window.devicePixelRatio || 1;
			if (canvas.width !== width * ratio || canvas.height !== height * ratio) {
				canvas.width = width * ratio;
				canvas.height = height * ratio;
				canvas.style.width = `${width}px`;
				canvas.style.height = `${height}px`;
			}
			context.setTransform(ratio, 0, 0, ratio, 0, 0);
			context.clearRect(0, 0, width, height);
			// Dot color = state of the zone it is in (dashboard density scale).
			const tones = readZones(sim, initialZones).map((zone) => zone.tone);
			const degreesPerPixel =
				(map.getBounds().getNorth() - map.getBounds().getSouth()) / height;
			const spread = SPREAD_PX * degreesPerPixel;
			for (const tone of Object.keys(byTone) as Tone[]) byTone[tone].length = 0;
			for (let i = 0; i < sim.agentCount; i++) {
				sim.latLngOf(i, point, spread);
				const { x, y } = map.latLngToContainerPoint(point);
				byTone[tones[sim.zoneOf(sim.pos[i])] ?? "green"].push(x, y);
			}
			context.globalAlpha = 0.75;
			for (const tone of Object.keys(byTone) as Tone[]) {
				context.fillStyle = colors[tone];
				const points = byTone[tone];
				for (let p = 0; p < points.length; p += 2) {
					context.fillRect(points[p] - 1.25, points[p + 1] - 1.25, 2.5, 2.5);
				}
			}
		};

		const reducedMotion = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches;
		let frame = 0;
		let timer = 0;
		let last = performance.now();
		let frames = 0;
		let fpsWindowStart = last;

		const tick = (now: number) => {
			const dt = Math.min(0.1, (now - last) / 1000);
			last = now;
			if (runningRef.current) sim.step(dt);
			draw();
			frames++;
			if (now - fpsWindowStart >= 1000) {
				setFps(Math.round((frames * 1000) / (now - fpsWindowStart)));
				setReadings(readZones(sim, initialZones));
				frames = 0;
				fpsWindowStart = now;
			}
		};

		if (reducedMotion) {
			timer = window.setInterval(
				() => tick(performance.now()),
				REDUCED_MOTION_STEP_MS,
			);
		} else {
			const loop = (now: number) => {
				tick(now);
				frame = requestAnimationFrame(loop);
			};
			frame = requestAnimationFrame(loop);
		}
		setReadings(readZones(sim, initialZones));
		map.on("move zoom resize", draw);

		return () => {
			cancelAnimationFrame(frame);
			window.clearInterval(timer);
			map.remove();
		};
	}, [initialZones]);

	useEffect(() => {
		if (!canWrite || !running) return;
		const timer = window.setInterval(() => {
			const sim = simRef.current;
			if (!sim) return;
			writeSimulatedCounts(sim.counts())
				.then(() => setWriteError(null))
				.catch((error: unknown) =>
					setWriteError(
						error instanceof Error ? error.message : "No se pudo guardar.",
					),
				);
		}, WRITE_EVERY_MS);
		return () => window.clearInterval(timer);
	}, [canWrite, running]);

	if (!simRef.current) {
		return (
			<section className="q-card" aria-labelledby="crowd-sim-title">
				<div className="q-card__body">
					<h2 id="crowd-sim-title" className="q-h2">
						Ensayo de escenarios
					</h2>
					<p className="q-sm q-subtle">
						Esperando los conteos por zona para empezar.
					</p>
				</div>
			</section>
		);
	}

	return (
		<section className="q-card" aria-labelledby="crowd-sim-title">
			<div className="q-band q-band--gold" aria-hidden="true" />
			<div className="q-card__head">
				<div>
					<p className="q-eyebrow">Herramienta de planeación</p>
					<h2 id="crowd-sim-title" className="q-h2 mt-1">
						Ensayo de escenarios
					</h2>
				</div>
				<button
					type="button"
					className="q-btn q-btn--secondary q-btn--sm"
					onClick={() => setRunning((value) => !value)}
				>
					{running ? "Pausar" : "Reanudar"}
				</button>
			</div>
			<div className="q-card__body">
				<div className="grid gap-4 lg:grid-cols-[1fr_280px]">
					<section
						className="relative h-[480px] overflow-hidden rounded-[var(--radius-md)]"
						aria-label="Mapa del corredor con el ensayo de visitantes en movimiento"
					>
						<div ref={mapRef} className="absolute inset-0" />
						<canvas
							ref={canvasRef}
							className="pointer-events-none absolute inset-0 z-[400]"
						/>
					</section>
					<ul
						className="space-y-3"
						aria-label="Visitantes por zona en el ensayo"
					>
						{readings.map((zone) => (
							<li key={zone.zone} className={`q-meter q-meter--${zone.tone}`}>
								<div className="q-meter__head">
									<span className="font-semibold">{zone.label}</span>
									<b>{zone.pct}%</b>
								</div>
								<div className="q-meter__track" aria-hidden="true">
									<div
										className="q-meter__fill"
										style={{ width: `${Math.min(zone.pct, 100)}%` }}
									/>
								</div>
								<p className="q-sm q-subtle">
									{zone.state} · {NUMBER.format(zone.visitors)} de{" "}
									{NUMBER.format(zone.capacity)}
								</p>
							</li>
						))}
					</ul>
				</div>
				<p className="q-sm q-subtle" data-fps={fps}>
					{simRef.current.agentCount.toLocaleString("es-CO")} puntos · cada uno
					representa ~{Math.round(simRef.current.visitorsPerAgent)} visitantes ·{" "}
					{fps} fps
					{canWrite && running ? " · los conteos se guardan cada 5 s" : ""}
				</p>
				{writeError && (
					<p role="alert" className="q-sm text-[var(--red-text)]">
						No se pudieron guardar los conteos: {writeError}
					</p>
				)}
			</div>
		</section>
	);
}
