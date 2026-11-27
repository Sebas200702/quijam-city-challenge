// Pure planning logic for scripts/simulate-city.ts (docs/32-simulacion.md): CLI parsing,
// manifest shape and the reset plan. No database access here, so it is unit tested and
// it is what --dry-run prints.

export const SIM_EMAIL_DOMAIN = "sim.quillart.test";

export interface ManifestUser {
	id: string;
	email: string;
	name: string;
	index: number;
}

export interface Manifest {
	note: string;
	seed: number;
	users: ManifestUser[];
	events: string[];
	threads: string[];
	posts: string[];
	overchargeReports: string[];
	zoneBackup: Record<string, number> | null;
	ticks: number;
	updatedAt: string;
}

export const emptyManifest = (seed: number): Manifest => ({
	note: "Synthetic data created by scripts/simulate-city.ts. `bun scripts/simulate-city.ts --reset` deletes every id listed here. See docs/32-simulacion.md.",
	seed,
	users: [],
	events: [],
	threads: [],
	posts: [],
	overchargeReports: [],
	zoneBackup: null,
	ticks: 0,
	updatedAt: new Date().toISOString(),
});

export function parseManifest(json: string, seed: number): Manifest {
	return { ...emptyManifest(seed), ...(JSON.parse(json) as Partial<Manifest>) };
}

/** True only for accounts in the synthetic domain (exact suffix, no look-alikes). */
export function isSimEmail(email: string | null | undefined): boolean {
	return (
		typeof email === "string" &&
		email.toLowerCase().endsWith(`@${SIM_EMAIL_DOMAIN}`)
	);
}

// ── CLI ──────────────────────────────────────────────────────────────────
export type Command = "seed" | "tick" | "run" | "status" | "reset" | "help";
const COMMANDS: Command[] = ["seed", "tick", "run", "status", "reset"];

export interface CliOptions {
	command: Command;
	dryRun: boolean;
	seedValue: number;
	minutes: number;
	speed: number;
	interval: number;
	error?: string;
}

export function parseCli(argv: string[]): CliOptions {
	const num = (name: string, fallback: number) => {
		const i = argv.indexOf(`--${name}`);
		const v = i >= 0 ? Number(argv[i + 1]) : Number.NaN;
		return Number.isFinite(v) ? v : fallback;
	};
	const given = COMMANDS.filter((c) => argv.includes(`--${c}`));
	const opts: CliOptions = {
		command: given.length === 1 ? given[0] : "help",
		dryRun: argv.includes("--dry-run"),
		seedValue: num("seed-value", 2026),
		minutes: num("minutes", 2),
		speed: num("speed", 60),
		interval: num("interval", 5),
	};
	if (given.length > 1)
		opts.error = `Use one command at a time (got ${given.map((c) => `--${c}`).join(" ")}).`;
	for (const name of ["minutes", "speed", "interval"] as const)
		if (!(opts[name] > 0)) {
			opts.error = `--${name} must be greater than 0.`;
			opts.command = "help";
		}
	return opts;
}

// ── Reset plan ───────────────────────────────────────────────────────────
export interface DeleteStep {
	table: string;
	column: string;
	ids: string[];
	/** Extra equality filters applied together with `column in ids`. */
	where?: Record<string, string | boolean>;
}

export interface ResetPlan {
	userIds: string[];
	/** Emails outside the synthetic domain that were refused. */
	rejectedUsers: string[];
	deletes: DeleteStep[];
	restoreZones: Record<string, number> | null;
	isEmpty: boolean;
}

/**
 * Everything --reset deletes, in order: content first, then accounts. Only ids the
 * manifest lists, plus content whose author is a synthetic account. Places, real events
 * and real accounts are never in the plan.
 */
export function buildResetPlan(
	m: Manifest,
	listedUsers: { id: string; email: string }[],
): ResetPlan {
	const rejectedUsers: string[] = [];
	const userIds: string[] = [];
	for (const u of [...m.users, ...listedUsers]) {
		if (!isSimEmail(u.email)) {
			rejectedUsers.push(u.email);
			continue;
		}
		if (!userIds.includes(u.id)) userIds.push(u.id);
	}
	const deletes: DeleteStep[] = [
		{ table: "forum_posts", column: "id", ids: m.posts },
		{ table: "forum_posts", column: "author_id", ids: userIds },
		{ table: "forum_threads", column: "id", ids: m.threads },
		{ table: "forum_threads", column: "author_id", ids: userIds },
		{ table: "event_waitlist", column: "user_id", ids: userIds },
		{ table: "event_registrations", column: "user_id", ids: userIds },
		{ table: "events", column: "id", ids: m.events },
		{ table: "events", column: "organizer_id", ids: userIds },
		{
			table: "overcharge_reports",
			column: "id",
			ids: m.overchargeReports,
			where: { is_simulated: true },
		},
		{ table: "content_reports", column: "reporter_id", ids: userIds },
	];
	const restoreZones = m.zoneBackup;
	const isEmpty =
		userIds.length === 0 &&
		deletes.every((s) => s.ids.length === 0) &&
		!restoreZones;
	return { userIds, rejectedUsers, deletes, restoreZones, isEmpty };
}

export function describeResetPlan(plan: ResetPlan): string[] {
	if (plan.isEmpty)
		return ["reset: nothing synthetic to delete (already clean)."];
	const lines = plan.deletes
		.filter((s) => s.ids.length)
		.map((s) => `  delete ${s.table}.${s.column}: ${s.ids.length}`);
	lines.push(`  delete accounts: ${plan.userIds.length}`);
	if (plan.restoreZones)
		lines.push(
			`  restore zone_visitor_counts: ${Object.keys(plan.restoreZones).join(", ")}`,
		);
	if (plan.rejectedUsers.length)
		lines.push(
			`  refused (not ${SIM_EMAIL_DOMAIN}): ${plan.rejectedUsers.join(", ")}`,
		);
	return ["reset plan:", ...lines];
}

// ── Run plan ─────────────────────────────────────────────────────────────
export function describeRunPlan(o: CliOptions, m: Manifest): string[] {
	const hours = (o.minutes * o.speed) / 60;
	const ticks = Math.floor((o.minutes * 60) / o.interval);
	const lines = [
		`run plan: ${o.minutes} min real time, speed x${o.speed} (${hours.toFixed(1)} h simulated), ${ticks} ticks every ${o.interval}s`,
		`  actors: ${m.users.length} synthetic accounts; targets: ${m.events.length} synthetic events, ${m.threads.length} synthetic threads`,
		"  per tick: zone crowd counts, registrations/waitlist on synthetic events, replies in synthetic threads,",
		"            new synthetic threads, moderation samples, overcharge reports (is_simulated), anonymous presence (simulated: true)",
	];
	if (!m.users.length)
		lines.push("  no synthetic accounts in the manifest: run --seed first.");
	return lines;
}
