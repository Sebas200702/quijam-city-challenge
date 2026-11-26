import { describe, expect, it } from "vitest";
import { corridorLine } from "../corridor/corridor-geometry";
import { CORRIDOR_SEED } from "../corridor/corridor-seed";
import {
	CrowdSim,
	DIVERSION_CAP,
	SATURATION_SHARE,
	type ZoneSeed,
} from "./crowd-sim";

// Same figures as zone_visitor_counts in supabase/seed.sql (simulated).
const ZONES: ZoneSeed[] = [
	{ zone: "estadio", visitors: 4200, capacity: 6000 },
	{ zone: "troncal_murillo", visitors: 1850, capacity: 3000 },
	{ zone: "centro", visitors: 1400, capacity: 2500 },
	{ zone: "barrio_abajo", visitors: 620, capacity: 1800 },
	{ zone: "gran_malecon", visitors: 3100, capacity: 3500 },
];

function newSim(agents = 2000) {
	return new CrowdSim({
		path: corridorLine(CORRIDOR_SEED.stops),
		stops: CORRIDOR_SEED.stops,
		floodZones: CORRIDOR_SEED.floodZones,
		zones: ZONES,
		agents,
	});
}

function run(sim: CrowdSim, seconds: number, dt = 1 / 30) {
	for (let t = 0; t < seconds; t += dt) sim.step(dt);
}

describe("CrowdSim", () => {
	it("starts with the seed counts, within one agent per zone", () => {
		const sim = newSim();
		const counts = sim.counts();
		for (const zone of ZONES) {
			expect(Math.abs(counts[zone.zone] - zone.visitors)).toBeLessThanOrEqual(
				Math.ceil(sim.visitorsPerAgent),
			);
		}
	});

	it("is deterministic", () => {
		const a = newSim(300);
		const b = newSim(300);
		run(a, 10);
		run(b, 10);
		expect(a.counts()).toEqual(b.counts());
	});

	it("keeps the total number of visitors while people move", () => {
		const sim = newSim();
		const total = () => Object.values(sim.counts()).reduce((x, y) => x + y, 0);
		const before = total();
		run(sim, 20);
		expect(Math.abs(total() - before)).toBeLessThanOrEqual(5);
	});

	it("stays close to the seed when nothing happens", () => {
		const sim = newSim();
		run(sim, 60);
		const counts = sim.counts();
		for (const zone of ZONES) {
			expect(
				Math.abs(counts[zone.zone] - zone.visitors) / zone.visitors,
			).toBeLessThan(0.15);
		}
	});

	it("saturates the Malecon, then diverts to Barrio Abajo up to its cap and stops when relieved", () => {
		const sim = newSim();
		sim.applyEvent({ type: "malecon_saturado", capacityPct: 140 });
		const saturated = sim.counts();
		expect(saturated.gran_malecon).toBeGreaterThanOrEqual(3500 * 1.35);

		let barrioPeak = 0;
		for (let second = 0; second < 60; second++) {
			run(sim, 1);
			barrioPeak = Math.max(barrioPeak, sim.counts().barrio_abajo);
		}
		const after = sim.counts();
		// Barrio Abajo receives people but never goes over 75 % of its threshold.
		expect(barrioPeak).toBeGreaterThan(saturated.barrio_abajo + 500);
		expect(barrioPeak).toBeLessThanOrEqual(
			1800 * DIVERSION_CAP + sim.visitorsPerAgent,
		);
		// The Malecon leaves "Saturado" and the diversion does not empty it.
		expect(after.gran_malecon).toBeLessThan(3500 * SATURATION_SHARE);
		expect(after.gran_malecon).toBeGreaterThan(3500 * 0.7);
	});

	it("keeps everyone out of an arroyo once its countdown ends", () => {
		const sim = newSim();
		sim.applyEvent({
			type: "aguacero",
			zoneIds: ["troncal_murillo", "centro"],
			startsInMin: 0,
		});
		run(sim, 30);
		for (let i = 0; i < sim.agentCount; i++) {
			expect(sim.inBlockedArroyo(sim.pos[i])).toBe(false);
		}
	});

	it("also blocks arroyos still counting down", () => {
		const sim = newSim();
		sim.applyEvent({
			type: "aguacero",
			zoneIds: ["barrio_abajo"],
			startsInMin: 12,
		});
		run(sim, 30);
		for (let i = 0; i < sim.agentCount; i++) {
			expect(sim.inBlockedArroyo(sim.pos[i])).toBe(false);
		}
	});

	it("goes back to the seed on reiniciar", () => {
		const sim = newSim();
		const start = sim.counts();
		sim.applyEvent({ type: "malecon_saturado", capacityPct: 140 });
		run(sim, 10);
		sim.applyEvent({ type: "reiniciar" });
		expect(sim.counts()).toEqual(start);
	});

	it("places agents on the corridor", () => {
		const sim = newSim(50);
		const out: [number, number] = [0, 0];
		for (let i = 0; i < sim.agentCount; i++) {
			const [lat, lng] = sim.latLngOf(i, out);
			expect(lat).toBeGreaterThan(10.9);
			expect(lat).toBeLessThan(11.02);
			expect(lng).toBeGreaterThan(-74.81);
			expect(lng).toBeLessThan(-74.77);
		}
	});

	it("steps 2,000 agents well within a 30 fps frame budget", () => {
		const sim = newSim();
		sim.applyEvent({ type: "malecon_saturado", capacityPct: 140 });
		const frames = 120;
		const started = performance.now();
		for (let frame = 0; frame < frames; frame++) sim.step(1 / 30);
		const msPerFrame = (performance.now() - started) / frames;
		// 33 ms per frame at 30 fps; the step must leave room for drawing.
		expect(msPerFrame).toBeLessThan(10);
	});
});
