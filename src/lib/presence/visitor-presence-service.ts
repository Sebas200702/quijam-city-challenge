import type { SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "../city-dashboard-service";
import type {
	PresenceConnectionState,
	VisitorEntrySource,
	VisitorPresenceSummary,
} from "./visitor-presence-types";
import {
	getOrCreateAnonymousSessionId,
	summarizePresenceState,
	VISITOR_PRESENCE_CHANNEL,
} from "./visitor-presence-utils";

export interface PresenceChannelLike {
	on(
		type: "presence",
		filter: { event: "sync" | "join" | "leave" },
		callback: () => void,
	): PresenceChannelLike;
	subscribe(callback: (status: string) => void): PresenceChannelLike;
	presenceState(): Record<string, unknown[]>;
}

export interface PresenceClientLike {
	channel(name: string): PresenceChannelLike;
	removeChannel(channel: PresenceChannelLike): unknown;
}

export interface SubscribePresenceOptions {
	client?: PresenceClientLike;
	isOnline?: () => boolean;
	addWindowListener?: (
		event: "online" | "offline",
		handler: () => void,
	) => void;
	removeWindowListener?: (
		event: "online" | "offline",
		handler: () => void,
	) => void;
}

async function getClient(): Promise<SupabaseClient> {
	const { supabase } = await import("../supabase");
	return supabase;
}

/**
 * Joins the anonymous visitor presence channel without requiring authentication
 * or collecting any personal data.
 */
export async function trackVisitorPresence(
	entry: VisitorEntrySource,
): Promise<() => void> {
	if (!isSupabaseConfigured()) {
		return () => {};
	}

	const sessionId = getOrCreateAnonymousSessionId(
		typeof window !== "undefined" ? window.sessionStorage : undefined,
	);
	const supabase = await getClient();
	const channel = supabase.channel(VISITOR_PRESENCE_CHANNEL, {
		config: { presence: { key: sessionId } },
	});

	channel.subscribe((status) => {
		if (status === "SUBSCRIBED") {
			void channel.track({
				entry,
				joined_at: new Date().toISOString(),
			});
		}
	});

	return () => {
		void channel.untrack().catch(() => {});
		void supabase.removeChannel(channel);
	};
}

/**
 * Subscribes to live anonymous visitor counts for the city dashboard.
 * Only the Realtime subscribe callback marks the state as "live" so reconnecting
 * or errored channels are never misreported as live on browser online events.
 */
export async function subscribeVisitorPresence(
	onUpdate: (summary: VisitorPresenceSummary) => void,
	onStateChange: (state: PresenceConnectionState) => void,
	options: SubscribePresenceOptions = {},
): Promise<() => void> {
	if (!options.client && !isSupabaseConfigured()) {
		onStateChange("error");
		return () => {};
	}

	const checkOnline =
		options.isOnline ??
		(() => (typeof navigator !== "undefined" ? navigator.onLine : true));
	const addListener =
		options.addWindowListener ??
		((event, handler) => {
			if (typeof window !== "undefined") {
				window.addEventListener(event, handler);
			}
		});
	const removeListener =
		options.removeWindowListener ??
		((event, handler) => {
			if (typeof window !== "undefined") {
				window.removeEventListener(event, handler);
			}
		});

	let currentState: PresenceConnectionState = checkOnline()
		? "loading"
		: "offline";
	onStateChange(currentState);

	const setState = (next: PresenceConnectionState) => {
		currentState = next;
		onStateChange(next);
	};

	const client: PresenceClientLike =
		options.client ?? ((await getClient()) as unknown as PresenceClientLike);
	const channel = client.channel(VISITOR_PRESENCE_CHANNEL);

	const emitSummary = () => {
		const rawState = channel.presenceState();
		onUpdate(summarizePresenceState(rawState));
	};

	channel
		.on("presence", { event: "sync" }, emitSummary)
		.on("presence", { event: "join" }, emitSummary)
		.on("presence", { event: "leave" }, emitSummary)
		.subscribe((status) => {
			if (status === "SUBSCRIBED") {
				setState("live");
				emitSummary();
			} else if (
				status === "CHANNEL_ERROR" ||
				status === "TIMED_OUT" ||
				status === "CLOSED"
			) {
				setState("error");
			}
		});

	const handleOffline = () => setState("offline");
	const handleOnline = () => {
		// Never mark "live" until subscribe confirms SUBSCRIBED.
		if (currentState === "offline") {
			setState("loading");
		}
	};

	addListener("offline", handleOffline);
	addListener("online", handleOnline);

	return () => {
		removeListener("offline", handleOffline);
		removeListener("online", handleOnline);
		void client.removeChannel(channel);
	};
}
