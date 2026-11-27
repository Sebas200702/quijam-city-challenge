import { useCallback, useEffect, useMemo, useState } from "react";
import {
	fetchCityDashboardSnapshot,
	getCurrentCitySession,
	isSupabaseConfigured,
	type RealtimeStatus,
	signInCityOperator,
	signOutCityOperator,
	subscribeCityDashboardRealtime,
	toggleFloodAlert,
	updateReportStatus,
} from "../lib/city-dashboard-service";
import type {
	CityDashboardSnapshot,
	CitySessionInfo,
	CorridorZone,
	FloodZone,
	ReportStatus,
} from "../lib/city-dashboard-types";
import {
	buildDimensionKpis,
	CITY_MODE_BADGES,
	countVerifiedOpenBusinesses,
	formatFreshnessLabel,
	formatLastDataLabel,
	getConnectionView,
	summarizeReportsByStatus,
} from "../lib/city-dashboard-utils";
import { useCityState } from "../lib/city-events/use-city-state";
import { CORRIDOR_SEED } from "../lib/corridor/corridor-seed";
import { subscribeVisitorPresence } from "../lib/presence/visitor-presence-service";
import type {
	PresenceConnectionState,
	VisitorPresenceSummary,
} from "../lib/presence/visitor-presence-types";
import { ActiveDiversionCard } from "./city/sections/active-diversion-card";
import type { SectionLoadState } from "./city/sections/city-sections-types";
import { DiversionProposalCard } from "./city/sections/diversion-proposal-card";
import {
	type AppliedDiversion,
	buildDiversionProposal,
	proposalZone,
	toActiveDiversion,
} from "./city/sections/diversion-utils";
import {
	CityShellHeader,
	type ShellTheme,
} from "./city/shell/city-shell-header";
import { CommandCenter } from "./city/shell/command-center";
import { FloodAlertsSection } from "./city/shell/flood-alerts-section";
import { readShellDemoMode } from "./city/shell/shell-demo-mode";
import { ShellState } from "./city/shell/shell-state";
import { useOnlineStatus } from "./city/shell/use-online-status";
import { CityAuthGate } from "./city-auth-gate";
import { CrowdSimPanel } from "./crowd-sim-panel";
import { ImpactReportPanel } from "./impact-report-panel";
import { JuryQrPanel } from "./jury-qr-panel";
import { LiveIndicatorsPanel } from "./live-indicators-panel";
import { useFloodCountdown } from "./map/use-flood-countdown";
import { OverchargeInbox } from "./overcharge-inbox";
import MatchTimeline from "./timeline/match-timeline";

const EMPTY_PRESENCE: VisitorPresenceSummary = {
	connectedCount: 0,
	qrCount: 0,
};

const NO_FLOOD_ZONES: FloodZone[] = [];

const CLOCK = new Intl.DateTimeFormat("es-CO", {
	hour: "2-digit",
	minute: "2-digit",
	hour12: false,
});

/** Verified businesses come from the pilot catalogue; they do not change during a session. */
const VERIFIED_OPEN_BUSINESSES = countVerifiedOpenBusinesses(
	CORRIDOR_SEED.businesses,
);

/** Same key the layout's inline script reads, so the city keeps the theme it chose. */
const THEME_STORAGE_KEY = "quillart-theme";

export function CityDashboard() {
	// Dev-only preview with fixtures (/ciudad?demo); always null in production builds.
	const demo = useMemo(
		() =>
			import.meta.env.DEV ? readShellDemoMode(window.location.search) : null,
		[],
	);
	// Dark by default (the page asks for it), unless a saved choice already switched it.
	const [theme, setTheme] = useState<ShellTheme>(() =>
		document.documentElement.dataset.theme === "light" ? "light" : "dark",
	);
	const [session, setSession] = useState<CitySessionInfo | null>(null);
	const [authLoading, setAuthLoading] = useState(true);
	const [snapshot, setSnapshot] = useState<CityDashboardSnapshot | null>(null);
	const [realtimeStatus, setRealtimeStatus] =
		useState<RealtimeStatus>("connecting");
	const [presence, setPresence] =
		useState<VisitorPresenceSummary>(EMPTY_PRESENCE);
	const [presenceState, setPresenceState] =
		useState<PresenceConnectionState>("loading");
	const [nowMs, setNowMs] = useState(() => Date.now());
	const [loadError, setLoadError] = useState<string | null>(null);
	const [actionError, setActionError] = useState<string | null>(null);
	const [busyId, setBusyId] = useState<string | null>(null);
	const online = useOnlineStatus();
	const { state: cityEventsState, lastEvent: lastCityEvent } = useCityState();
	const flood = useFloodCountdown(
		lastCityEvent,
		snapshot?.floodZones ?? NO_FLOOD_ZONES,
	);
	// The diversion lives on this screen: the city applies, pauses or reverts it here.
	const [applied, setApplied] = useState<AppliedDiversion | null>(null);
	const [justApplied, setJustApplied] = useState(false);
	const [pausedZones, setPausedZones] = useState<CorridorZone[]>([]);
	const [discardedProposal, setDiscardedProposal] = useState<string | null>(
		null,
	);

	const configured = demo !== null || isSupabaseConfigured();

	useEffect(() => {
		document.documentElement.dataset.theme = theme;
	}, [theme]);

	const changeTheme = (next: ShellTheme) => {
		try {
			localStorage.setItem(THEME_STORAGE_KEY, next);
		} catch {
			// Private mode or blocked storage: the theme still changes for this visit.
		}
		setTheme(next);
	};

	// The setup detail is for whoever deploys, not for the operator on screen.
	useEffect(() => {
		if (!configured)
			console.warn(
				"City dashboard: set PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env (see .env.example).",
			);
	}, [configured]);

	useEffect(() => {
		const timer = window.setInterval(() => setNowMs(Date.now()), 5000);
		return () => window.clearInterval(timer);
	}, []);

	const loadSnapshot = useCallback(async () => {
		try {
			const data = await fetchCityDashboardSnapshot();
			setSnapshot(data);
			setNowMs(Date.now());
			setLoadError(null);
		} catch (err) {
			setLoadError(
				err instanceof Error
					? err.message
					: "Error cargando datos del tablero.",
			);
		}
	}, []);

	useEffect(() => {
		if (demo) return;
		if (!configured) {
			setAuthLoading(false);
			return;
		}
		void getCurrentCitySession()
			.then((current) => setSession(current))
			.catch(() => setSession(null))
			.finally(() => setAuthLoading(false));
	}, [configured, demo]);

	useEffect(() => {
		// The DEV guard lets the production build drop the fixtures entirely.
		if (!import.meta.env.DEV || !demo) return;
		void import("./city/shell/shell-demo-data").then((fixtures) => {
			setSession(fixtures.DEMO_SESSION);
			setAuthLoading(false);
			if (demo === "error") {
				setLoadError("Demo: sin respuesta del servidor.");
			} else if (demo !== "loading") {
				setSnapshot(fixtures.buildDemoSnapshot(demo, Date.now()));
			}
			setRealtimeStatus(demo === "offline" ? "error" : "live");
		});
	}, [demo]);

	useEffect(() => {
		if (demo || !configured || session?.role !== "city") {
			return;
		}

		let unsubscribe: (() => void) | undefined;
		let unsubscribePresence: (() => void) | undefined;
		let active = true;

		void loadSnapshot();
		void subscribeCityDashboardRealtime(
			() => {
				if (active) {
					void loadSnapshot();
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

		void subscribeVisitorPresence(
			(nextPresence) => {
				if (active) {
					setPresence(nextPresence);
				}
			},
			(state) => {
				if (active) {
					setPresenceState(state);
				}
			},
		).then((cleanup) => {
			if (active) {
				unsubscribePresence = cleanup;
			} else {
				cleanup();
			}
		});

		return () => {
			active = false;
			unsubscribe?.();
			unsubscribePresence?.();
		};
	}, [configured, demo, session, loadSnapshot]);

	// A new overcharge report from a visitor refreshes the inbox right away.
	useEffect(() => {
		if (
			demo ||
			!configured ||
			session?.role !== "city" ||
			lastCityEvent?.type !== "cobro_abusivo"
		) {
			return;
		}
		void loadSnapshot();
	}, [configured, demo, session, lastCityEvent, loadSnapshot]);

	async function handleSignIn(email: string, password: string) {
		const nextSession = await signInCityOperator(email, password);
		setSession(nextSession);
	}

	async function handleSignOut() {
		await signOutCityOperator();
		setSession(null);
		setSnapshot(null);
	}

	async function handleStatusChange(reportId: string, status: ReportStatus) {
		setBusyId(reportId);
		try {
			await updateReportStatus(reportId, status);
			await loadSnapshot();
		} catch (err) {
			setActionError(
				err instanceof Error ? err.message : "Error al actualizar.",
			);
		} finally {
			setBusyId(null);
		}
	}

	async function handleToggleFlood(floodZoneId: string, nextActive: boolean) {
		setBusyId(floodZoneId);
		try {
			await toggleFloodAlert(floodZoneId, nextActive);
			await loadSnapshot();
		} catch (err) {
			setActionError(
				err instanceof Error ? err.message : "Error al actualizar.",
			);
		} finally {
			setBusyId(null);
		}
	}

	const isCity = session?.role === "city";
	// Without any data yet, a failed read means we are still trying to connect.
	const connection =
		!snapshot && loadError
			? "connecting"
			: getConnectionView(realtimeStatus, online);
	const freshness = snapshot
		? connection === "offline"
			? formatLastDataLabel(snapshot.lastUpdatedAt, nowMs)
			: formatFreshnessLabel(snapshot.lastUpdatedAt, nowMs)
		: null;
	const zones = snapshot?.zones ?? [];
	const firstZone = zones[0];
	const sectionState: SectionLoadState = !snapshot
		? loadError
			? "error"
			: "loading"
		: connection === "offline"
			? "offline"
			: "ready";
	const proposal = snapshot
		? buildDiversionProposal({
				zones,
				floodZones: snapshot.floodZones,
				blockedFloodCodes: flood.blocked,
				hour: cityEventsState.hour,
				segments: CORRIDOR_SEED.segments,
				businesses: CORRIDOR_SEED.businesses,
				pausedZones,
			})
		: null;
	const pendingProposal =
		proposal && !applied && proposal.id !== discardedProposal ? proposal : null;
	const decisionSlot = applied ? (
		<ActiveDiversionCard
			diversion={toActiveDiversion(
				applied,
				zones,
				pausedZones.includes(applied.toZone),
			)}
			loadState={sectionState}
			justApplied={justApplied}
			onDismissApplied={() => setJustApplied(false)}
			onRevert={() => {
				setApplied(null);
				setJustApplied(false);
			}}
			onTogglePause={(_, paused) => {
				const zone = applied.toZone;
				setPausedZones((current) =>
					paused
						? [...new Set([...current, zone])]
						: current.filter((z) => z !== zone),
				);
			}}
			onRetry={() => void loadSnapshot()}
		/>
	) : (
		<DiversionProposalCard
			proposal={pendingProposal}
			loadState={sectionState}
			onApply={() => {
				if (!pendingProposal) return;
				const toZone = proposalZone(pendingProposal);
				setApplied({
					proposal: pendingProposal,
					toZone,
					toVisitorsAtStart:
						zones.find((count) => count.zone === toZone)?.active_visitors ?? 0,
					since: CLOCK.format(Date.now()),
				});
				setJustApplied(true);
			}}
			onDiscard={(id) => setDiscardedProposal(id)}
			onRetry={() => void loadSnapshot()}
		/>
	);

	const header = (
		<CityShellHeader
			theme={theme}
			onThemeChange={changeTheme}
			operator={
				isCity && session
					? { email: session.email, onSignOut: () => void handleSignOut() }
					: null
			}
			connection={connection}
			freshness={freshness}
			modeLabel={firstZone ? CITY_MODE_BADGES[firstZone.city_mode] : null}
		/>
	);

	if (!configured) {
		return (
			<>
				{header}
				<main className="cs-main" style={{ maxWidth: 720 }}>
					<ShellState
						kind="setup"
						title="El Centro de Mando no está disponible ahora"
						text="Falta configurar la conexión con los datos de la ciudad. Avisa al equipo técnico de QUILLART."
					/>
				</main>
			</>
		);
	}

	if (authLoading) {
		return (
			<>
				{header}
				<main className="cs-main" style={{ maxWidth: 720 }}>
					<ShellState
						kind="loading"
						title="Verificando tu sesión"
						text="Un momento: revisamos tu acceso de ciudad."
					/>
				</main>
			</>
		);
	}

	if (!isCity) {
		return (
			<>
				{header}
				<main className="mx-auto max-w-6xl px-4 pb-12">
					<CityAuthGate
						session={session}
						onSignIn={handleSignIn}
						onSignOut={handleSignOut}
					/>
				</main>
			</>
		);
	}

	const kpis = buildDimensionKpis({
		zones,
		reports: snapshot?.reports ?? [],
		floodZones: snapshot?.floodZones ?? [],
		connectedVisitors: presence.connectedCount,
		qrVisitors: presence.qrCount,
		verifiedOpenBusinesses: VERIFIED_OPEN_BUSINESSES,
	});

	return (
		<>
			{header}

			<main className="cs-main">
				<CommandCenter
					snapshot={snapshot}
					kpis={kpis}
					connection={connection}
					lastDataLabel={
						snapshot ? formatLastDataLabel(snapshot.lastUpdatedAt, nowMs) : null
					}
					loadError={loadError}
					actionError={actionError ?? (snapshot ? loadError : null)}
					onDismissActionError={() => {
						setActionError(null);
						setLoadError(null);
					}}
					onRetry={() => void loadSnapshot()}
					clockLabel={CLOCK.format(nowMs)}
					decisionSlot={decisionSlot}
					timelineSlot={<MatchTimeline variant="city" />}
				/>

				{snapshot && (
					<>
						<LiveIndicatorsPanel
							activeFloodZoneIds={cityEventsState.activeFloodZoneIds}
							lastCityEvent={lastCityEvent}
							nowMs={nowMs}
						/>
						<JuryQrPanel summary={presence} connectionState={presenceState} />
						{zones.length > 0 && (
							<CrowdSimPanel zones={zones} canWrite={!demo} />
						)}
						<FloodAlertsSection
							floodZones={snapshot.floodZones}
							countdowns={flood.countdowns}
							blockedFloodCodes={flood.blocked}
							nowMs={flood.now}
							rainSentAt={
								cityEventsState.floodAlertAt === null
									? undefined
									: CLOCK.format(cityEventsState.floodAlertAt)
							}
							loadState={sectionState}
							busyId={busyId}
							onToggle={(id, next) => void handleToggleFlood(id, next)}
							onRetry={() => void loadSnapshot()}
						/>
						<div id="cobros">
							<OverchargeInbox
								reports={snapshot.reports}
								summary={summarizeReportsByStatus(snapshot.reports)}
								isLoading={false}
								error={null}
								busyId={busyId}
								highlightedReportId={cityEventsState.lastOverchargeReportId}
								nowMs={nowMs}
								onStatusChange={handleStatusChange}
								onRetry={() => void loadSnapshot()}
							/>
						</div>
						<div id="informe">
							<ImpactReportPanel />
						</div>
					</>
				)}
			</main>
		</>
	);
}
