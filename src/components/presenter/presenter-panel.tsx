import {
	CloudRain,
	ExternalLink,
	LogOut,
	Receipt,
	RotateCcw,
	Users,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type {
	CityEvent,
	CityMode,
} from "../../lib/city-events/city-events-types";
import { useCityState } from "../../lib/city-events/use-city-state";
import { CORRIDOR_SEED } from "../../lib/corridor/corridor-seed";
import { cityAuthHeader, fetchPresenterAccess } from "./presenter-access";

const ICON = { size: 20, strokeWidth: 1.75, "aria-hidden": true } as const;

type CaseId = 1 | 2 | 3;

const CASES: { id: CaseId; title: string }[] = [
	{ id: 1, title: "Caso 1 · Cobro abusivo" },
	{ id: 2, title: "Caso 2 · Aguacero" },
	{ id: 3, title: "Caso 3 · Malecón saturado" },
];

const MODES: { id: CityMode; label: string }[] = [
	{ id: "mundial", label: "Mundial" },
	{ id: "carnaval", label: "Carnaval" },
	{ id: "cotidiano", label: "Cotidiano" },
];

const SURFACES = [
	{ href: "/inicio", label: "Quillart AI" },
	{ href: "/mapa", label: "Mapa" },
	{ href: "/ciudad", label: "Tablero de ciudad" },
	{ href: "/moderacion", label: "Moderación" },
	{ href: "/foro", label: "Foro" },
];

/** Sample report for case 1: taxi Malecón → Estadio charged far above the fair fare. */
const SAMPLE_REPORT = {
	segmentCode: "SEG-MAL-EST-TAXI",
	transportMode: "taxi",
	chargedFareCop: 60000,
	driverQrCode: null,
	notes: "Reporte de ejemplo del Demo Day",
};

const EVENT_LABEL: Record<CityEvent["type"], string> = {
	aguacero: "Aguacero",
	malecon_saturado: "Malecón saturado",
	cobro_abusivo: "Cobro abusivo",
	modo_ciudad: "Modo de ciudad",
	tiempo: "Hora",
	reiniciar: "Reiniciar demo",
	anfitrion_asignado: "Anfitrión asignado",
	anfitrion_estado: "Estado del anfitrión",
};

interface LogEntry {
	id: number;
	event: CityEvent;
	sentAt: number;
	via: "supabase" | "local";
	/** Time until this panel received its own event back, in ms. */
	roundTripMs: number | null;
	note?: string;
}

const time = (ms: number) =>
	new Date(ms).toLocaleTimeString("es-CO", {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	});

function describe(event: CityEvent): string {
	switch (event.type) {
		case "aguacero":
			return `${event.zoneIds.join(", ")} en ${event.startsInMin} min`;
		case "malecon_saturado":
			return `${event.capacityPct} % del aforo`;
		case "cobro_abusivo":
			return `reporte ${event.reportId.slice(0, 8)}`;
		case "modo_ciudad":
			return event.mode;
		case "tiempo":
			return `${event.hour}:00`;
		case "reiniciar":
			return "estado inicial";
		case "anfitrion_asignado":
			return `${event.need} en ${event.meetingPointCode}`;
		case "anfitrion_estado":
			return event.etaMin === undefined
				? event.status
				: `${event.status}, ${event.etaMin} min`;
	}
}

/** /presentador: the triggers of the demo (#41). Only a demo key session or a city account. */
export default function PresenterPanel() {
	const [allowed, setAllowed] = useState<boolean | null>(null);
	const { state: city, status, lastEvent, publish } = useCityState();
	const [activeCase, setActiveCase] = useState<CaseId>(1);
	const [floodZones, setFloodZones] = useState<string[]>(["ARR-MURILLO-46"]);
	const [minutes, setMinutes] = useState(12);
	const [capacity, setCapacity] = useState(140);
	const [confirmReset, setConfirmReset] = useState(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [log, setLog] = useState<LogEntry[]>([]);
	const [now, setNow] = useState(() => Date.now());
	const nextId = useRef(1);

	useEffect(() => {
		void fetchPresenterAccess()
			.then(({ access }) => {
				if (access) setAllowed(true);
				else window.location.replace("/presentador/entrar");
			})
			.catch(() => setAllowed(false));
	}, []);

	useEffect(() => {
		const timer = window.setInterval(() => setNow(Date.now()), 1000);
		return () => window.clearInterval(timer);
	}, []);

	// Our own event coming back through the channel proves the broadcast went out.
	useEffect(() => {
		if (!lastEvent) return;
		const received = Date.now();
		setLog((entries) => {
			const index = entries.findIndex(
				(entry) =>
					entry.roundTripMs === null &&
					entry.event.type === lastEvent.type &&
					JSON.stringify(entry.event) === JSON.stringify(lastEvent),
			);
			if (index === -1) return entries;
			const copy = [...entries];
			copy[index] = {
				...copy[index],
				roundTripMs: received - copy[index].sentAt,
			};
			return copy;
		});
	}, [lastEvent]);

	async function send(event: CityEvent, note?: string) {
		setBusy(true);
		setError(null);
		const sentAt = Date.now();
		const entry: LogEntry = {
			id: nextId.current++,
			event,
			sentAt,
			via: "local",
			roundTripMs: null,
			note,
		};
		try {
			let delivered = false;
			if (status === "live") {
				const response = await fetch("/api/presentador/events", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						...(await cityAuthHeader()),
					},
					credentials: "same-origin",
					body: JSON.stringify(event),
				});
				if (response.status === 401) {
					window.location.replace("/presentador/entrar");
					return;
				}
				delivered = response.ok;
				if (delivered) entry.via = "supabase";
			}
			// No Realtime (offline laptop or server not configured): other tabs of this browser.
			setLog((entries) => [entry, ...entries].slice(0, 30));
			if (!delivered) await publish(event);
		} catch (reason) {
			setError(reason instanceof Error ? reason.message : "No se pudo enviar.");
		} finally {
			setBusy(false);
		}
	}

	async function sendOvercharge() {
		setBusy(true);
		let reportId: string | null = null;
		try {
			const response = await fetch("/api/reports", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(SAMPLE_REPORT),
			});
			if (response.ok)
				reportId = ((await response.json()) as { reportId: string }).reportId;
		} catch {
			// Offline: the event still goes out with a local id.
		}
		await send(
			{ type: "cobro_abusivo", reportId: reportId ?? crypto.randomUUID() },
			reportId
				? "Reporte guardado en la bandeja"
				: "Sin Supabase: reporte no guardado",
		);
	}

	const lastSent = (type: CityEvent["type"]) => {
		const entry = log.find((item) => item.event.type === type);
		return entry
			? `Enviado hace ${Math.max(0, Math.round((now - entry.sentAt) / 1000))} s`
			: "Sin enviar";
	};

	if (allowed === null) {
		return (
			<p className="q-sm q-subtle px-4 py-10 text-center">
				Comprobando acceso…
			</p>
		);
	}
	if (!allowed) {
		return (
			<p role="alert" className="px-4 py-10 text-center text-[var(--red-text)]">
				No se pudo comprobar el acceso al panel. Recarga la página.
			</p>
		);
	}

	const channelLabel =
		status === "live"
			? "En vivo"
			: status === "local"
				? "Solo este equipo"
				: status === "error"
					? "Sin conexión"
					: "Conectando…";

	return (
		<main className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
			<header className="flex flex-wrap items-end justify-between gap-3">
				<div>
					<p className="q-eyebrow">Demo Day · datos de referencia</p>
					<h1 className="q-h1 mt-1">Panel de presentador</h1>
				</div>
				<div className="flex items-center gap-2">
					<span
						className={`q-badge ${status === "live" ? "q-badge--live" : "q-badge--neutral"}`}
						aria-live="polite"
					>
						Canal: {channelLabel}
					</span>
					<button
						type="button"
						className="q-btn q-btn--ghost q-btn--sm"
						onClick={() =>
							void fetch("/api/presentador/session", {
								method: "DELETE",
								credentials: "same-origin",
							}).then(() => window.location.assign("/presentador/entrar"))
						}
					>
						<LogOut {...ICON} />
						Salir
					</button>
				</div>
			</header>

			{error && (
				<p
					role="alert"
					className="rounded-[var(--radius-md)] bg-[var(--red-soft)] px-4 py-3 text-sm text-[var(--red-text)]"
				>
					{error}
				</p>
			)}

			<section className="q-card" aria-labelledby="presenter-case">
				<div className="q-card__head">
					<h2 id="presenter-case" className="q-h2">
						Disparador del caso
					</h2>
				</div>
				<div className="q-card__body space-y-4">
					<div
						className="q-seg"
						role="tablist"
						aria-label="Caso que se presenta"
					>
						{CASES.map((item) => (
							<button
								key={item.id}
								type="button"
								role="tab"
								aria-selected={activeCase === item.id}
								className={`q-seg__opt ${activeCase === item.id ? "is-on" : ""}`}
								onClick={() => setActiveCase(item.id)}
							>
								{item.title}
							</button>
						))}
					</div>

					{activeCase === 1 && (
						<div className="space-y-3">
							<p className="q-sm q-subtle">
								Taxi Malecón → Estadio cobrado a $60.000. Se guarda en la
								bandeja de la ciudad y se publica el evento.
							</p>
							<button
								type="button"
								className="q-btn q-btn--primary q-btn--lg w-full sm:w-auto"
								disabled={busy}
								onClick={() => void sendOvercharge()}
							>
								<Receipt {...ICON} />
								Enviar cobro abusivo de ejemplo
							</button>
							<p className="q-sm q-subtle">{lastSent("cobro_abusivo")}</p>
						</div>
					)}

					{activeCase === 2 && (
						<div className="space-y-3">
							<fieldset className="space-y-2">
								<legend className="text-[13px] font-semibold">Arroyos</legend>
								{CORRIDOR_SEED.floodZones.map((zone) => (
									<label
										key={zone.code}
										className="flex min-h-11 items-center gap-3"
									>
										<input
											type="checkbox"
											className="size-5"
											checked={floodZones.includes(zone.code)}
											onChange={(event) =>
												setFloodZones((current) =>
													event.target.checked
														? [...current, zone.code]
														: current.filter((code) => code !== zone.code),
												)
											}
										/>
										{zone.name}
									</label>
								))}
							</fieldset>
							<label className="flex items-center gap-3">
								<span className="text-[13px] font-semibold">Se activa en</span>
								<select
									value={minutes}
									onChange={(event) => setMinutes(Number(event.target.value))}
									className="min-h-11 rounded-[var(--radius-md)] border border-[var(--line-control)] bg-[var(--bg)] px-3"
								>
									{[0, 5, 12, 20].map((value) => (
										<option key={value} value={value}>
											{value === 0 ? "ya" : `${value} min`}
										</option>
									))}
								</select>
							</label>
							<button
								type="button"
								className="q-btn q-btn--alert q-btn--lg w-full sm:w-auto"
								disabled={busy || floodZones.length === 0}
								onClick={() =>
									void send({
										type: "aguacero",
										zoneIds: floodZones,
										startsInMin: minutes,
									})
								}
							>
								<CloudRain {...ICON} />
								Lanzar aguacero
							</button>
							<p className="q-sm q-subtle">{lastSent("aguacero")}</p>
						</div>
					)}

					{activeCase === 3 && (
						<div className="space-y-3">
							<label className="flex items-center gap-3">
								<span className="text-[13px] font-semibold">
									Aforo del Malecón
								</span>
								<select
									value={capacity}
									onChange={(event) => setCapacity(Number(event.target.value))}
									className="min-h-11 rounded-[var(--radius-md)] border border-[var(--line-control)] bg-[var(--bg)] px-3"
								>
									{[90, 110, 140].map((value) => (
										<option key={value} value={value}>
											{value} %
										</option>
									))}
								</select>
							</label>
							<button
								type="button"
								className="q-btn q-btn--primary q-btn--lg w-full sm:w-auto"
								disabled={busy}
								onClick={() =>
									void send({ type: "malecon_saturado", capacityPct: capacity })
								}
							>
								<Users {...ICON} />
								Saturar el Malecón
							</button>
							<p className="q-sm q-subtle">{lastSent("malecon_saturado")}</p>
						</div>
					)}
				</div>
			</section>

			<div className="grid gap-6 lg:grid-cols-2">
				<section className="q-card" aria-labelledby="presenter-secondary">
					<div className="q-card__head">
						<h2 id="presenter-secondary" className="q-h2">
							Ciudad
						</h2>
					</div>
					<div className="q-card__body space-y-4">
						<fieldset className="q-seg" aria-label="Modo de ciudad">
							<legend className="sr-only">Modo de ciudad</legend>
							{MODES.map((mode) => (
								<button
									key={mode.id}
									type="button"
									aria-pressed={city.mode === mode.id}
									className={`q-seg__opt ${city.mode === mode.id ? "is-on" : ""}`}
									disabled={busy}
									onClick={() =>
										void send({ type: "modo_ciudad", mode: mode.id })
									}
								>
									{mode.label}
								</button>
							))}
						</fieldset>
						<nav
							aria-label="Otras superficies"
							className="flex flex-wrap gap-2"
						>
							{SURFACES.map((surface) => (
								<a
									key={surface.href}
									href={surface.href}
									target="_blank"
									rel="noreferrer"
									className="q-chip"
								>
									{surface.label}
									<ExternalLink
										size={14}
										strokeWidth={1.75}
										aria-hidden="true"
									/>
								</a>
							))}
						</nav>
						{confirmReset ? (
							<div className="flex flex-wrap items-center gap-2" role="alert">
								<span className="q-sm">¿Volver todo al estado inicial?</span>
								<button
									type="button"
									className="q-btn q-btn--alert q-btn--sm"
									onClick={() => {
										setConfirmReset(false);
										void send({ type: "reiniciar" });
									}}
								>
									Sí, reiniciar
								</button>
								<button
									type="button"
									className="q-btn q-btn--ghost q-btn--sm"
									onClick={() => setConfirmReset(false)}
								>
									Cancelar
								</button>
							</div>
						) : (
							<button
								type="button"
								className="q-btn q-btn--secondary"
								disabled={busy}
								onClick={() => setConfirmReset(true)}
							>
								<RotateCcw {...ICON} />
								Reiniciar demo
							</button>
						)}
					</div>
				</section>

				<section className="q-card" aria-labelledby="presenter-log">
					<div className="q-card__head">
						<h2 id="presenter-log" className="q-h2">
							Registro
						</h2>
					</div>
					<div className="q-card__body">
						{log.length === 0 ? (
							<p className="q-sm q-subtle">
								Todavía no se ha enviado ningún evento.
							</p>
						) : (
							<ol className="space-y-2" aria-live="polite">
								{log.map((entry) => (
									<li key={entry.id} className="q-sm">
										<b>{time(entry.sentAt)}</b> ·{" "}
										{EVENT_LABEL[entry.event.type]} ({describe(entry.event)}) ·{" "}
										{entry.via === "supabase"
											? "a todos los equipos"
											: "solo este equipo"}
										{entry.roundTripMs !== null &&
											` · confirmado en ${entry.roundTripMs} ms`}
										{entry.note && (
											<span className="q-subtle"> · {entry.note}</span>
										)}
									</li>
								))}
							</ol>
						)}
					</div>
				</section>
			</div>
		</main>
	);
}
