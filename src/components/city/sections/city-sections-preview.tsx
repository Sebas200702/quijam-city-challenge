import { useState } from "react";
import type {
	OverchargeReport,
	ReportStatus,
} from "../../../lib/city-dashboard-types";
import { summarizeReportsByStatus } from "../../../lib/city-dashboard-utils";
import { OverchargeInbox } from "../../overcharge-inbox";
import { ActiveDiversionCard } from "./active-diversion-card";
import {
	SAMPLE_ACTIVE_DIVERSION,
	SAMPLE_ARROYOS,
	SAMPLE_HOSTS,
	SAMPLE_PROPOSAL,
	SAMPLE_ROUTES,
} from "./city-sections-sample";
import type { ActiveDiversion, SectionLoadState } from "./city-sections-types";
import { DiversionProposalCard } from "./diversion-proposal-card";
import { FloodResponseSection } from "./flood-response-section";

export type PreviewState = "normal" | "loading" | "empty" | "error" | "offline";

const LOAD_STATES: Record<PreviewState, SectionLoadState> = {
	normal: "ready",
	empty: "ready",
	loading: "loading",
	error: "error",
	offline: "offline",
};

function previewReport(
	id: string,
	route: string,
	charged: number,
	reference: number,
	status: ReportStatus,
	minutesAgo: number,
): OverchargeReport {
	const at = new Date(Date.now() - minutesAgo * 60_000).toISOString();
	return {
		id,
		segment_id: null,
		route_label: route,
		zone: "gran_malecon",
		transport_mode: "taxi",
		charged_fare_cop: charged,
		reference_fare_cop: reference,
		driver_qr_code: null,
		notes: null,
		status,
		is_simulated: false,
		created_at: at,
		updated_at: at,
	};
}

const PREVIEW_REPORTS: OverchargeReport[] = [
	previewReport(
		"0412a000-0000-4000-8000-000000000412",
		"Gran Malecón → Estadio Metropolitano",
		35000,
		24000,
		"open",
		1,
	),
	previewReport(
		"0397b000-0000-4000-8000-000000000397",
		"Gran Malecón → Centro",
		35000,
		12000,
		"in_review",
		40,
	),
];

/** Dev-only preview of the Centro de Mando sections with local state. */
export function CitySectionsPreview({ state }: { state: PreviewState }) {
	const loadState = LOAD_STATES[state];
	const empty = state === "empty";
	const [reports, setReports] = useState<OverchargeReport[]>(
		empty || state === "loading" || state === "error" ? [] : PREVIEW_REPORTS,
	);
	const [proposalOpen, setProposalOpen] = useState(!empty);
	const [diversion, setDiversion] = useState<ActiveDiversion | null>(
		empty ? null : SAMPLE_ACTIVE_DIVERSION,
	);
	const [justApplied, setJustApplied] = useState(false);

	return (
		<main className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-6 sm:px-6">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h1 className="q-h1">Secciones del Centro de Mando</h1>
				<span className="q-sim-tag">Datos de referencia</span>
			</div>

			<section aria-label="Caso 1: cobros" className="flex flex-col gap-3">
				<p className="q-eyebrow">c1-01 · Bandeja de cobros</p>
				<OverchargeInbox
					reports={reports}
					summary={summarizeReportsByStatus(reports)}
					isLoading={state === "loading"}
					error={state === "error" ? "No pudimos cargar los reportes." : null}
					busyId={null}
					highlightedReportId={PREVIEW_REPORTS[0].id}
					nowMs={Date.now()}
					onStatusChange={async (reportId, status) =>
						setReports((current) =>
							current.map((report) =>
								report.id === reportId ? { ...report, status } : report,
							),
						)
					}
					onRetry={() => {}}
				/>
			</section>

			<section
				aria-label="Caso 2: arroyo activo"
				className="flex flex-col gap-3"
			>
				<p className="q-eyebrow">c2-01 · Arroyo activo</p>
				<FloodResponseSection
					arroyos={empty ? [SAMPLE_ARROYOS[2]] : SAMPLE_ARROYOS}
					routes={SAMPLE_ROUTES}
					hosts={SAMPLE_HOSTS}
					loadState={loadState}
					staleLabel="hace 8 min"
					rainSentAt="17:18"
					recalculatedVisitors={38}
					freeHostsLabel="2 duplas libres en Troncal Murillo"
					onViewAssignment={() => {}}
					onRetry={() => {}}
				/>
			</section>

			<section
				aria-label="Caso 3: Decisor"
				className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-2"
			>
				<div className="flex flex-col gap-3">
					<p className="q-eyebrow">c3-01 · Decisión de desvío</p>
					<DiversionProposalCard
						proposal={proposalOpen ? SAMPLE_PROPOSAL : null}
						loadState={loadState}
						onApply={() => {
							setProposalOpen(false);
							setDiversion(SAMPLE_ACTIVE_DIVERSION);
							setJustApplied(true);
						}}
						onDiscard={() => setProposalOpen(false)}
						onRetry={() => {}}
					/>
				</div>
				<div className="flex flex-col gap-3">
					<p className="q-eyebrow">c3-02 · Desvío activo</p>
					<ActiveDiversionCard
						diversion={diversion}
						loadState={loadState}
						justApplied={justApplied}
						onDismissApplied={() => setJustApplied(false)}
						onRevert={() => {
							setDiversion(null);
							setJustApplied(false);
						}}
						onTogglePause={(_, paused) =>
							setDiversion((current) =>
								current ? { ...current, committeePaused: paused } : current,
							)
						}
						onRetry={() => {}}
					/>
				</div>
			</section>
		</main>
	);
}
