import {
	Accessibility,
	Bus,
	BusFront,
	CarTaxiFront,
	CloudRain,
	Footprints,
	HeartHandshake,
	type LucideIcon,
	MapPin,
	Route,
	Sun,
	TriangleAlert,
	UserRound,
	Waves,
} from "lucide-react";
import type {
	AffectedRoute,
	AffectedRouteState,
	ArroyoRow,
	HostDispatch,
	HostDispatchStep,
	SectionLoadState,
} from "./city-sections-types";
import {
	arroyoAlertTitle,
	joinNames,
	summarizeArroyos,
} from "./flood-response-utils";
import { SectionRow } from "./section-row";
import { SectionState } from "./section-state";
import { StepTrack } from "./step-track";

const ROUTE_ICONS: Record<AffectedRoute["icon"], LucideIcon> = {
	bus: Bus,
	"bus-front": BusFront,
	accessible: Accessibility,
	walk: Footprints,
	taxi: CarTaxiFront,
};

const ROUTE_STATES: Record<
	AffectedRouteState,
	{ label: string; badge: string; tone: "alert" | "safe" }
> = {
	blocked: { label: "× Bloqueada", badge: "q-badge--alert", tone: "alert" },
	suspended: { label: "× Suspendida", badge: "q-badge--alert", tone: "alert" },
	active: { label: "✓ Activa", badge: "q-badge--optimal", tone: "safe" },
};

const HOST_STEPS: { key: HostDispatchStep; label: string }[] = [
	{ key: "requested", label: "Pedida" },
	{ key: "accepted", label: "Aceptada" },
	{ key: "arrived", label: "Llegó" },
];

interface FloodResponseSectionProps {
	arroyos: readonly ArroyoRow[];
	routes: readonly AffectedRoute[];
	hosts: readonly HostDispatch[];
	loadState: SectionLoadState;
	staleLabel?: string;
	/** Clock time the rain ("aguacero") event was sent, e.g. "17:18". */
	rainSentAt?: string;
	/** Visitors whose route was recalculated. */
	recalculatedVisitors?: number;
	/** Plain line about free host pairs, e.g. "2 duplas libres en Troncal Murillo". */
	freeHostsLabel?: string;
	onViewAssignment?: (hostId: string) => void;
	onRetry?: () => void;
}

function ArroyoTrailing({ row }: { row: ArroyoRow }) {
	if (row.status.kind === "active") {
		return (
			<span className="q-badge q-badge--alert q-badge--solid">! Activo</span>
		);
	}
	if (row.status.kind === "countdown") {
		return (
			<span className="flex flex-col items-end">
				<span className="text-[12px] text-[var(--ink-muted)]">Activo en</span>
				<b className="q-num text-[17px] text-[var(--red-text)]">
					{row.status.minutesLeft} min
				</b>
			</span>
		);
	}
	return <span className="q-badge q-badge--optimal">✓ Seguro</span>;
}

/**
 * Active arroyo follow-up for the Centro de Mando: arroyos with countdown,
 * recalculated routes and host pairs dispatched. Never a modal; no primary action.
 */
export function FloodResponseSection({
	arroyos,
	routes,
	hosts,
	loadState,
	staleLabel,
	rainSentAt,
	recalculatedVisitors,
	freeHostsLabel,
	onViewAssignment,
	onRetry,
}: FloodResponseSectionProps) {
	if (loadState === "loading") {
		return (
			<div className="q-panel">
				<SectionState
					kind="loading"
					title="Cargando el corredor"
					text="Arroyos, rutas y anfitriones."
				/>
			</div>
		);
	}
	if (loadState === "error") {
		return (
			<div className="q-panel">
				<SectionState
					kind="error"
					icon={CloudRain}
					title="No pudimos leer los arroyos"
					text="Revisa la conexión del tablero. Las rutas de los visitantes ya se recalcularon en su celular."
					onRetry={onRetry}
				/>
			</div>
		);
	}

	const summary = summarizeArroyos(arroyos);
	if (summary.alerted.length === 0) {
		return (
			<div className="q-panel">
				<SectionState
					kind="empty"
					illustration="/illustrations/walking.svg"
					title="Sin arroyos activos"
					text="Las rutas de los visitantes van por su camino normal."
				/>
			</div>
		);
	}

	const offline = loadState === "offline";

	return (
		<div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-2">
			<div className="flex min-w-0 flex-col gap-4">
				{offline ? (
					<div className="q-panel flex-row items-center gap-3">
						<span
							className="q-state__glyph size-12 rounded-2xl text-xl"
							aria-hidden="true"
						>
							<CloudRain size={22} strokeWidth={1.75} />
						</span>
						<div>
							<h2 className="q-h3">Sin conexión</h2>
							<p className="q-sm q-muted m-0">
								Ves el último estado conocido
								{staleLabel ? `, de ${staleLabel}` : ""}. Los eventos nuevos
								llegan al volver la red.
							</p>
						</div>
					</div>
				) : (
					<div
						className="q-alert q-alert--alert"
						role="status"
						aria-live="polite"
					>
						<span className="q-alert__icon" aria-hidden="true">
							<TriangleAlert size={16} strokeWidth={1.75} />
						</span>
						<div className="q-alert__body">
							<p className="q-alert__title">{arroyoAlertTitle(summary)}</p>
							<p className="q-alert__text">
								{joinNames(summary.alerted.map((row) => row.name))}. Las rutas
								ya están recalculadas.
							</p>
						</div>
					</div>
				)}

				<section
					className="q-panel gap-3 p-5"
					aria-labelledby="flood-arroyos-title"
				>
					<div className="flex flex-wrap items-baseline justify-between gap-3">
						<h2
							id="flood-arroyos-title"
							className="q-h3 flex items-center gap-2"
						>
							<CloudRain size={18} strokeWidth={1.75} aria-hidden="true" />
							Arroyos
						</h2>
						{rainSentAt && (
							<span className="q-sm q-muted">
								Aguacero enviado a las {rainSentAt}
							</span>
						)}
					</div>
					<ul className="m-0 flex list-none flex-col gap-2 p-0">
						{arroyos.map((row) => (
							<li key={row.id}>
								<SectionRow
									icon={row.status.kind === "none" ? Sun : Waves}
									tone={row.status.kind === "none" ? "safe" : "alert"}
									title={
										row.status.kind === "none" ? row.name : `! ${row.name}`
									}
									detail={
										row.status.kind === "none"
											? `${row.zoneLabel} · sin alerta`
											: `${row.zoneLabel} · ${row.riskLabel}`
									}
									trailing={<ArroyoTrailing row={row} />}
								/>
							</li>
						))}
					</ul>
				</section>
			</div>

			<div className="flex min-w-0 flex-col gap-4">
				<section
					className="q-panel gap-3 p-5"
					aria-labelledby="flood-routes-title"
				>
					<div className="flex flex-wrap items-baseline justify-between gap-3">
						<h2
							id="flood-routes-title"
							className="q-h3 flex items-center gap-2"
						>
							<Route size={18} strokeWidth={1.75} aria-hidden="true" />
							Rutas afectadas
						</h2>
						{recalculatedVisitors !== undefined && (
							<span className="q-sm q-muted">
								{recalculatedVisitors} visitantes con ruta recalculada
							</span>
						)}
					</div>
					{routes.length === 0 ? (
						<p className="q-sm q-muted m-0">
							Ninguna ruta cruza estos arroyos.
						</p>
					) : (
						<ul className="m-0 flex list-none flex-col gap-2 p-0">
							{routes.map((route) => {
								const state = ROUTE_STATES[route.state];
								return (
									<li key={route.id}>
										<SectionRow
											icon={ROUTE_ICONS[route.icon]}
											tone={state.tone}
											title={route.label}
											detail={route.detail}
											trailing={
												<span className={`q-badge ${state.badge}`}>
													{state.label}
												</span>
											}
										/>
									</li>
								);
							})}
						</ul>
					)}
				</section>

				<section
					className="q-panel gap-3 p-5"
					aria-labelledby="flood-hosts-title"
				>
					<div className="flex flex-wrap items-baseline justify-between gap-3">
						<h2 id="flood-hosts-title" className="q-h3 flex items-center gap-2">
							<HeartHandshake size={18} strokeWidth={1.75} aria-hidden="true" />
							Anfitriones
						</h2>
						{freeHostsLabel && (
							<span className="q-sm q-muted">{freeHostsLabel}</span>
						)}
					</div>
					{hosts.length === 0 ? (
						<p className="q-sm q-muted m-0">
							Ningún visitante pidió anfitrión por ahora.
						</p>
					) : (
						<ul className="m-0 flex list-none flex-col gap-2 p-0">
							{hosts.map((host) => {
								const doneCount = HOST_STEPS.filter(
									(s) => host.steps[s.key],
								).length;
								return (
									<li key={host.id} className="flex flex-col gap-2">
										<SectionRow
											icon={MapPin}
											tone="event"
											title={host.title}
											detail={host.detail}
										>
											<StepTrack
												label="Estado de la asignación"
												current={Math.min(doneCount, HOST_STEPS.length) - 1}
												steps={HOST_STEPS.map((step) => ({
													label: host.steps[step.key]
														? `${step.label} ${host.steps[step.key]}`
														: step.label,
													done: Boolean(host.steps[step.key]),
												}))}
											/>
										</SectionRow>
										{onViewAssignment && (
											<button
												type="button"
												className="q-btn q-btn--secondary self-start"
												onClick={() => onViewAssignment(host.id)}
											>
												<UserRound
													size={18}
													strokeWidth={1.75}
													aria-hidden="true"
												/>
												Ver asignación
											</button>
										)}
									</li>
								);
							})}
						</ul>
					)}
				</section>
			</div>
		</div>
	);
}
