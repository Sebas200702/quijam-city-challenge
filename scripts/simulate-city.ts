// City simulation for the QUILLART demo (docs/32-simulacion.md).
//
//   bun scripts/simulate-city.ts --seed                      create synthetic users and content
//   bun scripts/simulate-city.ts --tick                      one step of activity (15 simulated minutes)
//   bun scripts/simulate-city.ts --run --minutes 2 --speed 360
//                                                            keep generating activity; the simulated
//                                                            clock runs `speed` times faster than real time
//   bun scripts/simulate-city.ts --status                    counts, real vs synthetic
//   bun scripts/simulate-city.ts --reset                     delete ALL synthetic data, keep real data
//   options: --seed-value N (default 2026), --interval S (seconds between run ticks, default 5)
//   --dry-run with any command prints the plan and never connects to the database
//
// Honesty rules: real places and the five real events are never modified. Every synthetic
// record is listed in supabase/sim/manifest.json; synthetic accounts use @sim.quillart.test,
// carry user_metadata.synthetic = true and show "(simulado)" in their public name, so the
// reset also works without the manifest. Uses the service role: run it server side only.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import {
	createClient,
	type RealtimeChannel,
	type SupabaseClient,
} from "@supabase/supabase-js";
import {
	type Author,
	type PublishRequest,
	publishContent,
} from "../src/lib/community/community-server";
import { VISITOR_PRESENCE_CHANNEL } from "../src/lib/presence/visitor-presence-utils";
import {
	PROJECTED_EVENTS,
	PROJECTION_ORGANIZER,
	projectedDescription,
	validateProjectedEvents,
} from "./sim/projected-events";
import {
	BARRIOS,
	COMMUNITY_ACTIVITIES,
	FIRST_NAMES,
	FRESH_INDEXES,
	GENERIC_REPLIES,
	LAST_INITIALS,
	MODERATION_REPLIES,
	MODERATION_SAMPLES,
	ORGANIZER_INDEXES,
	OVERCHARGE_NOTES,
	type Rng,
	rng,
	SIM_EMAIL_DOMAIN,
	SIM_NAME_SUFFIX,
	SIM_USER_COUNT,
	THREAD_TEMPLATES,
	VISITOR_INDEXES,
	VISITOR_ORIGINS,
} from "./sim/sim-data";
import {
	emptyManifest as blankManifest,
	buildResetPlan,
	describeResetPlan,
	describeRunPlan,
	type Manifest,
	parseCli,
	parseManifest,
} from "./sim/sim-plan";

// Service-role client, loaded only for real runs: --dry-run never imports sim-env.
let admin: typeof import("./sim/sim-env")["admin"];

// ── CLI ──────────────────────────────────────────────────────────────────
const cli = parseCli(process.argv.slice(2));
const SEED = cli.seedValue;

// ── Manifest ─────────────────────────────────────────────────────────────
const MANIFEST_PATH = "supabase/sim/manifest.json";
const emptyManifest = () => blankManifest(SEED);
function loadManifest(): Manifest {
	if (!existsSync(MANIFEST_PATH)) return emptyManifest();
	return parseManifest(readFileSync(MANIFEST_PATH, "utf8"), SEED);
}
function saveManifest(m: Manifest) {
	mkdirSync("supabase/sim", { recursive: true });
	m.updatedAt = new Date().toISOString();
	writeFileSync(MANIFEST_PATH, `${JSON.stringify(m, null, "\t")}\n`);
}
const addId = (list: string[], id: string | undefined | null) => {
	if (id && !list.includes(id)) list.push(id);
};

// ── Helpers ──────────────────────────────────────────────────────────────
const must = <T>(
	r: { data: T; error: { message: string } | null },
	what: string,
): T => {
	if (r.error) throw new Error(`${what}: ${r.error.message}`);
	return r.data;
};
const bogota = (local: string) => `${local}:00-05:00`;
const bogotaHour = (d: Date) =>
	((d.getUTCHours() + 19) % 24) + d.getUTCMinutes() / 60;
const bogotaDay = (d: Date) =>
	new Date(d.getTime() - 5 * 3_600_000).getUTCDay();
const slugify = (s: string) =>
	s
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "");

async function listSimUsers() {
	const out: { id: string; email: string; created_at: string }[] = [];
	for (let page = 1; ; page++) {
		const { data, error } = await admin.auth.admin.listUsers({
			page,
			perPage: 200,
		});
		if (error) throw error;
		for (const u of data.users)
			if (u.email?.endsWith(`@${SIM_EMAIL_DOMAIN}`))
				out.push({ id: u.id, email: u.email, created_at: u.created_at });
		if (data.users.length < 200) break;
	}
	return out;
}

interface SimUser {
	id: string;
	index: number;
	name: string;
	author: Author;
}
async function loadAuthors(m: Manifest): Promise<SimUser[]> {
	const ids = m.users.map((u) => u.id);
	if (!ids.length) return [];
	const profiles = must(
		await admin
			.from("profiles")
			.select("id, display_name, is_verified_organizer, created_at")
			.in("id", ids),
		"profiles",
	) as any[];
	const byId = new Map(profiles.map((p) => [p.id, p]));
	return m.users
		.filter((u) => byId.has(u.id))
		.map((u) => {
			const p = byId.get(u.id);
			return {
				id: u.id,
				index: u.index,
				name: p.display_name,
				author: {
					id: u.id,
					displayName: p.display_name,
					isVerifiedOrganizer: p.is_verified_organizer,
					createdAt: p.created_at,
				},
			};
		});
}

// ── Users ────────────────────────────────────────────────────────────────
async function ensureUsers(m: Manifest, r: Rng) {
	const existing = new Map((await listSimUsers()).map((u) => [u.email, u]));
	const barrios = [...BARRIOS];
	const specs = [];
	for (let i = 0; i < SIM_USER_COUNT; i++) {
		const first = FIRST_NAMES[i % FIRST_NAMES.length];
		const initial = r.pick(LAST_INITIALS);
		const isVisitor = VISITOR_INDEXES.includes(i);
		const neighborhood = isVisitor
			? VISITOR_ORIGINS[VISITOR_INDEXES.indexOf(i)]
			: barrios[(i * 7) % barrios.length];
		const ageDays = FRESH_INDEXES.includes(i) ? 0 : r.int(9, 150);
		specs.push({
			index: i,
			email: `u${String(i).padStart(2, "0")}.${slugify(first)}@${SIM_EMAIL_DOMAIN}`,
			name: `${first} ${initial}.${SIM_NAME_SUFFIX}`,
			neighborhood,
			isVisitor,
			organizer: ORGANIZER_INDEXES.includes(i),
			ageDays,
		});
	}
	specs.push({
		index: 99,
		email: `agenda-proyectada@${SIM_EMAIL_DOMAIN}`,
		name: PROJECTION_ORGANIZER,
		neighborhood: "Área Metropolitana de Barranquilla",
		isVisitor: false,
		organizer: false,
		ageDays: 30,
	});
	for (const s of specs) {
		let id = existing.get(s.email)?.id;
		if (!id) {
			const { data, error } = await admin.auth.admin.createUser({
				email: s.email,
				password: `${crypto.randomUUID()}${crypto.randomUUID()}`,
				email_confirm: true,
				user_metadata: {
					display_name: s.name,
					neighborhood: s.neighborhood,
					is_visitor: s.isVisitor,
					synthetic: true,
				},
			});
			if (error) throw new Error(`createUser ${s.email}: ${error.message}`);
			id = data.user.id;
		}
		const createdAt = new Date(
			Date.now() - s.ageDays * 86_400_000 - r.int(0, 20) * 3_600_000,
		).toISOString();
		must(
			await admin.from("profiles").upsert(
				{
					id,
					display_name: s.name,
					neighborhood: s.neighborhood,
					is_visitor: s.isVisitor,
					is_verified_organizer: s.organizer,
					created_at: createdAt,
				},
				{ onConflict: "id" },
			),
			`profile ${s.email}`,
		);
		if (!m.users.some((u) => u.id === id))
			m.users.push({ id, email: s.email, name: s.name, index: s.index });
	}
	saveManifest(m);
	console.log(
		`users: ${m.users.length} synthetic accounts (${ORGANIZER_INDEXES.length} verified organizers)`,
	);
}

// ── Places, zones and events ─────────────────────────────────────────────
type Zone =
	| "estadio"
	| "troncal_murillo"
	| "centro"
	| "barrio_abajo"
	| "gran_malecon";
interface PlaceRow {
	id: string;
	slug: string;
	latitude: number;
	longitude: number;
}
async function loadPlaces() {
	const places = must(
		await admin.from("places").select("id, slug, latitude, longitude"),
		"places",
	) as PlaceRow[];
	const stops = must(
		await admin.from("stops").select("zone, latitude, longitude"),
		"stops",
	) as any[];
	const zoneOf = new Map<string, Zone | null>();
	for (const p of places) {
		let best = { d: Number.POSITIVE_INFINITY, zone: null as Zone | null };
		for (const s of stops) {
			const dy = (s.latitude - p.latitude) * 111;
			const dx = (s.longitude - p.longitude) * 109;
			const d = Math.hypot(dx, dy);
			if (d < best.d) best = { d, zone: s.zone };
		}
		zoneOf.set(p.id, best.d <= 2.5 ? best.zone : null);
	}
	return { bySlug: new Map(places.map((p) => [p.slug, p])), zoneOf };
}

async function seedProjectedEvents(
	m: Manifest,
	users: SimUser[],
	places: Awaited<ReturnType<typeof loadPlaces>>,
) {
	const org = users.find((u) => u.index === 99);
	if (!org) throw new Error("projection organizer missing");
	let n = 0;
	for (const e of PROJECTED_EVENTS) {
		const place = e.place ? places.bySlug.get(e.place) : undefined;
		const row = {
			title: e.title,
			description: projectedDescription(e),
			category: e.category,
			starts_at: bogota(e.startsAt),
			ends_at: e.endsAt ? bogota(e.endsAt) : null,
			place_id: place?.id ?? null,
			location_text: e.locationText ?? null,
			capacity: e.capacity ?? null,
			is_free: e.isFree,
			price_cop: e.isFree ? null : (e.priceCop ?? null),
			organizer_id: org.id,
			organizer_name: org.name,
			organizer_verified: false,
			status: "published",
			moderation_status: "published",
			moderation_labels: ["ok"],
			moderation_source: "rules",
			triage_priority: "none",
		};
		const found = must(
			await admin
				.from("events")
				.select("id")
				.eq("organizer_id", org.id)
				.eq("title", e.title),
			"events read",
		) as any[];
		const id =
			found[0]?.id ??
			(
				must(
					await admin.from("events").insert(row).select("id").single(),
					`projected ${e.title}`,
				) as any
			).id;
		addId(m.events, id);
		n++;
	}
	saveManifest(m);
	console.log(`projected events: ${n}`);
}

async function publishAs(user: SimUser, request: PublishRequest) {
	const result = await publishContent(admin, user.author, request, null);
	return result;
}

async function seedCommunityEvents(
	m: Manifest,
	users: SimUser[],
	places: Awaited<ReturnType<typeof loadPlaces>>,
) {
	const outcomes: Record<string, number> = {};
	for (const a of COMMUNITY_ACTIVITIES) {
		const user = users.find((u) => u.index === a.organizer);
		const place = places.bySlug.get(a.place);
		if (!user || !place) {
			console.warn(`skip ${a.key}: ${!user ? "organizer" : "place"} missing`);
			continue;
		}
		for (const date of a.dates) {
			const startsAt = new Date(bogota(date)).toISOString();
			const found = must(
				await admin
					.from("events")
					.select("id")
					.eq("organizer_id", user.id)
					.eq("title", a.title)
					.eq("starts_at", startsAt),
				"events read",
			) as any[];
			if (found.length) {
				addId(m.events, found[0].id);
				continue;
			}
			const endsAt = new Date(
				new Date(startsAt).getTime() + a.hours * 3_600_000,
			).toISOString();
			const res = await publishAs(user, {
				kind: "event",
				input: {
					title: a.title,
					description: a.description,
					category: a.category,
					startsAt,
					endsAt,
					placeId: place.id,
					locationText: null,
					capacity: a.capacity,
					isFree: !a.priceCop,
					priceCop: a.priceCop ?? null,
				},
			});
			outcomes[res.outcome] = (outcomes[res.outcome] ?? 0) + 1;
			addId(m.events, (res.record as any)?.id);
		}
	}
	saveManifest(m);
	console.log("community events:", outcomes);
}

async function seedForum(
	m: Manifest,
	users: SimUser[],
	places: Awaited<ReturnType<typeof loadPlaces>>,
	r: Rng,
	count: number,
) {
	const used = new Set(
		(
			must(
				await admin
					.from("forum_threads")
					.select("title")
					.in(
						"id",
						m.threads.length
							? m.threads
							: ["00000000-0000-0000-0000-000000000000"],
					),
				"threads",
			) as any[]
		).map((t) => t.title),
	);
	const todo = THREAD_TEMPLATES.filter((t) => !used.has(t.title)).slice(
		0,
		count,
	);
	const outcomes: Record<string, number> = {};
	for (const t of todo) {
		const author = r.pick(users.filter((u) => u.index !== 99));
		const res = await publishAs(author, {
			kind: "thread",
			input: {
				title: t.title,
				body: t.body,
				category: t.category,
				placeId: t.place ? (places.bySlug.get(t.place)?.id ?? null) : null,
				eventId: null,
			},
		});
		outcomes[res.outcome] = (outcomes[res.outcome] ?? 0) + 1;
		const id = (res.record as any)?.id;
		addId(m.threads, id);
		if (!id || res.outcome !== "published") continue;
		const backdate = Date.now() - r.int(2, 120) * 3_600_000;
		for (const [k, body] of t.replies
			.slice(0, r.int(1, t.replies.length))
			.entries()) {
			const replier = r.pick(
				users.filter((u) => u.index !== 99 && u.id !== author.id),
			);
			const rp = await publishAs(replier, { kind: "post", threadId: id, body });
			addId(m.posts, (rp.record as any)?.id);
			if ((rp.record as any)?.id)
				await admin
					.from("forum_posts")
					.update({
						created_at: new Date(
							backdate + (k + 1) * r.int(10, 90) * 60_000,
						).toISOString(),
					})
					.eq("id", (rp.record as any).id);
		}
		await admin
			.from("forum_threads")
			.update({ created_at: new Date(backdate).toISOString() })
			.eq("id", id);
	}
	saveManifest(m);
	console.log("forum threads:", outcomes);
}

// ── Registrations ────────────────────────────────────────────────────────
interface EventRow {
	id: string;
	title: string;
	capacity: number | null;
	registered_count: number;
	starts_at: string;
	category: string;
	place_id: string | null;
	organizer_id: string;
}
async function loadSimEvents(m: Manifest): Promise<EventRow[]> {
	if (!m.events.length) return [];
	return must(
		await admin
			.from("events")
			.select(
				"id, title, capacity, registered_count, starts_at, category, place_id, organizer_id",
			)
			.in("id", m.events)
			.eq("status", "published")
			.eq("moderation_status", "published")
			.gt("starts_at", new Date().toISOString()),
		"events",
	) as EventRow[];
}
const popularity = (e: EventRow) => {
	const tpl = COMMUNITY_ACTIVITIES.find((a) => a.title === e.title);
	const days = (new Date(e.starts_at).getTime() - Date.now()) / 86_400_000;
	const soon = days < 10 ? 1.6 : days < 30 ? 1.1 : 0.6; // people sign up closer to the date
	const fill = e.capacity ? e.registered_count / e.capacity : 0.2;
	return (tpl?.pop ?? 1.6) * soon * (1 - Math.min(fill, 1) * 0.5);
};

async function register(
	m: Manifest,
	users: SimUser[],
	r: Rng,
	attempts: number,
) {
	const events = await loadSimEvents(m);
	const regs = must(
		await admin
			.from("event_registrations")
			.select("event_id, user_id")
			.in(
				"user_id",
				users.map((u) => u.id),
			),
		"regs",
	) as any[];
	const taken = new Set(regs.map((x) => `${x.event_id}:${x.user_id}`));
	let ok = 0,
		waitlisted = 0;
	for (let i = 0; i < attempts; i++) {
		const e = r.weighted(events, popularity);
		if (!e) break;
		const candidates = users.filter(
			(u) =>
				u.index !== 99 &&
				u.id !== e.organizer_id &&
				!taken.has(`${e.id}:${u.id}`),
		);
		if (!candidates.length) continue;
		const u = r.pick(candidates);
		taken.add(`${e.id}:${u.id}`);
		if (e.capacity && e.registered_count >= e.capacity) {
			const { error } = await admin
				.from("event_waitlist")
				.insert({ event_id: e.id, user_id: u.id });
			if (!error) waitlisted++;
			continue;
		}
		const { error } = await admin
			.from("event_registrations")
			.insert({ event_id: e.id, user_id: u.id });
		if (!error) {
			ok++;
			e.registered_count++;
		}
	}
	return { ok, waitlisted };
}

// ── Crowds ───────────────────────────────────────────────────────────────
// Share of each zone's capacity_threshold occupied by hour (Bogotá), before the season
// factor. Shapes, not data: malecón peaks at night, centro at midday, the trunk line at
// commute hours. Scale anchors (docs/04): Carnaval 2026 had >820.000 visitors in four days
// and >90 % hotel occupancy, so carnival days push zones over their threshold (×1,35) and
// December evenings get a ×1,15 Christmas factor. Derived values are a simulation.
const ZONE_SHAPE: Record<
	Zone,
	{ base: number; peaks: [number, number, number][] }
> = {
	gran_malecon: {
		base: 0.12,
		peaks: [
			[19.5, 0.62, 2.5],
			[10, 0.15, 2],
		],
	},
	centro: {
		base: 0.08,
		peaks: [
			[11, 0.55, 2.5],
			[16.5, 0.35, 2],
		],
	},
	barrio_abajo: { base: 0.06, peaks: [[18.5, 0.45, 2.5]] },
	troncal_murillo: {
		base: 0.05,
		peaks: [
			[6.75, 0.6, 1.3],
			[17.75, 0.65, 1.6],
		],
	},
	estadio: { base: 0.03, peaks: [[17, 0.08, 3]] },
};
const CARNIVAL_2027 = { from: "2027-02-06", to: "2027-02-09" };
function seasonFactor(d: Date) {
	const day = new Date(d.getTime() - 5 * 3_600_000).toISOString().slice(0, 10);
	if (day >= CARNIVAL_2027.from && day <= CARNIVAL_2027.to) return 1.35;
	if (day >= "2026-12-01" && day <= "2027-01-06") return 1.15;
	return 1;
}
function activityCurve(h: number) {
	// how active people are online, 0.1 at night to 1 in the evening
	return Math.max(
		0.1,
		Math.min(
			1,
			0.15 +
				0.55 * Math.exp(-((h - 12) ** 2) / 18) +
				0.6 * Math.exp(-((h - 20) ** 2) / 8),
		),
	);
}

async function updateZones(
	m: Manifest,
	simNow: Date,
	r: Rng,
	places: Awaited<ReturnType<typeof loadPlaces>>,
) {
	const rows = must(
		await admin
			.from("zone_visitor_counts")
			.select("zone, active_visitors, capacity_threshold"),
		"zones",
	) as any[];
	if (!m.zoneBackup) {
		m.zoneBackup = Object.fromEntries(
			rows.map((z) => [z.zone, z.active_visitors]),
		);
		saveManifest(m);
	}
	// Events running now (real ones included: they only add crowd, nothing is written to them).
	const from = new Date(simNow.getTime() - 3 * 3_600_000).toISOString();
	const live = must(
		await admin
			.from("events")
			.select("place_id, starts_at, ends_at, capacity, organizer_name")
			.eq("status", "published")
			.eq("moderation_status", "published")
			.lte(
				"starts_at",
				new Date(simNow.getTime() + 2 * 3_600_000).toISOString(),
			)
			.gte("starts_at", from),
		"live events",
	) as any[];
	const h = bogotaHour(simNow);
	const weekend = [0, 6].includes(bogotaDay(simNow)) ? 1.15 : 1;
	const out: Record<string, number> = {};
	for (const z of rows) {
		const shape = ZONE_SHAPE[z.zone as Zone];
		let ratio =
			shape.base +
			shape.peaks.reduce(
				(s, [p, a, w]) => s + a * Math.exp(-((h - p) ** 2) / (2 * w * w)),
				0,
			);
		ratio *= seasonFactor(simNow) * weekend;
		for (const e of live) {
			if (!e.place_id || places.zoneOf.get(e.place_id) !== z.zone) continue;
			const big = !e.capacity || e.capacity > 1000;
			ratio += big
				? 0.45
				: Math.min(0.08, (e.capacity ?? 0) / z.capacity_threshold);
		}
		const value = Math.max(
			0,
			Math.round(z.capacity_threshold * ratio * (0.95 + r.next() * 0.1)),
		);
		out[z.zone] = value;
		must(
			await admin
				.from("zone_visitor_counts")
				.update({
					active_visitors: value,
					updated_at: new Date().toISOString(),
				})
				.eq("zone", z.zone),
			`zone ${z.zone}`,
		);
	}
	return out;
}

// ── Overcharge reports ───────────────────────────────────────────────────
async function overchargeReport(m: Manifest, r: Rng) {
	const segs = must(
		await admin
			.from("route_segments")
			.select(
				"id, code, reference_fare_cop, fare_max_cop, origin:stops!origin_stop_id(zone)",
			),
		"segments",
	) as any[];
	const seg = r.pick(segs.filter((s) => s.origin?.zone));
	if (!seg) return null;
	const ref = Math.max(seg.reference_fare_cop, 8000);
	const charged = Math.min(
		35000,
		Math.round(
			(Math.max(seg.fare_max_cop, ref) * (1.4 + r.next() * 1.4)) / 1000,
		) * 1000,
	);
	const { data, error } = await admin
		.from("overcharge_reports")
		.insert({
			segment_id: seg.id,
			zone: seg.origin.zone,
			transport_mode: r.chance(0.8) ? "taxi" : "informal",
			charged_fare_cop: charged,
			reference_fare_cop: seg.reference_fare_cop,
			notes: `[Simulado] ${r.pick(OVERCHARGE_NOTES)}`,
			status: "open",
			is_simulated: true,
		})
		.select("id")
		.single();
	if (error) throw new Error(`overcharge: ${error.message}`);
	addId(m.overchargeReports, data.id);
	return data.id;
}

// ── Tick ─────────────────────────────────────────────────────────────────
async function tick(
	m: Manifest,
	users: SimUser[],
	places: Awaited<ReturnType<typeof loadPlaces>>,
	simNow: Date,
	simMinutes: number,
) {
	const r = rng(m.seed * 100_003 + m.ticks);
	m.ticks++;
	const h = bogotaHour(simNow);
	const a = activityCurve(h);
	const perHour = (rate: number) => (rate * a * simMinutes) / 60;
	const times = (rate: number) => {
		const x = perHour(rate);
		return Math.floor(x) + (r.chance(x - Math.floor(x)) ? 1 : 0);
	};
	const log: string[] = [];
	const zones = await updateZones(m, simNow, r, places);
	log.push(
		`zones ${Object.entries(zones)
			.map(([k, v]) => `${k}=${v}`)
			.join(" ")}`,
	);

	const regAttempts = times(8);
	if (regAttempts) {
		const res = await register(m, users, r, regAttempts);
		log.push(`registrations +${res.ok} waitlist +${res.waitlisted}`);
	}
	const people = users.filter((u) => u.index !== 99);
	for (let i = times(4); i > 0; i--) {
		// Replies go only to synthetic threads: real conversations are never touched.
		if (!m.threads.length) break;
		const threads = must(
			await admin
				.from("forum_threads")
				.select("id, category")
				.in("id", m.threads)
				.eq("moderation_status", "published")
				.order("last_activity_at", { ascending: false })
				.limit(12),
			"threads",
		) as any[];
		const t = r.pick(threads);
		if (!t) break;
		const tpl = THREAD_TEMPLATES.find((x) => x.category === t.category);
		const body =
			r.chance(0.5) && tpl ? r.pick(tpl.replies) : r.pick(GENERIC_REPLIES);
		const res = await publishAs(r.pick(people), {
			kind: "post",
			threadId: t.id,
			body,
		});
		addId(m.posts, (res.record as any)?.id);
		log.push(`reply ${res.outcome}`);
	}
	if (r.chance(Math.min(1, perHour(0.5)))) {
		await seedForum(m, users, places, r, 1);
		log.push("new thread");
	}
	if (r.chance(Math.min(1, perHour(0.25)))) {
		const s = r.pick(MODERATION_SAMPLES);
		const res = await publishAs(r.pick(people), {
			kind: "thread",
			input: {
				title: s.title,
				body: s.body,
				category: s.category,
				placeId: null,
				eventId: null,
			},
		});
		addId(m.threads, (res.record as any)?.id);
		log.push(
			`moderation sample "${s.title.slice(0, 30)}…" → ${res.outcome}/${res.priority}`,
		);
	}
	if (r.chance(Math.min(1, perHour(0.1)))) {
		const threads = must(
			await admin
				.from("forum_threads")
				.select("id")
				.in("id", m.threads)
				.eq("moderation_status", "published")
				.limit(10),
			"threads",
		) as any[];
		const t = r.pick(threads);
		if (t) {
			const res = await publishAs(r.pick(people), {
				kind: "post",
				threadId: t.id,
				body: r.pick(MODERATION_REPLIES),
			});
			addId(m.posts, (res.record as any)?.id);
			log.push(`moderation reply → ${res.outcome}`);
		}
	}
	const night = h >= 20 || h < 2 ? 2 : 1;
	if (r.chance(Math.min(1, perHour(0.6 * night)))) {
		await overchargeReport(m, r);
		log.push("overcharge report");
	}
	saveManifest(m);
	const hh = Math.floor(h),
		mm = Math.round((h - hh) * 60);
	console.log(
		`[tick ${m.ticks}] sim ${simNow.toISOString().slice(0, 10)} ${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")} Bogotá · ${log.join(" · ")}`,
	);
}

// ── Presence ─────────────────────────────────────────────────────────────
// Anonymous presence sessions in the same channel the app uses, tagged simulated: true.
const presence: {
	client: { removeChannel: (channel: RealtimeChannel) => Promise<unknown> };
	channel: RealtimeChannel;
}[] = [];
async function setPresence(target: number, r: Rng) {
	const key = process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;
	if (!key) return;
	while (presence.length < target) {
		const client = createClient(process.env.PUBLIC_SUPABASE_URL!, key, {
			auth: { persistSession: false },
		});
		const id = `vis_sim${Math.floor(r.next() * 1e10)
			.toString(16)
			.padStart(9, "0")}`;
		const channel = client.channel(VISITOR_PRESENCE_CHANNEL, {
			config: { presence: { key: id } },
		});
		const entry = r.chance(0.3) ? "qr" : "direct";
		channel.subscribe((status) => {
			if (status === "SUBSCRIBED")
				void channel.track({
					entry,
					joined_at: new Date().toISOString(),
					simulated: true,
				});
		});
		presence.push({ client, channel });
	}
	while (presence.length > target) {
		const p = presence.pop();
		if (p) {
			await p.channel.untrack().catch(() => {});
			await p.client.removeChannel(p.channel);
		}
	}
}

// ── Status / reset ───────────────────────────────────────────────────────
async function status(m: Manifest) {
	const simIds = m.users.map((u) => u.id);
	const nil = ["00000000-0000-0000-0000-000000000000"];
	const count = async (t: string, f?: (q: any) => any) => {
		let q = admin.from(t).select("*", { count: "exact", head: true });
		if (f) q = f(q);
		const { count: c, error } = await q;
		if (error) throw new Error(`${t}: ${error.message}`);
		return c ?? 0;
	};
	const rows: [string, number, number][] = [];
	const split = async (t: string, col: string, ids: string[]) => {
		const all = await count(t);
		const sim = await count(t, (q: any) => q.in(col, ids.length ? ids : nil));
		rows.push([t, all - sim, sim]);
	};
	await split("profiles", "id", simIds);
	await split("events", "id", m.events);
	await split("event_registrations", "user_id", simIds);
	await split("event_waitlist", "user_id", simIds);
	await split("forum_threads", "author_id", simIds);
	await split("forum_posts", "author_id", simIds);
	await split("overcharge_reports", "id", m.overchargeReports);
	rows.push(["places (all real)", await count("places"), 0]);
	console.log(
		"table".padEnd(24),
		"real/other".padStart(10),
		"synthetic".padStart(10),
	);
	for (const [t, real, sim] of rows)
		console.log(
			t.padEnd(24),
			String(real).padStart(10),
			String(sim).padStart(10),
		);
	const held = await count("forum_threads", (q: any) =>
		q
			.in("author_id", simIds.length ? simIds : nil)
			.eq("moderation_status", "held"),
	);
	const heldPosts = await count("forum_posts", (q: any) =>
		q
			.in("author_id", simIds.length ? simIds : nil)
			.eq("moderation_status", "held"),
	);
	const heldEv = await count("events", (q: any) =>
		q
			.in("id", m.events.length ? m.events : nil)
			.eq("moderation_status", "held"),
	);
	const city = await count("forum_threads", (q: any) =>
		q
			.in("author_id", simIds.length ? simIds : nil)
			.neq("triage_priority", "none"),
	);
	console.log(
		`moderation queue (synthetic): held threads ${held}, held posts ${heldPosts}, held events ${heldEv}, city follow-up threads ${city}`,
	);
	console.log(
		JSON.stringify(
			must(
				await admin
					.from("zone_visitor_counts")
					.select(
						"zone, active_visitors, capacity_threshold, saturation_level",
					),
				"zones",
			),
		),
	);
}

async function reset(m: Manifest) {
	// Idempotent: the manifest is emptied only after every step succeeds, so a failed
	// reset can be run again; a clean database yields an empty plan.
	const plan = buildResetPlan(m, await listSimUsers());
	for (const line of describeResetPlan(plan)) console.log(line);
	if (plan.isEmpty) return saveManifest(emptyManifest());
	for (const step of plan.deletes) {
		for (let i = 0; i < step.ids.length; i += 100) {
			let q = admin
				.from(step.table)
				.delete()
				.in(step.column, step.ids.slice(i, i + 100));
			for (const [col, v] of Object.entries(step.where ?? {})) q = q.eq(col, v);
			const { error } = await q;
			if (error)
				throw new Error(`${step.table}.${step.column}: ${error.message}`);
		}
	}
	for (const [zone, v] of Object.entries(plan.restoreZones ?? {}))
		must(
			await admin
				.from("zone_visitor_counts")
				.update({ active_visitors: v })
				.eq("zone", zone),
			`zone ${zone}`,
		);
	for (const id of plan.userIds) {
		const { error } = await admin.auth.admin.deleteUser(id);
		if (error && !/not found/i.test(error.message))
			throw new Error(`deleteUser ${id}: ${error.message}`);
	}
	console.log(
		`reset: done; ${plan.userIds.length} synthetic accounts removed; zones restored: ${!!plan.restoreZones}`,
	);
	saveManifest(emptyManifest());
}

// ── Main ─────────────────────────────────────────────────────────────────
const m = loadManifest();
const projectedErrors = validateProjectedEvents(PROJECTED_EVENTS);
if (projectedErrors.length)
	throw new Error(`projected events:\n${projectedErrors.join("\n")}`);
const USAGE =
	"Usage: bun scripts/simulate-city.ts --seed | --tick | --run --minutes N --speed X | --status | --reset  [--dry-run]";

if (cli.command === "help") {
	if (cli.error) console.error(cli.error);
	console.log(USAGE);
	process.exit(cli.error ? 1 : 0);
}
if (cli.dryRun) {
	console.log(
		`DRY RUN (${cli.command}): no database access. Manifest: ${m.users.length} accounts, ${m.events.length} events, ${m.threads.length} threads, ${m.posts.length} posts, ${m.overchargeReports.length} overcharge reports.`,
	);
	if (cli.command === "reset")
		for (const line of describeResetPlan(buildResetPlan(m, [])))
			console.log(line);
	else if (cli.command === "run")
		for (const line of describeRunPlan(cli, m)) console.log(line);
	else if (cli.command === "seed")
		console.log(
			`seed plan: ${SIM_USER_COUNT + 1} accounts, ${PROJECTED_EVENTS.length} projected events, ${COMMUNITY_ACTIVITIES.reduce((n, a) => n + a.dates.length, 0)} community event dates, forum, registrations, 5 overcharge reports (only what is missing).`,
		);
	else
		console.log(
			`${cli.command}: reads or writes like one tick; nothing to plan offline.`,
		);
	if (cli.command === "reset")
		console.log(
			"  (accounts found only by e-mail domain are listed when run for real.)",
		);
	process.exit(0);
}
admin = (await import("./sim/sim-env")).admin;

if (cli.command === "reset") {
	await reset(m);
} else if (cli.command === "seed") {
	const r = rng(SEED);
	m.seed = SEED;
	await ensureUsers(m, r);
	const users = await loadAuthors(m);
	const places = await loadPlaces();
	await seedProjectedEvents(m, users, places);
	await seedCommunityEvents(m, users, places);
	// Seeding twice only tops up what is missing: forum, registrations and reports run once.
	const firstSeed = m.threads.length === 0;
	if (firstSeed) await seedForum(m, users, places, r, 9);
	const regs = await register(m, users, r, firstSeed ? 260 : 60);
	console.log(`registrations: +${regs.ok}, waitlist +${regs.waitlisted}`);
	if (m.overchargeReports.length === 0)
		for (let i = 0; i < 5; i++) await overchargeReport(m, r);
	await updateZones(m, new Date(), r, places);
	saveManifest(m);
	await status(m);
} else if (cli.command === "tick") {
	await tick(m, await loadAuthors(m), await loadPlaces(), new Date(), 15);
} else if (cli.command === "run") {
	const { minutes, speed, interval } = cli;
	const users = await loadAuthors(m);
	if (!users.length) throw new Error("Run --seed first.");
	const places = await loadPlaces();
	const start = Date.now();
	const r = rng(m.seed + 7);
	for (const line of describeRunPlan(cli, m)) console.log(line);
	try {
		while (Date.now() - start < minutes * 60_000) {
			const simNow = new Date(start + (Date.now() - start) * speed);
			await setPresence(Math.round(activityCurve(bogotaHour(simNow)) * 12), r);
			await tick(m, users, places, simNow, (interval * speed) / 60);
			await new Promise((res) => setTimeout(res, interval * 1000));
		}
	} finally {
		await setPresence(0, r);
	}
	await status(m);
	process.exit(0);
} else if (cli.command === "status") {
	await status(m);
}
