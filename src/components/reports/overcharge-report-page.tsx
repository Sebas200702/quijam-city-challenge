import {
	AlertTriangle,
	ArrowLeft,
	CircleCheck,
	CloudOff,
	RefreshCw,
	Send,
	ShieldCheck,
} from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { formatCop } from "../../lib/city-dashboard-utils";
import { useCityState } from "../../lib/city-events/use-city-state";
import {
	REPORT_TRANSPORT_MODES,
	type ReportTransportMode,
} from "../../lib/reports/overcharge-report";
import type {
	OverchargeSubmitResponse,
	PendingOverchargeReport,
	SelectableFareRoute,
} from "../../lib/reports/overcharge-report-types";
import {
	evaluateOvercharge,
	queuePendingReport,
	readPendingReports,
	writePendingReports,
} from "../../lib/reports/overcharge-routes";

const VEHICLE_LABELS: Record<ReportTransportMode, string> = {
	taxi: "Taxi",
	bus: "Bus",
	informal: "Informal",
	other: "Otro",
};

type FormStatus =
	| { kind: "idle" }
	| { kind: "sending" }
	| {
			kind: "saved";
			reportId: string;
			percent: number | null;
			routeLabel: string;
			chargedCop: number;
			referenceCop: number;
	  }
	| { kind: "offline"; queuedCount: number }
	| { kind: "error"; message: string };

interface OverchargeReportPageProps {
	routes: SelectableFareRoute[];
	initialSegmentCode: string | null;
}

export function OverchargeReportPage({
	routes,
	initialSegmentCode,
}: OverchargeReportPageProps) {
	const id = useId();
	const { publish } = useCityState();

	const initialRoute = useMemo(() => {
		if (initialSegmentCode) {
			const match = routes.find(
				(route) => route.segmentCode === initialSegmentCode,
			);
			if (match) return match;
		}
		return routes[0] ?? null;
	}, [routes, initialSegmentCode]);

	const [segmentCode, setSegmentCode] = useState(
		initialRoute?.segmentCode ?? "",
	);
	const [vehicle, setVehicle] = useState<ReportTransportMode>(
		initialRoute?.defaultVehicle ?? "taxi",
	);
	const [charged, setCharged] = useState("");
	const [driverCode, setDriverCode] = useState("");
	const [notes, setNotes] = useState("");
	const [status, setStatus] = useState<FormStatus>({ kind: "idle" });
	const [isOnline, setIsOnline] = useState(true);
	const [pendingCount, setPendingCount] = useState(0);
	const [syncingPending, setSyncingPending] = useState(false);

	useEffect(() => {
		setIsOnline(navigator.onLine);
		setPendingCount(readPendingReports().length);
		const onOnline = () => setIsOnline(true);
		const onOffline = () => setIsOnline(false);
		window.addEventListener("online", onOnline);
		window.addEventListener("offline", onOffline);
		return () => {
			window.removeEventListener("online", onOnline);
			window.removeEventListener("offline", onOffline);
		};
	}, []);

	const selectedRoute = useMemo(
		() =>
			routes.find((route) => route.segmentCode === segmentCode) ??
			routes[0] ??
			null,
		[routes, segmentCode],
	);

	const chargedNumber = Number(charged);
	const comparison = useMemo(() => {
		if (!selectedRoute || !charged.trim()) return null;
		return evaluateOvercharge(chargedNumber, selectedRoute.referenceFareCop);
	}, [selectedRoute, charged, chargedNumber]);

	function handleRouteChange(nextCode: string) {
		setSegmentCode(nextCode);
		const nextRoute = routes.find((route) => route.segmentCode === nextCode);
		if (nextRoute) {
			setVehicle(nextRoute.defaultVehicle);
		}
	}

	function resetForm() {
		setCharged("");
		setDriverCode("");
		setNotes("");
		setStatus({ kind: "idle" });
	}

	async function syncPendingQueue() {
		const queued = readPendingReports();
		if (queued.length === 0 || syncingPending) return;
		setSyncingPending(true);
		const remaining: PendingOverchargeReport[] = [];

		for (const item of queued) {
			try {
				const response = await fetch("/api/reports", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						segmentCode: item.segmentCode,
						transportMode: item.transportMode,
						chargedFareCop: item.chargedFareCop,
						driverQrCode: item.driverQrCode,
						notes: item.notes,
					}),
				});
				if (response.ok) {
					const body = (await response.json()) as OverchargeSubmitResponse;
					if (body.reportId) {
						void publish({ type: "cobro_abusivo", reportId: body.reportId });
					}
				} else if (response.status >= 500) {
					remaining.push(item);
				}
			} catch {
				remaining.push(item);
			}
		}

		writePendingReports(remaining);
		setPendingCount(remaining.length);
		setSyncingPending(false);
		if (remaining.length === 0 && status.kind === "offline") {
			setStatus({ kind: "idle" });
		}
	}

	async function handleSubmit(event: { preventDefault: () => void }) {
		event.preventDefault();
		if (!selectedRoute) return;

		const amount = Math.round(Number(charged));
		if (!Number.isInteger(amount) || amount <= 0) {
			setStatus({
				kind: "error",
				message: "Ingresa un monto cobrado válido en pesos colombianos (COP).",
			});
			return;
		}

		const payload = {
			segmentCode: selectedRoute.segmentCode,
			transportMode: vehicle,
			chargedFareCop: amount,
			driverQrCode: driverCode.trim(),
			notes: notes.trim(),
		};

		if (!navigator.onLine) {
			const count = queuePendingReport({
				...payload,
				queuedAt: new Date().toISOString(),
			});
			setPendingCount(count);
			setStatus({ kind: "offline", queuedCount: count });
			return;
		}

		setStatus({ kind: "sending" });
		try {
			const response = await fetch("/api/reports", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});

			if (response.ok) {
				const body = (await response.json()) as OverchargeSubmitResponse;
				if (body.reportId) {
					void publish({ type: "cobro_abusivo", reportId: body.reportId });
				}
				setStatus({
					kind: "saved",
					reportId: body.reportId,
					percent: body.overchargePercent,
					routeLabel: selectedRoute.label,
					chargedCop: amount,
					referenceCop: body.referenceFareCop,
				});
				return;
			}

			if (response.status >= 500) {
				const count = queuePendingReport({
					...payload,
					queuedAt: new Date().toISOString(),
				});
				setPendingCount(count);
				setStatus({ kind: "offline", queuedCount: count });
				return;
			}

			const body = (await response.json().catch(() => null)) as {
				error?: string;
			} | null;
			setStatus({
				kind: "error",
				message:
					body?.error ??
					"No pudimos validar el reporte. Revisa los datos e intenta de nuevo.",
			});
		} catch {
			const count = queuePendingReport({
				...payload,
				queuedAt: new Date().toISOString(),
			});
			setPendingCount(count);
			setStatus({ kind: "offline", queuedCount: count });
		}
	}

	if (routes.length === 0 || !selectedRoute) {
		return (
			<section className="q-card" aria-labelledby={`${id}-empty`}>
				<div className="q-band q-band--gold" aria-hidden="true" />
				<div className="q-card__head">
					<div>
						<p className="q-eyebrow">Tarifa justa</p>
						<h1 id={`${id}-empty`} className="q-h2 mt-1">
							No hay trayectos disponibles
						</h1>
					</div>
				</div>
				<div className="q-card__body">
					<p className="q-p q-muted">
						No pudimos cargar los trayectos del corredor en este momento. Vuelve
						al mapa para consultar las tarifas oficiales.
					</p>
					<a href="/mapa" className="q-btn q-btn--primary">
						<ArrowLeft size={18} strokeWidth={1.75} aria-hidden="true" />
						Volver al mapa
					</a>
				</div>
			</section>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<a href="/mapa" className="q-btn q-btn--ghost q-btn--sm">
					<ArrowLeft size={18} strokeWidth={1.75} aria-hidden="true" />
					Volver al mapa
				</a>
				<span className="q-sim-tag">Datos de referencia</span>
			</div>

			{!isOnline && (
				<div
					role="status"
					className="flex items-center gap-3 rounded-[var(--radius-md)] bg-[var(--gold-soft)] px-4 py-3 text-sm text-[var(--ink)]"
				>
					<CloudOff
						size={20}
						strokeWidth={1.75}
						className="shrink-0 text-[var(--gold-text)]"
						aria-hidden="true"
					/>
					<span>
						Sin conexión. Puedes llenar el reporte igual: lo guardaremos en este
						teléfono para enviarlo después.
					</span>
				</div>
			)}

			{pendingCount > 0 && isOnline && (
				<div
					role="status"
					className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] bg-[var(--gold-soft)] px-4 py-3 text-sm text-[var(--ink)]"
				>
					<span>
						Tienes {pendingCount} reporte(s) pendiente(s) guardado(s) sin
						conexión.
					</span>
					<button
						type="button"
						className="q-btn q-btn--secondary q-btn--sm"
						disabled={syncingPending}
						aria-busy={syncingPending}
						onClick={() => void syncPendingQueue()}
					>
						<RefreshCw size={16} strokeWidth={1.75} aria-hidden="true" />
						{syncingPending ? "Reenviando…" : "Reenviar ahora"}
					</button>
				</div>
			)}

			{status.kind === "saved" ? (
				<section
					className="q-card"
					role="status"
					aria-live="polite"
					aria-labelledby={`${id}-saved-title`}
				>
					<div className="q-band q-band--green" aria-hidden="true" />
					<div className="q-card__head">
						<div className="flex items-center gap-3">
							<CircleCheck
								size={24}
								strokeWidth={1.75}
								className="shrink-0 text-[var(--green-text)]"
								aria-hidden="true"
							/>
							<div>
								<p className="q-eyebrow">Reporte enviado</p>
								<h1 id={`${id}-saved-title`} className="q-h2 mt-0.5">
									La ciudad ya recibió tu reporte
								</h1>
							</div>
						</div>
						<span className="q-badge q-badge--alert">Nuevo</span>
					</div>
					<div className="q-card__body space-y-4">
						<p className="q-p">
							{status.percent !== null && status.percent > 0
								? `Reportaste un cobro de ${formatCop(status.chargedCop)} (${status.percent} % por encima de la tarifa de referencia de ${formatCop(status.referenceCop)}).`
								: `Reportaste un cobro de ${formatCop(status.chargedCop)} frente a una tarifa de referencia de ${formatCop(status.referenceCop)}.`}
						</p>
						<div className="rounded-[var(--radius-md)] bg-[var(--bg)] p-4 text-sm space-y-1.5">
							<p className="font-semibold text-[var(--ink)]">
								{status.routeLabel}
							</p>
							<p className="q-sm q-muted">
								Estado actual: <strong>Nuevo</strong> · Pasará a{" "}
								<strong>En revisión</strong> y <strong>Resuelto</strong> en el
								tablero de ciudad.
							</p>
							<p className="font-mono text-xs text-[var(--ink-subtle)]">
								Referencia #{status.reportId.slice(0, 8)}
							</p>
						</div>
						<div className="q-row">
							<button
								type="button"
								className="q-btn q-btn--primary"
								onClick={resetForm}
							>
								Reportar otro cobro
							</button>
							<a href="/mapa" className="q-btn q-btn--secondary">
								Volver al mapa
							</a>
						</div>
					</div>
				</section>
			) : status.kind === "offline" ? (
				<section
					className="q-card"
					role="status"
					aria-live="polite"
					aria-labelledby={`${id}-offline-title`}
				>
					<div className="q-band q-band--gold" aria-hidden="true" />
					<div className="q-card__head">
						<div className="flex items-center gap-3">
							<CloudOff
								size={24}
								strokeWidth={1.75}
								className="shrink-0 text-[var(--gold-text)]"
								aria-hidden="true"
							/>
							<div>
								<p className="q-eyebrow">Guardado sin conexión</p>
								<h1 id={`${id}-offline-title`} className="q-h2 mt-0.5">
									Tu reporte quedó en este teléfono
								</h1>
							</div>
						</div>
					</div>
					<div className="q-card__body space-y-4">
						<p className="q-p q-muted">
							No pudimos conectarnos con el servidor en este momento. Guardamos
							tu reporte ({status.queuedCount} en cola) para enviarlo cuando
							vuelva la señal.
						</p>
						<div className="q-row">
							<button
								type="button"
								className="q-btn q-btn--primary"
								disabled={syncingPending}
								onClick={() => void syncPendingQueue()}
							>
								<RefreshCw size={18} strokeWidth={1.75} aria-hidden="true" />
								{syncingPending ? "Reintentando…" : "Reintentar envío"}
							</button>
							<button
								type="button"
								className="q-btn q-btn--secondary"
								onClick={resetForm}
							>
								Nuevo reporte
							</button>
						</div>
					</div>
				</section>
			) : (
				<section className="q-card" aria-labelledby={`${id}-title`}>
					<div className="q-band q-band--gold" aria-hidden="true" />
					<div className="q-card__head">
						<div>
							<p className="q-eyebrow">Tarifa justa · Reporte anónimo</p>
							<h1 id={`${id}-title`} className="q-h1 mt-1">
								Reportar cobro abusivo
							</h1>
						</div>
					</div>

					<form className="q-card__body space-y-5" onSubmit={handleSubmit}>
						<label className="block space-y-1.5" htmlFor={`${id}-route`}>
							<span className="q-sm font-semibold text-[var(--ink)]">
								Trayecto del corredor
							</span>
							<select
								id={`${id}-route`}
								value={selectedRoute.segmentCode}
								onChange={(event) => handleRouteChange(event.target.value)}
								className="min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--line-control)] bg-[var(--surface-raised)] px-3.5 py-2.5 text-[15px] text-[var(--ink)]"
							>
								{routes.map((route) => (
									<option key={route.segmentCode} value={route.segmentCode}>
										{route.label} ({VEHICLE_LABELS[route.defaultVehicle]} ·{" "}
										{formatCop(route.referenceFareCop)})
									</option>
								))}
							</select>
						</label>

						<div
							className="rounded-[var(--radius-md)] bg-[var(--green-soft)] p-4"
							aria-live="polite"
						>
							<p className="q-eyebrow text-[var(--green-text)]">
								Tarifa oficial de referencia
							</p>
							<div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
								<span className="q-num text-2xl font-bold text-[var(--ink)]">
									{formatCop(selectedRoute.referenceFareCop)}
								</span>
								{selectedRoute.fareMinCop !== selectedRoute.fareMaxCop && (
									<span className="q-sm q-muted">
										Rango justo: {formatCop(selectedRoute.fareMinCop)} –{" "}
										{formatCop(selectedRoute.fareMaxCop)}
									</span>
								)}
							</div>
						</div>

						<fieldset className="m-0 border-0 p-0 space-y-2">
							<legend className="q-sm font-semibold text-[var(--ink)]">
								¿En qué ibas?
							</legend>
							<div className="q-seg w-full">
								{REPORT_TRANSPORT_MODES.map((option) => (
									<button
										key={option}
										type="button"
										aria-pressed={vehicle === option}
										onClick={() => setVehicle(option)}
										className={`q-seg__opt min-h-11 flex-1 ${
											vehicle === option ? "is-on" : ""
										}`}
									>
										{VEHICLE_LABELS[option]}
									</button>
								))}
							</div>
						</fieldset>

						<div className="space-y-2">
							<label className="block space-y-1.5" htmlFor={`${id}-charged`}>
								<span className="q-sm font-semibold text-[var(--ink)]">
									Monto cobrado (COP)
								</span>
								<input
									id={`${id}-charged`}
									type="number"
									inputMode="numeric"
									min={1}
									max={2_000_000}
									step={1}
									required
									placeholder="Ej. 55000"
									value={charged}
									onChange={(event) => setCharged(event.target.value)}
									className="min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--line-control)] bg-[var(--surface-raised)] px-3.5 py-2.5 text-[15px] text-[var(--ink)]"
								/>
							</label>

							{comparison && (
								<div
									aria-live="polite"
									className={`flex items-center gap-2 rounded-[var(--radius-md)] px-3.5 py-2.5 text-sm font-medium ${
										comparison.isOvercharge
											? "bg-[var(--red-soft)] text-[var(--red-text)]"
											: "bg-[var(--green-soft)] text-[var(--green-text)]"
									}`}
								>
									{comparison.isOvercharge ? (
										<AlertTriangle
											size={18}
											strokeWidth={1.75}
											className="shrink-0"
											aria-hidden="true"
										/>
									) : (
										<CircleCheck
											size={18}
											strokeWidth={1.75}
											className="shrink-0"
											aria-hidden="true"
										/>
									)}
									<span>
										{comparison.isOvercharge
											? `Sobrecobro estimado: +${formatCop(comparison.deltaCop)}${
													comparison.percent !== null
														? ` (+${comparison.percent} % sobre referencia)`
														: ""
												}`
											: "Dentro de la tarifa de referencia."}
									</span>
								</div>
							)}
						</div>

						<label className="block space-y-1.5" htmlFor={`${id}-driver`}>
							<span className="q-sm font-semibold text-[var(--ink)]">
								Código QR del conductor{" "}
								<span className="font-normal text-[var(--ink-muted)]">
									(opcional)
								</span>
							</span>
							<input
								id={`${id}-driver`}
								type="text"
								maxLength={40}
								pattern="[A-Za-z0-9\-]+"
								placeholder="Ej. DRV-104"
								value={driverCode}
								onChange={(event) => setDriverCode(event.target.value)}
								className="min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--line-control)] bg-[var(--surface-raised)] px-3.5 py-2.5 text-[15px] text-[var(--ink)]"
							/>
						</label>

						<label className="block space-y-1.5" htmlFor={`${id}-notes`}>
							<span className="q-sm font-semibold text-[var(--ink)]">
								¿Qué pasó?{" "}
								<span className="font-normal text-[var(--ink-muted)]">
									(opcional)
								</span>
							</span>
							<textarea
								id={`${id}-notes`}
								rows={3}
								maxLength={280}
								placeholder="Describe brevemente el cobro sin incluir datos personales."
								value={notes}
								onChange={(event) => setNotes(event.target.value)}
								className="min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--line-control)] bg-[var(--surface-raised)] px-3.5 py-2.5 text-[15px] text-[var(--ink)]"
							/>
						</label>

						{status.kind === "error" && (
							<p
								role="alert"
								className="rounded-[var(--radius-md)] bg-[var(--red-soft)] px-4 py-3 text-sm text-[var(--red-text)]"
							>
								{status.message}
							</p>
						)}

						<p className="q-sm q-subtle flex items-center gap-2">
							<ShieldCheck
								size={16}
								strokeWidth={1.75}
								className="shrink-0"
								aria-hidden="true"
							/>
							Anónimo (Ley 1581 de 2012): no pedimos tu nombre ni tu ubicación
							exacta.
						</p>

						<button
							type="submit"
							className="q-btn q-btn--primary q-btn--block"
							disabled={status.kind === "sending"}
							aria-busy={status.kind === "sending"}
						>
							<Send size={18} strokeWidth={1.75} aria-hidden="true" />
							{status.kind === "sending"
								? "Enviando reporte…"
								: "Enviar reporte"}
						</button>
					</form>
				</section>
			)}
		</div>
	);
}
