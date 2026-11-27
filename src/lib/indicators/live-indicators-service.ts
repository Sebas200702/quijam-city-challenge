import { INDICATOR_TARGETS } from "./live-indicators-calc";
import type {
	IndicatorsRealtimeStatus,
	LiveBusinessRow,
	LiveCommunityEventRow,
	LiveCommunityNoticeRow,
	LiveFloodZoneRow,
	LiveIndicatorsRawInput,
	LiveOverchargeRow,
	LivePlaceRow,
	LiveSegmentRow,
} from "./live-indicators-types";

const OPEN_DATA_PROBE_TIMEOUT_MS = 2500;

async function fetchPublishedOpenDatasetsCount(): Promise<number> {
	try {
		const controller = new AbortController();
		const timer = window.setTimeout(
			() => controller.abort(),
			OPEN_DATA_PROBE_TIMEOUT_MS,
		);
		try {
			const response = await fetch("/api/datos/", {
				signal: controller.signal,
			});
			if (response.ok) {
				const body = (await response.json()) as { totalDatasets?: unknown };
				if (
					typeof body.totalDatasets === "number" &&
					Number.isFinite(body.totalDatasets)
				) {
					return body.totalDatasets;
				}
			}
		} finally {
			window.clearTimeout(timer);
		}
	} catch {
		// Fall back to the published open-data catalog baseline when /api/datos/ is unavailable.
	}
	return INDICATOR_TARGETS.openDatasetsCount;
}

/**
 * Loads all tables required by the 5 program indicators.
 * Community tables are queried safely so missing migrations degrade to 0 instead of breaking the dashboard.
 */
export async function fetchLiveIndicatorsRaw(
	liveEventFloodCodes: readonly string[] = [],
): Promise<LiveIndicatorsRawInput> {
	const { supabase } = await import("../supabase");

	const [
		segmentsRes,
		floodsRes,
		placesRes,
		businessesRes,
		reportsRes,
		eventsRes,
		threadsRes,
		postsRes,
		openDatasetsCount,
		visitsRes,
	] = await Promise.all([
		supabase
			.from("route_segments")
			.select("is_accessible, is_green_route")
			.overrideTypes<LiveSegmentRow[], { merge: false }>(),
		supabase
			.from("flood_zones")
			.select("code, alert_active")
			.overrideTypes<LiveFloodZoneRow[], { merge: false }>(),
		supabase
			.from("places")
			.select("is_accessible")
			.overrideTypes<LivePlaceRow[], { merge: false }>(),
		supabase
			.from("businesses")
			.select("is_verified, is_open, zone")
			.overrideTypes<LiveBusinessRow[], { merge: false }>(),
		supabase
			.from("overcharge_reports")
			.select("status")
			.overrideTypes<LiveOverchargeRow[], { merge: false }>(),
		supabase
			.from("events")
			.select(
				"status, moderation_status, registered_count, triage_priority, city_resolved_at",
			)
			.overrideTypes<LiveCommunityEventRow[], { merge: false }>(),
		supabase
			.from("forum_threads")
			.select("moderation_status, triage_priority, city_resolved_at")
			.overrideTypes<LiveCommunityNoticeRow[], { merge: false }>(),
		supabase
			.from("forum_posts")
			.select("moderation_status, triage_priority, city_resolved_at")
			.overrideTypes<LiveCommunityNoticeRow[], { merge: false }>(),
		fetchPublishedOpenDatasetsCount(),
		supabase
			.from("passport_visits")
			.select("id", { count: "exact", head: true }),
	]);

	if (segmentsRes.error) {
		throw new Error(`Error cargando tramos: ${segmentsRes.error.message}`);
	}
	if (reportsRes.error) {
		throw new Error(`Error cargando reportes: ${reportsRes.error.message}`);
	}

	return {
		segments: segmentsRes.data ?? [],
		floodZones: floodsRes.error ? [] : (floodsRes.data ?? []),
		places: placesRes.error ? [] : (placesRes.data ?? []),
		businesses: businessesRes.error ? [] : (businessesRes.data ?? []),
		reports: reportsRes.data ?? [],
		events: eventsRes.error ? [] : (eventsRes.data ?? []),
		forumThreads: threadsRes.error ? [] : (threadsRes.data ?? []),
		forumPosts: postsRes.error ? [] : (postsRes.data ?? []),
		openDatasetsCount,
		passportVisitsCount: visitsRes.error ? 0 : (visitsRes.count ?? 0),
		liveEventFloodCodes,
	};
}

const REALTIME_INDICATOR_TABLES = [
	"events",
	"forum_threads",
	"forum_posts",
	"overcharge_reports",
	"flood_zones",
	"businesses",
	"route_segments",
	"places",
] as const;

/**
 * Subscribes to Supabase Realtime changes across both real community tables
 * (`events`, `forum_threads`, `forum_posts`) and corridor tables.
 */
export async function subscribeLiveIndicatorsRealtime(
	onDataChange: () => void,
	onStatusChange: (status: IndicatorsRealtimeStatus) => void,
): Promise<() => void> {
	const { supabase } = await import("../supabase");
	onStatusChange("connecting");

	let channel = supabase.channel("city-live-indicators-realtime");
	for (const table of REALTIME_INDICATOR_TABLES) {
		channel = channel.on(
			"postgres_changes",
			{ event: "*", schema: "public", table },
			onDataChange,
		);
	}

	channel.subscribe((status) => {
		if (status === "SUBSCRIBED") {
			onStatusChange("live");
		} else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
			onStatusChange("error");
		}
	});

	return () => {
		void supabase.removeChannel(channel);
	};
}
