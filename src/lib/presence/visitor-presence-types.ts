export type VisitorEntrySource = "qr" | "direct";

export type PresenceConnectionState = "loading" | "live" | "offline" | "error";

export interface VisitorPresenceSummary {
	connectedCount: number;
	qrCount: number;
}
