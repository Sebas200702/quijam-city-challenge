import { createClient } from "@supabase/supabase-js";
const sb = createClient(process.env.PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
for (const t of ["places","stops","events","event_registrations","event_waitlist","forum_threads","forum_posts","overcharge_reports","zone_visitor_counts","route_segments","profiles","content_reports","moderation_actions","businesses","flood_zones","passport_visits","user_profiles"]) {
  const { count, error } = await sb.from(t).select("*", { count: "exact", head: true });
  console.log(t, count, error?.message ?? "");
}
console.log(JSON.stringify((await sb.from("zone_visitor_counts").select("*")).data));
console.log(JSON.stringify((await sb.from("route_segments").select("id,name,transport_mode,reference_fare_cop,fare_min_cop,fare_max_cop,distance_km,is_simulated,origin_stop_id").limit(30)).data));
console.log(JSON.stringify((await sb.from("events").select("id,title,starts_at,capacity,registered_count,organizer_name,place_id").limit(10)).data));
console.log(JSON.stringify((await sb.from("forum_threads").select("*")).data));
console.log(JSON.stringify((await sb.from("places").select("slug,neighborhood,kind")).data?.map(p=>p.slug+":"+p.neighborhood)));
