export type VisitorEntrySource = "qr" | "direct";

export type PresenceConnectionState = "loading" | "live" | "offline" | "error";

export interface AnonymousVisitorPresence {
	sessionId: string;
	entry: VisitorEntrySource;
	joinedAt: string;
}

export interface VisitorPresenceSummary {
	connectedCount: number;
	qrCount: number;
	directCount: number;
	sessionIds: string[];
	lastChangeAt: string;
}
