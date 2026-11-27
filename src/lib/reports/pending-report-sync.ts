// Sends the reports kept on the phone, oldest first. Used on load and when
// the connection comes back, so the visitor does not have to resend by hand.

import type { PendingOverchargeReport } from "./overcharge-report-types";
import { readPendingReports, writePendingReports } from "./overcharge-routes";

export type PendingPostResult =
	| { kind: "saved"; reportId: string | null }
	| { kind: "rejected" }
	| { kind: "unavailable" };

export type PostPendingReport = (
	report: PendingOverchargeReport,
) => Promise<PendingPostResult>;

const postPendingReport: PostPendingReport = async (report) => {
	try {
		const response = await fetch("/api/reports", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				segmentCode: report.segmentCode,
				transportMode: report.transportMode,
				chargedFareCop: report.chargedFareCop,
				driverQrCode: report.driverQrCode,
				notes: report.notes,
			}),
		});
		if (response.ok) {
			const body = (await response.json()) as { reportId?: string };
			return { kind: "saved", reportId: body.reportId ?? null };
		}
		return response.status >= 500
			? { kind: "unavailable" }
			: { kind: "rejected" };
	} catch {
		return { kind: "unavailable" };
	}
};

interface SyncOptions {
	/** Called with each report id the city now has (to publish cobro_abusivo). */
	onSaved?: (reportId: string) => void;
	post?: PostPendingReport;
	read?: () => PendingOverchargeReport[];
	write?: (reports: PendingOverchargeReport[]) => void;
}

let sending = false;

/**
 * Sends every waiting report. Keeps the ones the server cannot take yet and
 * drops the ones it rejects, since they would never pass. Returns how many
 * are still waiting.
 */
export async function sendPendingReports({
	onSaved,
	post = postPendingReport,
	read = readPendingReports,
	write = writePendingReports,
}: SyncOptions = {}): Promise<number> {
	const queued = read();
	if (sending || queued.length === 0) return queued.length;
	sending = true;
	try {
		const remaining: PendingOverchargeReport[] = [];
		for (const report of queued) {
			const result = await post(report);
			if (result.kind === "unavailable") remaining.push(report);
			else if (result.kind === "saved" && result.reportId)
				onSaved?.(result.reportId);
		}
		// Keep reports queued while we were sending.
		const added = read().slice(queued.length);
		write([...remaining, ...added]);
		return remaining.length + added.length;
	} finally {
		sending = false;
	}
}
