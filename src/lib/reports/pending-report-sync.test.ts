import { describe, expect, it } from "vitest";
import type { PendingOverchargeReport } from "./overcharge-report-types";
import {
	type PendingPostResult,
	sendPendingReports,
} from "./pending-report-sync";

const report = (charged: number): PendingOverchargeReport => ({
	segmentCode: "SEG-TEST",
	transportMode: "taxi",
	chargedFareCop: charged,
	driverQrCode: "",
	notes: "",
	queuedAt: "2034-06-01T12:00:00.000Z",
});

describe("sendPendingReports", () => {
	it("sends, drops rejected ones and keeps the ones the server cannot take", async () => {
		let stored = [report(1), report(2), report(3)];
		const answers: PendingPostResult[] = [
			{ kind: "saved", reportId: "r-1" },
			{ kind: "rejected" },
			{ kind: "unavailable" },
		];
		const saved: string[] = [];
		const remaining = await sendPendingReports({
			read: () => stored,
			write: (next) => {
				stored = next;
			},
			post: async () => answers.shift() ?? { kind: "unavailable" },
			onSaved: (id) => saved.push(id),
		});
		expect(remaining).toBe(1);
		expect(stored).toEqual([report(3)]);
		expect(saved).toEqual(["r-1"]);
	});

	it("does nothing when the queue is empty", async () => {
		let calls = 0;
		const remaining = await sendPendingReports({
			read: () => [],
			write: () => {},
			post: async () => {
				calls += 1;
				return { kind: "unavailable" };
			},
		});
		expect(remaining).toBe(0);
		expect(calls).toBe(0);
	});
});
