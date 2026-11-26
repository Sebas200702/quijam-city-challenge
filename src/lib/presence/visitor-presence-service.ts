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
				session_id: sessionId,
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
 * The dashboard listener does not track itself as a visitor.
 */
export async function subscribeVisitorPresence(
	onUpdate: (summary: VisitorPresenceSummary) => void,
	onStateChange: (state: PresenceConnectionState) => void,
): Promise<() => void> {
	if (!isSupabaseConfigured()) {
		onStateChange("error");
		return () => {};
	}

	if (typeof navigator !== "undefined" && !navigator.onLine) {
		onStateChange("offline");
	} else {
		onStateChange("loading");
	}

	const supabase = await getClient();
	const channel = supabase.channel(VISITOR_PRESENCE_CHANNEL);

	const emitSummary = () => {
		const rawState = channel.presenceState() as Record<string, unknown[]>;
		onUpdate(summarizePresenceState(rawState));
	};

	channel
		.on("presence", { event: "sync" }, emitSummary)
		.on("presence", { event: "join" }, emitSummary)
		.on("presence", { event: "leave" }, emitSummary)
		.subscribe((status) => {
			if (status === "SUBSCRIBED") {
				onStateChange("live");
				emitSummary();
			} else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
				onStateChange("error");
			}
		});

	const handleOffline = () => onStateChange("offline");
	const handleOnline = () => onStateChange("live");

	if (typeof window !== "undefined") {
		window.addEventListener("offline", handleOffline);
		window.addEventListener("online", handleOnline);
	}

	return () => {
		if (typeof window !== "undefined") {
			window.removeEventListener("offline", handleOffline);
			window.removeEventListener("online", handleOnline);
		}
		void supabase.removeChannel(channel);
	};
}
