import {
	ArrowUpRight,
	CloudOff,
	Compass,
	Database,
	Leaf,
	type LucideIcon,
	RefreshCw,
	Store,
	Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatFreshnessLabel } from "../lib/city-dashboard-utils";
import type { CityEvent } from "../lib/city-events/city-events-types";
import { computeProgramIndicators } from "../lib/indicators/live-indicators-calc";
import {
	fetchLiveIndicatorsRaw,
	subscribeLiveIndicatorsRealtime,
} from "../lib/indicators/live-indicators-service";
import type {
	IndicatorsRealtimeStatus,
	LiveIndicatorsRawInput,
	ProgramDimension,
} from "../lib/indicators/live-indicators-types";

const DIMENSION_ICONS: Record<ProgramDimension, LucideIcon> = {
	territorio: Compass,
	sostenibilidad: Leaf,
	ciudad_inteligente: Database,
	ciudadania: Users,
	economia: Store,
};

function badgeClassForTone(tone: "green" | "gold" | "red"): string {
	if (tone === "green") return "q-badge--optimal";
	if (tone === "gold") return "q-badge--high";
	return "q-badge--alert";
}

interface LiveIndicatorsPanelProps {
	activeFloodZoneIds: readonly string[];
	lastCityEvent: CityEvent | null;
	nowMs: number;
}

export function LiveIndicatorsPanel({
	activeFloodZoneIds,
	lastCityEvent,
	nowMs,
}: LiveIndicatorsPanelProps) {
	const [raw, setRaw] = useState<LiveIndicatorsRawInput | null>(null);
	const [updatedAt, setUpdatedAt] = useState<string | null>(null);
	const [realtimeStatus, setRealtimeStatus] =
		useState<IndicatorsRealtimeStatus>("connecting");
	const [isOnline, setIsOnline] = useState(true);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const loadIndicators = useCallback(async () => {
		try {
			const data = await fetchLiveIndicatorsRaw();
			setRaw(data);
			setUpdatedAt(new Date().toISOString());
			setError(null);
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: "No pudimos cargar los indicadores del programa.",
			);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		setIsOnline(navigator.onLine);
		const onOnline = () => {
			setIsOnline(true);
			void loadIndicators();
		};
		const onOffline = () => setIsOnline(false);
		window.addEventListener("online", onOnline);
		window.addEventListener("offline", onOffline);
		return () => {
			window.removeEventListener("online", onOnline);
			window.removeEventListener("offline", onOffline);
		};
	}, [loadIndicators]);

	useEffect(() => {
		let active = true;
		let unsubscribe: (() => void) | undefined;

		void loadIndicators();
		void subscribeLiveIndicatorsRealtime(
			() => {
				if (active) {
					void loadIndicators();
				}
			},
			(status) => {
				if (active) {
					setRealtimeStatus(status);
				}
			},
		).then((cleanup) => {
			if (active) {
				unsubscribe = cleanup;
			} else {
				cleanup();
			}
		});

		return () => {
			active = false;
			unsubscribe?.();
		};
	}, [loadIndicators]);

	useEffect(() => {
		if (!lastCityEvent) return;
		if (
			lastCityEvent.type === "cobro_abusivo" ||
			lastCityEvent.type === "aguacero" ||
			lastCityEvent.type === "reiniciar"
		) {
			void loadIndicators();
		}
	}, [lastCityEvent, loadIndicators]);

	const indicators = useMemo(() => {
		if (!raw) return [];
		return computeProgramIndicators({
			...raw,
			liveEventFloodCodes: activeFloodZoneIds,
		});
	}, [raw, activeFloodZoneIds]);

	const statusBadge = !isOnline
		? { className: "q-badge--alert", label: "Sin conexión", live: false }
		: realtimeStatus === "live"
			? { className: "q-badge--live", label: "En vivo", live: true }
			: realtimeStatus === "error"
				? { className: "q-badge--alert", label: "Reconectando", live: false }
				: { className: "q-badge--neutral", label: "Conectando", live: false };

	return (
		<section aria-labelledby="live-indicators-title" className="space-y-4">
			<div className="flex flex-wrap items-end justify-between gap-3">
				<div>
					<p className="l-eyebrow">
						<span className="q-dot" aria-hidden="true" />
						Programa QUILLART · 5 dimensiones
					</p>
					<h2
						id="live-indicators-title"
						className="l-h2 mt-2 !text-[clamp(1.6rem,3.2vw,2.4rem)]"
					>
						Indicadores en vivo
					</h2>
				</div>

				<div className="flex flex-wrap items-center gap-2">
					<span className={`q-badge ${statusBadge.className}`}>
						{statusBadge.live && <span className="q-dot" aria-hidden="true" />}
						{statusBadge.label}
					</span>
					{updatedAt && (
						<span className="q-sm q-subtle">
							{formatFreshnessLabel(updatedAt, nowMs)}
						</span>
					)}
					<button
						type="button"
						onClick={() => void loadIndicators()}
						className="q-btn q-btn--ghost q-btn--sm min-h-11"
						aria-label="Actualizar indicadores"
					>
						<RefreshCw size={15} strokeWidth={1.75} aria-hidden="true" />
						Actualizar
					</button>
				</div>
			</div>

			{!isOnline && (
				<div role="status" className="q-alert q-alert--info">
					<span className="q-alert__icon" aria-hidden="true">
						<CloudOff size={18} strokeWidth={1.75} />
					</span>
					<div className="q-alert__body">
						<p className="q-alert__title">Sin conexión</p>
						<p className="q-alert__text">
							Mostrando el último estado recibido. Los indicadores se
							actualizarán automáticamente al volver la señal.
						</p>
					</div>
				</div>
			)}

			{loading && !raw ? (
				<div className="q-card q-state q-state--loading rounded-[40px_16px_40px_16px]">
					<div className="q-state__glyph" aria-hidden="true">
						<span className="q-star q-star--think" />
					</div>
					<p className="q-state__title">Cargando indicadores del programa…</p>
					<p className="q-state__text">
						Consultando comunidad, datos abiertos y corredor en tiempo real.
					</p>
				</div>
			) : error && !raw ? (
				<div role="alert" className="q-card q-state q-state--error">
					<p className="q-state__title">No pudimos cargar los indicadores</p>
					<p className="q-state__text">{error}</p>
					<button
						type="button"
						onClick={() => void loadIndicators()}
						className="q-btn q-btn--secondary q-state__action min-h-11"
					>
						<RefreshCw size={16} strokeWidth={1.75} aria-hidden="true" />
						Reintentar
					</button>
				</div>
			) : (
				<div className="lc-cards grid gap-4 md:grid-cols-2 xl:grid-cols-3">
					{indicators.map((indicator, index) => {
						const Icon = DIMENSION_ICONS[indicator.dimension];
						return (
							<article
								key={indicator.dimension}
								className="q-card l-rise h-full overflow-hidden rounded-[28px_56px_28px_28px] transition-transform duration-200 hover:-translate-y-1"
							>
								<div
									className={`q-band q-band--${indicator.tone}`}
									aria-hidden="true"
								/>
								<div className="q-card__head">
									<div className="min-w-0">
										<p className="q-eyebrow flex items-center gap-1.5">
											<Icon size={14} strokeWidth={1.75} aria-hidden="true" />
											{indicator.dimensionLabel}
										</p>
										<h3 className="q-h3 mt-1">{indicator.title}</h3>
									</div>
									<span
										className={`q-badge ${badgeClassForTone(indicator.tone)}`}
									>
										{indicator.stateLabel}
									</span>
								</div>

								<div className="q-card__body flex-1 justify-between space-y-4">
									<div className="space-y-3">
										<div className="flex flex-wrap items-baseline justify-between gap-2">
											<span className="q-num text-3xl font-bold text-[var(--ink)]">
												{indicator.currentDisplay}
											</span>
											<span className="q-sm q-muted">
												{indicator.targetDisplay}
											</span>
										</div>

										<div className={`q-meter q-meter--${indicator.tone}`}>
											<meter
												className="q-sr"
												min={0}
												max={100}
												value={indicator.progressPercent}
												aria-label={`Avance en ${indicator.dimensionLabel}: ${indicator.progressPercent} %`}
											>
												{indicator.progressPercent}% {indicator.stateLabel}
											</meter>
											<div className="q-meter__head">
												<span className="q-meter__state font-semibold">
													Avance hacia la meta
												</span>
												<b>{indicator.progressPercent} %</b>
											</div>
											<div className="q-meter__track" aria-hidden="true">
												<div
													className="q-meter__fill"
													style={{ width: `${indicator.progressPercent}%` }}
												/>
											</div>
										</div>

										{indicator.communityFacts.length > 0 && (
											<div className="rounded-[24px_24px_24px_6px] bg-[var(--green-soft)] p-4 space-y-1.5">
												<p className="q-eyebrow text-[var(--green-text)]">
													Comunidad · datos reales
												</p>
												<dl className="m-0 space-y-1 text-xs">
													{indicator.communityFacts.map((fact) => (
														<div
															key={fact.label}
															className="flex items-baseline justify-between gap-2"
														>
															<dt className="text-[var(--ink-muted)]">
																{fact.label}
															</dt>
															<dd className="q-num m-0 font-semibold text-[var(--ink)]">
																{fact.value}
															</dd>
														</div>
													))}
												</dl>
											</div>
										)}

										{indicator.referenceFacts.length > 0 && (
											<div className="rounded-[24px_6px_24px_24px] bg-[var(--bg)] p-4 space-y-1.5">
												<p className="q-eyebrow">
													Corredor · datos de referencia
												</p>
												<dl className="m-0 space-y-1 text-xs">
													{indicator.referenceFacts.map((fact) => (
														<div
															key={fact.label}
															className="flex items-baseline justify-between gap-2"
														>
															<dt className="text-[var(--ink-muted)]">
																{fact.label}
															</dt>
															<dd className="q-num m-0 font-semibold text-[var(--ink)]">
																{fact.value}
															</dd>
														</div>
													))}
												</dl>
											</div>
										)}
									</div>

									{indicator.actionHref && indicator.actionLabel && (
										<div className="pt-1">
											<a
												href={indicator.actionHref}
												className="q-btn q-btn--ghost q-btn--sm min-h-11 px-3"
											>
												{indicator.actionLabel}
												<ArrowUpRight
													size={15}
													strokeWidth={1.75}
													aria-hidden="true"
												/>
											</a>
										</div>
									)}
								</div>
							</article>
						);
					})}
				</div>
			)}
		</section>
	);
}
