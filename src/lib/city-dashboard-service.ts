import type { SupabaseClient } from "@supabase/supabase-js";
import type {
	CityDashboardSnapshot,
	CitySessionInfo,
	FloodZone,
	OverchargeReport,
	ReportStatus,
	UserRole,
	ZoneVisitorCount,
} from "./city-dashboard-types";

export type RealtimeStatus = "connecting" | "live" | "error";

export function isSupabaseConfigured(): boolean {
	return Boolean(
		import.meta.env.PUBLIC_SUPABASE_URL &&
			import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY,
	);
}

async function getClient(): Promise<SupabaseClient> {
	const { supabase } = await import("./supabase");
	return supabase;
}

function normalizeRole(value: unknown): UserRole {
	if (value === "city" || value === "vendor" || value === "visitor") {
		return value;
	}
	return "visitor";
}

export async function getCurrentCitySession(): Promise<CitySessionInfo | null> {
	const supabase = await getClient();
	const {
		data: { user },
		error,
	} = await supabase.auth.getUser();

	if (error || !user) {
		return null;
	}

	const { data: roleData } = await supabase.rpc("current_user_role");
	const fallbackRole = user.app_metadata?.role;

	return {
		userId: user.id,
		email: user.email ?? "operador@ciudad",
		role: normalizeRole(roleData ?? fallbackRole),
	};
}

export async function signInCityOperator(
	email: string,
	password: string,
): Promise<CitySessionInfo> {
	const supabase = await getClient();
	const { error } = await supabase.auth.signInWithPassword({ email, password });

	if (error) {
		throw new Error(error.message);
	}

	const session = await getCurrentCitySession();
	if (!session) {
		throw new Error("No se pudo validar la sesión del usuario.");
	}

	return session;
}

export async function signOutCityOperator(): Promise<void> {
	const supabase = await getClient();
	await supabase.auth.signOut();
}

export async function fetchCityDashboardSnapshot(): Promise<CityDashboardSnapshot> {
	const supabase = await getClient();

	const [zonesRes, reportsRes, floodsRes] = await Promise.all([
		supabase
			.from("zone_visitor_counts")
			.select("*")
			.order("active_visitors", { ascending: false }),
		supabase
			.from("overcharge_reports")
			.select("*")
			.order("created_at", { ascending: false })
			.limit(50),
		supabase.from("flood_zones").select("*").order("name", { ascending: true }),
	]);

	if (zonesRes.error) {
		throw new Error(`Error cargando zonas: ${zonesRes.error.message}`);
	}
	if (reportsRes.error) {
		throw new Error(`Error cargando reportes: ${reportsRes.error.message}`);
	}
	if (floodsRes.error) {
		throw new Error(`Error cargando arroyos: ${floodsRes.error.message}`);
	}

	return {
		zones: (zonesRes.data ?? []) as ZoneVisitorCount[],
		reports: (reportsRes.data ?? []) as OverchargeReport[],
		floodZones: (floodsRes.data ?? []) as FloodZone[],
		lastUpdatedAt: new Date().toISOString(),
	};
}

export async function updateReportStatus(
	reportId: string,
	status: ReportStatus,
): Promise<void> {
	const supabase = await getClient();
	const { error } = await supabase
		.from("overcharge_reports")
		.update({ status })
		.eq("id", reportId);

	if (error) {
		throw new Error(`No se pudo actualizar el reporte: ${error.message}`);
	}
}

export async function toggleFloodAlert(
	floodZoneId: string,
	alertActive: boolean,
): Promise<void> {
	const supabase = await getClient();
	const { error } = await supabase
		.from("flood_zones")
		.update({ alert_active: alertActive })
		.eq("id", floodZoneId);

	if (error) {
		throw new Error(`No se pudo actualizar la alerta: ${error.message}`);
	}
}

export async function subscribeCityDashboardRealtime(
	onDataChange: () => void,
	onStatusChange: (status: RealtimeStatus) => void,
): Promise<() => void> {
	const supabase = await getClient();
	onStatusChange("connecting");

	const channel = supabase
		.channel("city-dashboard-realtime")
		.on(
			"postgres_changes",
			{ event: "*", schema: "public", table: "zone_visitor_counts" },
			onDataChange,
		)
		.on(
			"postgres_changes",
			{ event: "*", schema: "public", table: "overcharge_reports" },
			onDataChange,
		)
		.on(
			"postgres_changes",
			{ event: "*", schema: "public", table: "flood_zones" },
			onDataChange,
		)
		.subscribe((status) => {
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
