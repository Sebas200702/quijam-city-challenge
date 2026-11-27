import {
	Accessibility,
	Bike,
	Bus,
	CarTaxiFront,
	Clock,
	Flag,
	Footprints,
	Leaf,
	type LucideIcon,
	MapPin,
	MessageCircle,
	Navigation,
	RotateCw,
	Ticket,
	TramFront,
	WifiOff,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import type { CorridorStop } from "../../lib/corridor/corridor-types";
import type { PlanResponse } from "../../lib/routing/plan-route";
import type { Itinerary, TransportMode } from "../../lib/routing/routing-types";
import {
	confidenceLabel,
	isRecalculated,
	type RouteQuery,
	routeWhy,
	useOnline,
} from "./use-route-plan";

const copFormatter = new Intl.NumberFormat("es-CO", {
	maximumFractionDigits: 0,
});
const fare = (cop: number) =>
	cop === 0 ? "Gratis" : `$${copFormatter.format(cop)}`;
const clock = new Intl.DateTimeFormat("es-CO", {
	hour: "2-digit",
	minute: "2-digit",
	hour12: false,
});
/** "Estadio Metropolitano (Acceso Norte)" -> "Estadio Metropolitano". */
const shortName = (name: string) => name.replace(/\s*\(.*\)\s*$/, "");

const REASON_LABEL = {
	"active-flood": "cruza un arroyo activo",
	"not-accessible": "no es accesible",
} as const;

const MODES: Record<
	TransportMode,
	{ icon: LucideIcon; label: string; tile: string }
> = {
	transmetro: { icon: TramFront, label: "Transmetro", tile: "q-tile--gold" },
	bus: { icon: Bus, label: "Bus", tile: "q-tile--gold" },
	taxi_verified: {
		icon: CarTaxiFront,
		label: "Taxi verificado",
		tile: "q-tile--gold",
	},
	walk: { icon: Footprints, label: "Camina", tile: "" },
	bike: { icon: Bike, label: "Bici", tile: "q-tile--green" },
};

const STROKE = 1.75;

interface RouteCardProps {
	stops: CorridorStop[];
	query: RouteQuery;
	onQueryChange: (query: RouteQuery) => void;
	plan: PlanResponse | null;
	loading: boolean;
	error: string | null;
	/** The one interrupting alert (flood), shown on top of the card. */
	alert?: ReactNode;
	/** Opens the Guide. On wide screens the panel has its own button, so this one hides there. */
	onOpenGuide: () => void;
	/** Starts guidance on the chosen route. When set it becomes the primary action. */
	onStart?: () => void;
	/**
	 * Shows the "datos simulados 2034" tag. Off by default: on the map screen the
	 * header carries the one tag per screen (epic #57, rule 9).
	 */
	showSimTag?: boolean;
}

/** Small decorative illustration for a state block. */
function StateArt({ src }: { src: string }) {
	return (
		<span className="q-illus" style={{ padding: 8 }} aria-hidden="true">
			<img src={src} alt="" style={{ height: 88, width: "auto" }} />
		</span>
	);
}

/** Minutes since the shown plan arrived, for the offline note. */
function usePlanAge(plan: PlanResponse | null): number {
	const [receivedAt, setReceivedAt] = useState(() => Date.now());
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		if (plan) setReceivedAt(Date.now());
	}, [plan]);
	useEffect(() => {
		const timer = setInterval(() => setNow(Date.now()), 30_000);
		return () => clearInterval(timer);
	}, []);
	return Math.max(0, Math.round((now - receivedAt) / 60_000));
}

function StateBlock({
	kind,
	title,
	text,
	glyph,
	children,
}: {
	kind: "loading" | "empty" | "error" | "offline";
	title: string;
	text: string;
	glyph: ReactNode;
	children?: ReactNode;
}) {
	return (
		<div
			className={`q-state q-state--${kind}`}
			role={kind === "error" ? "alert" : "status"}
			style={{ minHeight: 0, padding: "16px 8px" }}
		>
			{glyph}
			<p className="q-state__title">{title}</p>
			<p className="q-state__text">{text}</p>
			{children ? <div className="q-state__action">{children}</div> : null}
		</div>
	);
}

function Legs({
	route,
	names,
	accessible,
}: {
	route: Itinerary;
	names: Map<string, string>;
	/** Mentions accessible legs only when the visitor asked for them. */
	accessible: boolean;
}) {
	return (
		<ol className="m-0 flex list-none flex-col gap-2 p-0" aria-label="Tramos">
			{route.legs.map((leg) => {
				const mode = MODES[leg.mode];
				const Icon = mode.icon;
				const to = names.get(leg.destinationStopCode) ?? "tu destino";
				const from = names.get(leg.originStopCode) ?? "tu punto";
				return (
					<li key={leg.code} className="flex items-center gap-3">
						<span
							className={`q-tile ${mode.tile}`}
							style={{ width: 40, height: 40, borderRadius: 12 }}
							aria-hidden="true"
						>
							<Icon size={20} strokeWidth={STROKE} />
						</span>
						<span className="flex min-w-0 flex-1 flex-col">
							<b className="text-[15px] leading-5">
								{mode.label} hacia {to}
							</b>
							<small className="q-muted text-[13px] leading-[18px]">
								Desde {from} · {leg.distanceKm.toLocaleString("es-CO")} km
								{accessible && leg.isAccessible ? " · accesible" : ""}
							</small>
						</span>
						<span className="q-num font-semibold">{leg.minutes} min</span>
					</li>
				);
			})}
		</ol>
	);
}

/** "Tu siguiente paso": one card, one decision, one sentence of why. Details stay folded. */
export function RouteCard({
	stops,
	query,
	onQueryChange,
	plan,
	loading,
	error,
	alert,
	onOpenGuide,
	onStart,
	showSimTag = false,
}: RouteCardProps) {
	const online = useOnline();
	const age = usePlanAge(plan);
	const names = new Map(stops.map((stop) => [stop.code, shortName(stop.name)]));
	const route = plan?.route ?? null;
	const recalculated = isRecalculated(plan);
	const sameStop = query.origin === query.destination;
	const retry = () => onQueryChange({ ...query });
	const paidLeg = route?.legs.find((leg) => leg.fareCop > 0) ?? null;
	const reportHref = paidLeg
		? `/reportar?segment=${encodeURIComponent(paidLeg.code)}`
		: "/reportar";
	const taxi =
		route?.legs.some((leg) => leg.mode === "taxi_verified") === false
			? plan?.alternatives.find((item) => /taxi/i.test(item.label))
			: undefined;
	const MainIcon = route
		? MODES[
				(route.legs.find((leg) => leg.mode !== "walk") ?? route.legs[0]).mode
			].icon
		: Navigation;
	const badge = route
		? route.isGreen && route.accessible
			? "Ruta verde · accesible"
			: route.isGreen
				? "Ruta verde"
				: route.accessible
					? "Ruta accesible"
					: null
		: null;
	const arrival = route
		? clock.format(new Date(Date.now() + route.durationMinutes * 60_000))
		: "";
	const destination = names.get(query.destination) ?? "tu destino";

	let body: ReactNode;
	if (sameStop) {
		body = (
			<StateBlock
				kind="empty"
				title="Elige a dónde vas"
				text="Tu punto de partida y tu destino son el mismo. Cambia uno para ver la ruta."
				glyph={<StateArt src="/illustrations/undraw-location-search.svg" />}
			/>
		);
	} else if (loading && !plan) {
		body = (
			<StateBlock
				kind="loading"
				title={
					query.accessibleMode
						? "Calculando tu ruta accesible"
						: "Calculando tu ruta"
				}
				text="Revisamos tiempo, tarifas y arroyos."
				glyph={
					<span className="q-state__glyph" aria-hidden="true">
						<span className="q-star q-star--think" />
					</span>
				}
			/>
		);
	} else if (error && !plan) {
		body = online ? (
			<StateBlock
				kind="error"
				title="No pudimos calcular la ruta"
				text="Revisa tu señal e inténtalo otra vez."
				glyph={<StateArt src="/illustrations/live-map.svg" />}
			>
				<button
					type="button"
					className="q-btn q-btn--secondary"
					onClick={retry}
				>
					<RotateCw size={18} strokeWidth={STROKE} aria-hidden="true" />
					Reintentar
				</button>
			</StateBlock>
		) : (
			<StateBlock
				kind="offline"
				title="Sin conexión"
				text="Cuando vuelva la señal calculamos tu ruta. El Guía funciona sin conexión."
				glyph={
					<span className="q-state__glyph" aria-hidden="true">
						<WifiOff size={28} strokeWidth={STROKE} />
					</span>
				}
			/>
		);
	} else if (plan && !route) {
		body = (
			<StateBlock
				kind="empty"
				title={
					query.accessibleMode
						? "No hay ruta accesible ahora"
						: "No hay ruta segura ahora"
				}
				text={routeWhy(plan)}
				glyph={<StateArt src="/illustrations/walking.svg" />}
			/>
		);
	} else if (plan && route) {
		body = (
			<div
				className="flex flex-col gap-3"
				aria-busy={loading}
				style={{ opacity: loading ? 0.6 : 1 }}
			>
				<div className="flex items-center gap-3">
					<div className="flex min-w-0 flex-1 flex-col gap-1.5">
						<h2 className="q-next-step__title" id="route-card-title">
							Ve a {destination}
						</h2>
						<p className="q-next-step__why">{routeWhy(plan)}</p>
					</div>
					<span
						className="q-tile q-tile--green"
						style={{ width: 64, height: 64, borderRadius: 20 }}
						aria-hidden="true"
					>
						<MainIcon size={30} strokeWidth={STROKE} />
					</span>
				</div>

				<dl className="q-next-step__facts">
					<div>
						<dt>
							<Clock size={13} strokeWidth={STROKE} aria-hidden="true" /> Tiempo
						</dt>
						<dd>{route.durationMinutes} min</dd>
					</div>
					<div>
						<dt>
							<Ticket size={13} strokeWidth={STROKE} aria-hidden="true" />{" "}
							Tarifa de referencia
						</dt>
						<dd>{fare(route.fareCop)}</dd>
					</div>
					<div>
						<dt>
							<Flag size={13} strokeWidth={STROKE} aria-hidden="true" /> Llegas
						</dt>
						<dd>{arrival}</dd>
					</div>
				</dl>

				<Legs route={route} names={names} accessible={query.accessibleMode} />

				{taxi ? (
					<p className="q-sm m-0 flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--gold-soft)] px-3 py-2">
						<CarTaxiFront
							size={16}
							strokeWidth={STROKE}
							aria-hidden="true"
							className="flex-none text-[var(--gold-text)]"
						/>
						<span>
							Taxi verificado: {taxi.durationMinutes} min, tarifa de referencia{" "}
							<strong className="q-num">{fare(taxi.fareCop)}</strong>
						</span>
					</p>
				) : null}

				<details className="q-details">
					<summary>Ver detalles</summary>
					<div className="q-details__body">
						<dl className="m-0 flex flex-col gap-1.5">
							{plan.chosenBy === "openjev" ? (
								<div className="flex justify-between gap-3">
									<dt>Confianza de la ruta</dt>
									<dd className="q-num m-0">
										{confidenceLabel(plan.confidence)}
									</dd>
								</div>
							) : null}
							<div className="flex justify-between gap-3">
								<dt>Cómo la elegimos</dt>
								<dd className="m-0 text-right">
									{plan.chosenBy === "openjev"
										? "Modelo de decisión OpenJev"
										: "Tiempo, tarifa y congestión"}
								</dd>
							</div>
						</dl>
						{plan.discarded.length > 0 ? (
							<ul className="m-0 flex list-none flex-col gap-1 p-0">
								{plan.discarded.map((item) => (
									<li key={item.id}>
										Descartada: {item.label} ({REASON_LABEL[item.reason]})
									</li>
								))}
							</ul>
						) : null}
						{plan.alternatives.length > 0 ? (
							<ul className="m-0 flex list-none flex-col gap-1 p-0">
								{plan.alternatives.map((item) => (
									<li key={item.id}>
										Otra opción: {item.label}, {item.durationMinutes} min,{" "}
										{fare(item.fareCop)}
									</li>
								))}
							</ul>
						) : null}
						<p className="m-0">
							Fuentes: datos abiertos de transporte y alertas de arroyos.
						</p>
					</div>
				</details>

				<a
					href={reportHref}
					className="q-btn q-btn--ghost q-btn--sm min-h-11 justify-start px-3"
				>
					<Flag size={16} strokeWidth={STROKE} aria-hidden="true" />
					¿Te cobraron de más? Reportar cobro abusivo
				</a>

				{!online ? (
					<p className="q-sm q-muted m-0 flex items-start gap-2">
						<WifiOff size={16} strokeWidth={STROKE} aria-hidden="true" />
						Sin conexión: ruta guardada{" "}
						{age === 0 ? "hace un momento" : `hace ${age} min`}. Puedes seguirla
						igual.
					</p>
				) : error ? (
					<p className="q-sm q-muted m-0 flex items-center gap-2">
						No pudimos actualizar la ruta.
						<button
							type="button"
							className="q-btn q-btn--ghost q-btn--sm"
							onClick={retry}
						>
							<RotateCw size={16} strokeWidth={STROKE} aria-hidden="true" />
							Reintentar
						</button>
					</p>
				) : null}
			</div>
		);
	}

	return (
		<section
			className="q-next-step corridor-detail route-card"
			aria-labelledby={route ? "route-card-title" : undefined}
			aria-label={route ? undefined : "Tu siguiente paso"}
		>
			{alert}
			<div className="q-next-step__head flex-wrap">
				<p className="q-next-step__eyebrow whitespace-nowrap">
					<span className="q-star" aria-hidden="true" />
					{recalculated ? "Ruta recalculada" : "Tu siguiente paso"}
				</p>
				{badge ? (
					<span className="q-badge q-badge--optimal">
						{route?.accessible ? (
							<Accessibility
								size={14}
								strokeWidth={STROKE}
								aria-hidden="true"
							/>
						) : (
							<Leaf size={14} strokeWidth={STROKE} aria-hidden="true" />
						)}
						{badge}
					</span>
				) : null}
			</div>

			<div className="route-card__fields">
				<label>
					<span className="q-sm q-muted inline-flex items-center gap-1">
						<MapPin size={14} strokeWidth={STROKE} aria-hidden="true" /> Estás
						en
					</span>
					<select
						value={query.origin}
						onChange={(event) =>
							onQueryChange({ ...query, origin: event.target.value })
						}
					>
						{stops.map((stop) => (
							<option key={stop.code} value={stop.code}>
								{stop.name}
							</option>
						))}
					</select>
				</label>
				<label>
					<span className="q-sm q-muted inline-flex items-center gap-1">
						<Flag size={14} strokeWidth={STROKE} aria-hidden="true" /> Vas a
					</span>
					<select
						value={query.destination}
						onChange={(event) =>
							onQueryChange({ ...query, destination: event.target.value })
						}
					>
						{stops.map((stop) => (
							<option key={stop.code} value={stop.code}>
								{stop.name}
							</option>
						))}
					</select>
				</label>
			</div>

			<label className="route-card__toggle">
				<input
					type="checkbox"
					checked={query.accessibleMode}
					onChange={(event) =>
						onQueryChange({ ...query, accessibleMode: event.target.checked })
					}
				/>
				<Accessibility size={18} strokeWidth={STROKE} aria-hidden="true" />
				<span>Necesito una ruta accesible</span>
			</label>

			<div aria-live="polite">{body}</div>

			{showSimTag ? (
				<span className="q-sim-tag self-start">Datos simulados 2034</span>
			) : null}

			{/* Sticky so the action stays in reach while the card scrolls on phones. */}
			<div className="sticky bottom-0 z-[1] -mx-5 -mb-5 flex flex-col gap-2 bg-[var(--surface-raised)] px-5 pt-2 pb-5 empty:hidden">
				{onStart && route ? (
					<button
						type="button"
						className="q-btn q-btn--primary q-btn--block"
						onClick={onStart}
					>
						<Navigation size={20} strokeWidth={STROKE} aria-hidden="true" />
						{query.accessibleMode ? "Empezar ruta accesible" : "Empezar ruta"}
					</button>
				) : null}
				<div className="route-card__guide">
					<button
						type="button"
						className={`q-btn q-btn--block ${onStart && route ? "q-btn--ghost" : "q-btn--primary"}`}
						onClick={onOpenGuide}
					>
						<MessageCircle size={20} strokeWidth={STROKE} aria-hidden="true" />
						Pregúntale al Guía · Ask the Guide
					</button>
				</div>
			</div>
		</section>
	);
}
