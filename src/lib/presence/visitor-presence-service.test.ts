import { describe, expect, it, vi } from "vitest";
import {
	type PresenceChannelLike,
	type PresenceClientLike,
	subscribeVisitorPresence,
} from "./visitor-presence-service";
import type {
	PresenceConnectionState,
	VisitorPresenceSummary,
} from "./visitor-presence-types";

function createFakeRealtime() {
	let subscribeCb: ((status: string) => void) | null = null;
	const presenceHandlers = new Map<string, () => void>();
	let state: Record<string, unknown[]> = {};
	const removeChannel = vi.fn();

	const channel: PresenceChannelLike = {
		on(_type, filter, callback) {
			presenceHandlers.set(filter.event, callback);
			return channel;
		},
		subscribe(callback) {
			subscribeCb = callback;
			return channel;
		},
		presenceState() {
			return state;
		},
	};

	const client: PresenceClientLike = {
		channel: () => channel,
		removeChannel,
	};

	return {
		client,
		removeChannel,
		setState(next: Record<string, unknown[]>) {
			state = next;
		},
		emitStatus(status: string) {
			subscribeCb?.(status);
		},
		emitPresence(event: "sync" | "join" | "leave") {
			presenceHandlers.get(event)?.();
		},
	};
}

describe("subscribeVisitorPresence", () => {
	it("transitions through loading, live, offline, error, and ignores online while in error", async () => {
		const fake = createFakeRealtime();
		const states: PresenceConnectionState[] = [];
		const summaries: VisitorPresenceSummary[] = [];
		const windowListeners = new Map<string, () => void>();

		const cleanup = await subscribeVisitorPresence(
			(summary) => summaries.push(summary),
			(state) => states.push(state),
			{
				client: fake.client,
				isOnline: () => true,
				addWindowListener: (event, handler) => {
					windowListeners.set(event, handler);
				},
				removeWindowListener: (event) => {
					windowListeners.delete(event);
				},
			},
		);

		expect(states).toEqual(["loading"]);

		fake.setState({
			vis_001: [{ entry: "qr" }],
			vis_002: [{ entry: "direct" }],
		});
		fake.emitStatus("SUBSCRIBED");

		expect(states).toEqual(["loading", "live"]);
		expect(summaries.at(-1)).toEqual({ connectedCount: 2, qrCount: 1 });

		windowListeners.get("offline")?.();
		expect(states.at(-1)).toBe("offline");

		// Coming back online must NOT mark live before subscribe confirms SUBSCRIBED.
		windowListeners.get("online")?.();
		expect(states.at(-1)).toBe("loading");

		fake.emitStatus("CHANNEL_ERROR");
		expect(states.at(-1)).toBe("error");

		// Online event while in error must keep error state.
		windowListeners.get("online")?.();
		expect(states.at(-1)).toBe("error");

		cleanup();
		expect(fake.removeChannel).toHaveBeenCalledTimes(1);
		expect(windowListeners.size).toBe(0);
	});

	it("starts in offline state when the browser is offline", async () => {
		const fake = createFakeRealtime();
		const states: PresenceConnectionState[] = [];

		const cleanup = await subscribeVisitorPresence(
			() => {},
			(state) => states.push(state),
			{
				client: fake.client,
				isOnline: () => false,
				addWindowListener: () => {},
				removeWindowListener: () => {},
			},
		);

		expect(states).toEqual(["offline"]);
		cleanup();
	});
});
