import { describe, expect, it } from "vitest";
import {
	buildResetPlan,
	describeResetPlan,
	describeRunPlan,
	emptyManifest,
	isSimEmail,
	type Manifest,
	parseCli,
	parseManifest,
} from "./sim-plan";

const SIM_A = {
	id: "a",
	email: "u00.andrea@sim.quillart.test",
	name: "Andrea J. (simulado)",
	index: 0,
};
const SIM_B = {
	id: "b",
	email: "u01.camilo@sim.quillart.test",
	name: "Camilo N. (simulado)",
	index: 1,
};

function manifest(overrides: Partial<Manifest> = {}): Manifest {
	return {
		...emptyManifest(2026),
		users: [SIM_A],
		events: ["e1"],
		threads: ["t1"],
		posts: ["p1"],
		overchargeReports: ["o1"],
		...overrides,
	};
}

describe("parseCli", () => {
	it("reads one command, numeric options and --dry-run", () => {
		const o = parseCli([
			"--run",
			"--minutes",
			"3",
			"--speed",
			"120",
			"--interval",
			"10",
			"--dry-run",
		]);
		expect(o).toMatchObject({
			command: "run",
			dryRun: true,
			minutes: 3,
			speed: 120,
			interval: 10,
			seedValue: 2026,
		});
		expect(o.error).toBeUndefined();
	});

	it("uses defaults and falls back on invalid numbers", () => {
		expect(parseCli(["--run", "--minutes", "abc"])).toMatchObject({
			command: "run",
			dryRun: false,
			minutes: 2,
			speed: 60,
			interval: 5,
		});
	});

	it("shows help with no command", () => {
		expect(parseCli([]).command).toBe("help");
	});

	it("rejects two commands at once instead of guessing", () => {
		const o = parseCli(["--seed", "--reset"]);
		expect(o.command).toBe("help");
		expect(o.error).toMatch(/one command/);
	});

	it("rejects non-positive speed, minutes or interval", () => {
		expect(parseCli(["--run", "--speed", "0"]).error).toMatch(/--speed/);
		expect(parseCli(["--run", "--interval", "-1"]).error).toMatch(/--interval/);
	});
});

describe("isSimEmail", () => {
	it("accepts only the synthetic domain", () => {
		expect(isSimEmail("u00.andrea@sim.quillart.test")).toBe(true);
		expect(isSimEmail("andrea@gmail.com")).toBe(false);
		expect(isSimEmail("x@evil-sim.quillart.test")).toBe(false);
		expect(isSimEmail("x@sim.quillart.test.evil.com")).toBe(false);
		expect(isSimEmail(undefined)).toBe(false);
	});
});

describe("parseManifest", () => {
	it("fills missing fields with empty lists", () => {
		const m = parseManifest('{"users":[],"events":["e1"]}', 7);
		expect(m.events).toEqual(["e1"]);
		expect(m.threads).toEqual([]);
		expect(m.seed).toBe(7);
	});
});

describe("buildResetPlan", () => {
	it("joins manifest users and listed synthetic accounts without duplicates", () => {
		const plan = buildResetPlan(manifest(), [
			{ id: "a", email: SIM_A.email },
			{ id: "b", email: SIM_B.email },
		]);
		expect(plan.userIds).toEqual(["a", "b"]);
	});

	it("never deletes an account whose email is not synthetic, even if the manifest lists it", () => {
		const real = {
			id: "real",
			email: "vecina@gmail.com",
			name: "Vecina",
			index: 5,
		};
		const plan = buildResetPlan(manifest({ users: [SIM_A, real] }), [
			{ id: "real2", email: "otra@gmail.com" },
		]);
		expect(plan.userIds).toEqual(["a"]);
		expect(plan.rejectedUsers).toEqual(["vecina@gmail.com", "otra@gmail.com"]);
		for (const step of plan.deletes) expect(step.ids).not.toContain("real");
	});

	it("deletes content before accounts and only by synthetic ids", () => {
		const plan = buildResetPlan(manifest(), []);
		const order = plan.deletes.map((s) => `${s.table}.${s.column}`);
		expect(order).toEqual([
			"forum_posts.id",
			"forum_posts.author_id",
			"forum_threads.id",
			"forum_threads.author_id",
			"event_waitlist.user_id",
			"event_registrations.user_id",
			"events.id",
			"events.organizer_id",
			"overcharge_reports.id",
			"content_reports.reporter_id",
		]);
		expect(
			plan.deletes.find((s) => s.table === "events" && s.column === "id")?.ids,
		).toEqual(["e1"]);
		expect(
			plan.deletes.find((s) => s.table === "overcharge_reports")?.where,
		).toEqual({ is_simulated: true });
		expect(
			plan.deletes.find(
				(s) => s.table === "events" && s.column === "organizer_id",
			)?.ids,
		).toEqual(["a"]);
	});

	it("never touches places", () => {
		const plan = buildResetPlan(manifest(), []);
		expect(plan.deletes.some((s) => s.table === "places")).toBe(false);
	});

	it("is a no-op on an empty manifest with no synthetic accounts (idempotent)", () => {
		const plan = buildResetPlan(emptyManifest(2026), []);
		expect(plan.userIds).toEqual([]);
		expect(plan.deletes.every((s) => s.ids.length === 0)).toBe(true);
		expect(plan.restoreZones).toBeNull();
		expect(plan.isEmpty).toBe(true);
	});

	it("restores zone counts from the backup", () => {
		const plan = buildResetPlan(manifest({ zoneBackup: { centro: 120 } }), []);
		expect(plan.restoreZones).toEqual({ centro: 120 });
		expect(plan.isEmpty).toBe(false);
	});
});

describe("describe plans", () => {
	it("prints the reset plan with counts and the DRY RUN marker", () => {
		const text = describeResetPlan(buildResetPlan(manifest(), [])).join("\n");
		expect(text).toMatch(/events\.id: 1/);
		expect(text).toMatch(/accounts: 1/);
	});

	it("explains the run scope: simulated hours, ticks and synthetic actors only", () => {
		const opts = parseCli([
			"--run",
			"--minutes",
			"2",
			"--speed",
			"360",
			"--interval",
			"5",
		]);
		const text = describeRunPlan(
			opts,
			manifest({ users: [SIM_A, SIM_B] }),
		).join("\n");
		expect(text).toMatch(/12\.0 h simulated/);
		expect(text).toMatch(/24 ticks/);
		expect(text).toMatch(/2 synthetic accounts/);
	});

	it("warns when there are no synthetic accounts to act with", () => {
		const text = describeRunPlan(parseCli(["--run"]), emptyManifest(2026)).join(
			"\n",
		);
		expect(text).toMatch(/--seed first/);
	});
});
