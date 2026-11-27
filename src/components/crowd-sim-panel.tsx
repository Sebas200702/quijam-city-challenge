import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
	CloudOff,
	CloudRain,
	FlaskConical,
	Footprints,
	Pause,
	Play,
	Save,
	TriangleAlert,
	Users,
} from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
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
import { createMetroMap, metroTileLayer } from "./map/metro-frame";

const AGENTS = 2000;
/** How often simulated counts are written to the database while running. */
const WRITE_EVERY_MS = 5000;
/** With reduced motion the dots move in steps, twice per second. */
const REDUCED_MOTION_STEP_MS = 500;
/** How far dots spread across the street, in screen pixels. */
const SPREAD_PX = 7;
const NUMBER = new Intl.NumberFormat("es-CO");
const ICON = { size: 16, strokeWidth: 1.75, "aria-hidden": true } as const;
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

type Tone = "green" | "gold" | "red";

/** Shape + word, so the state never depends on colour alone (rule 7). */
const TONE_SYMBOL: Record<Tone, string> = { green: "○", gold: "◐", red: "●" };
const LEGEND: { tone: Tone; label: string }[] = [
	{ tone: "green", label: "Fluido" },
	{ tone: "gold", label: "Moderado" },
	{ tone: "red", label: "Saturado" },
];

function subscribeReducedMotion(onChange: () => void) {
	const query = window.matchMedia(REDUCED_MOTION_QUERY);
	query.addEventListener("change", onChange);
	return () => query.removeEventListener("change", onChange);
}

function useReducedMotion(): boolean {
	return useSyncExternalStore(
		subscribeReducedMotion,
		() => window.matchMedia(REDUCED_MOTION_QUERY).matches,
		() => false,
	);
}

function subscribeOnline(onChange: () => void) {
	window.addEventListener("online", onChange);
	window.addEventListener("offline", onChange);
	return () => {
		window.removeEventListener("online", onChange);
		window.removeEventListener("offline", onChange);
	};
}

function useOnline(): boolean {
	return useSyncExternalStore(
		subscribeOnline,
		() => navigator.onLine,
		() => true,
	);
}

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
	const reducedMotion = useReducedMotion();
	const online = useOnline();

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

		// Same frame as /mapa: only the Metropolitan Area, the rest masked (U09).
		const map = createMetroMap(container, {
			zoomControl: true,
			attributionControl: true,
		});
		metroTileLayer().addTo(map);
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
	}, [initialZones, reducedMotion]);

	useEffect(() => {
		// Offline writes would only fail; they resume when the connection is back.
		if (!canWrite || !running || !online) return;
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
	}, [canWrite, running, online]);

	const sim = simRef.current;
	if (!sim) {
		return (
			<section className="q-card" aria-labelledby="crowd-sim-title">
				<div className="q-card__body">
					<h2 id="crowd-sim-title" className="q-h2">
						Ensayo de escenarios
					</h2>
					<div className="q-state q-state--loading" role="status">
						<span className="q-state__glyph">
							<span className="q-star q-star--think" aria-hidden="true" />
						</span>
						<p className="q-state__title">Esperando los conteos por zona</p>
						<p className="q-state__text">
							El ensayo arranca en cuanto llegan las cifras de las cinco zonas.
						</p>
					</div>
				</div>
			</section>
		);
	}

	const visitorsPerDot = Math.round(sim.visitorsPerAgent);
	const blockedFloods = city.activeFloodZoneIds.length;

	return (
		<section className="q-card" aria-labelledby="crowd-sim-title">
			<div className="q-band q-band--gold" aria-hidden="true" />
			<div className="q-card__head flex-wrap">
				<div className="min-w-0 flex-1">
					<p className="q-eyebrow flex items-center gap-1.5">
						<FlaskConical {...ICON} />
						Herramienta de planeación
					</p>
					<h2 id="crowd-sim-title" className="q-h2 mt-1">
						Ensayo de escenarios
					</h2>
					<p className="q-sm q-muted mt-1">
						Cada punto es un grupo de visitantes; su color dice qué tan llena
						está la zona.
					</p>
				</div>
				<button
					type="button"
					className="q-btn q-btn--secondary"
					onClick={() => setRunning((value) => !value)}
				>
					{running ? (
						<Pause size={18} strokeWidth={1.75} aria-hidden="true" />
					) : (
						<Play size={18} strokeWidth={1.75} aria-hidden="true" />
					)}
					{running ? "Pausar" : "Reanudar"}
				</button>
			</div>
			<div className="q-card__body">
				<div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
					<div className="flex min-w-0 flex-col gap-3">
						<section
							className="relative h-[340px] overflow-hidden rounded-[var(--radius-md)] sm:h-[420px] lg:h-[480px]"
							aria-label="Mapa del corredor con el ensayo de visitantes en movimiento"
						>
							<div ref={mapRef} className="absolute inset-0" />
							<canvas
								ref={canvasRef}
								className="pointer-events-none absolute inset-0 z-[400]"
							/>
							{(!running || reducedMotion) && (
								<span className="q-badge q-badge--neutral absolute top-3 right-3 z-[500] shadow-[var(--shadow-card)]">
									{running ? <Footprints {...ICON} /> : <Pause {...ICON} />}
									{running ? "Movimiento reducido" : "En pausa"}
								</span>
							)}
						</section>
						<ul
							className="flex flex-wrap gap-x-4 gap-y-1 rounded-[var(--radius-md)] bg-[var(--bg)] px-3.5 py-2.5 text-xs leading-4 text-[var(--ink-muted)]"
							aria-label="Leyenda del mapa"
						>
							{LEGEND.map((item) => (
								<li
									key={item.tone}
									className="inline-flex items-center gap-1.5"
								>
									<span
										className="text-sm leading-4"
										style={{ color: `var(--${item.tone}-text)` }}
										aria-hidden="true"
									>
										{TONE_SYMBOL[item.tone]}
									</span>
									<b className="font-semibold text-[var(--ink)]">
										{item.label}
									</b>
								</li>
							))}
							<li className="inline-flex items-center gap-1.5">
								<CloudRain {...ICON} />
								{blockedFloods > 0
									? `Arroyo activo: ${blockedFloods} ${blockedFloods === 1 ? "tramo cerrado" : "tramos cerrados"}`
									: "Arroyo activo: tramo cerrado"}
							</li>
							<li className="inline-flex items-center gap-1.5">
								<Users {...ICON} />1 punto ≈ {visitorsPerDot} visitantes
							</li>
						</ul>
					</div>
					<div className="flex flex-col gap-3">
						<h3 className="q-h3 flex items-center gap-2">
							<Users size={18} strokeWidth={1.75} aria-hidden="true" />
							Gente por zona
						</h3>
						<ul
							className="space-y-3"
							aria-label="Visitantes por zona en el ensayo"
						>
							{readings.map((zone) => (
								<li key={zone.zone}>
									{/* biome-ignore lint/a11y/useSemanticElements: .q-meter draws its own track; a native <meter> cannot carry the state word in aria-valuetext styling. */}
									<div
										className={`q-meter q-meter--sm q-meter--${zone.tone}`}
										role="meter"
										aria-label={zone.label}
										aria-valuemin={0}
										aria-valuemax={100}
										aria-valuenow={Math.min(zone.pct, 100)}
										aria-valuetext={`${zone.pct} %, ${zone.state}. ${NUMBER.format(zone.visitors)} de ${NUMBER.format(zone.capacity)} personas`}
									>
										<div className="q-meter__head" aria-hidden="true">
											<span className="font-semibold text-[var(--ink)]">
												{zone.label}
											</span>
											<b>
												{zone.pct} %{" "}
												<span className="q-meter__state">
													{TONE_SYMBOL[zone.tone]} {zone.state}
												</span>
											</b>
										</div>
										<div className="q-meter__track" aria-hidden="true">
											<div
												className="q-meter__fill"
												style={{ width: `${Math.min(zone.pct, 100)}%` }}
											/>
										</div>
										<p className="q-sm q-subtle" aria-hidden="true">
											{NUMBER.format(zone.visitors)} de{" "}
											{NUMBER.format(zone.capacity)} personas
										</p>
									</div>
								</li>
							))}
						</ul>
					</div>
				</div>

				{canWrite && (
					<p className="q-sm q-muted flex items-center gap-2">
						{online ? <Save {...ICON} /> : <CloudOff {...ICON} />}
						{!online
							? "Sin conexión: los conteos se guardan cuando vuelva."
							: running
								? "Los conteos se guardan cada 5 s."
								: "En pausa: los conteos no se guardan."}
					</p>
				)}
				{writeError && (
					<p
						role="alert"
						className="q-sm flex items-start gap-2 rounded-[var(--radius-md)] bg-[var(--red-soft)] px-3.5 py-2.5 text-[var(--red-text)]"
					>
						<TriangleAlert {...ICON} className="mt-0.5 flex-none" />
						No se pudieron guardar los conteos: {writeError}
					</p>
				)}

				<details className="q-details">
					<summary>Ver detalles</summary>
					<div className="q-details__body" data-fps={fps}>
						<p>
							{sim.agentCount.toLocaleString("es-CO")} puntos; cada uno
							representa unos {visitorsPerDot} visitantes. Imagen a {fps}{" "}
							cuadros por segundo.
						</p>
						<p>
							El ensayo reacciona al panel del presentador: Malecón saturado,
							aguacero (cierra los tramos con arroyo) y reiniciar.
						</p>
						{reducedMotion && (
							<p>
								Tu equipo pide menos movimiento: los puntos avanzan a pasos, dos
								veces por segundo.
							</p>
						)}
					</div>
				</details>
			</div>
		</section>
	);
}
