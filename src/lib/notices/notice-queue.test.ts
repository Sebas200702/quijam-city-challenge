import { describe, expect, it } from "vitest";
import {
	arroyoNotice,
	diversionNotice,
	floodTouchesVisitor,
	hostNotice,
	reportNotice,
} from "./notice-builders";
import {
	canCloseByItself,
	dismissNotice,
	emptyNoticeQueue,
	pushNotice,
	resetNotices,
	resolveNotice,
	tickNotices,
} from "./notice-queue";
import { DESVIO_TTL_MS, MIN_VISIBLE_MS } from "./notice-types";

const NOW = Date.UTC(2034, 5, 20, 18, 0);
const zone = {
	code: "ARR-MURILLO-46",
	name: "Carrera 46",
	zone: "troncal_murillo",
	alert_active: false,
};
const arroyo = (minutesLeft = 12) =>
	arroyoNotice({ zone, status: { kind: "countdown", minutesLeft } });
const host = hostNotice({
	assignmentId: "a1",
	status: "en_camino",
	minutesLeft: 6,
	meetingPoint: "Joaquín Barrios Polo",
});
const report = (id: string) => reportNotice(id, "open");

describe("notice queue", () => {
	it("shows the first notice and queues lower priority ones", () => {
		let state = pushNotice(emptyNoticeQueue(), host, NOW);
		state = pushNotice(state, report("r1"), NOW);
		state = pushNotice(
			state,
			diversionNotice({ walkMinutes: 20, openBusinesses: 12 }, NOW),
			NOW,
		);
		expect(state.visible?.key).toBe("anfitrion:a1");
		expect(state.waiting.map((n) => n.key)).toEqual([
			"desvio:barrio_abajo",
			"reporte:r1",
		]);
	});

	it("a higher priority notice replaces the visible one, which waits", () => {
		let state = pushNotice(emptyNoticeQueue(), report("r1"), NOW);
		state = pushNotice(state, host, NOW + 1000);
		expect(state.visible?.key).toBe("anfitrion:a1");
		expect(state.shownAt).toBe(NOW + 1000);
		expect(state.waiting.map((n) => n.key)).toEqual(["reporte:r1"]);
		state = pushNotice(state, arroyo(), NOW + 2000);
		expect(state.visible?.kind).toBe("arroyo");
		expect(state.waiting.map((n) => n.kind)).toEqual(["anfitrion", "reporte"]);
	});

	it("keeps at most 3 waiting, dropping the lowest priority", () => {
		let state = pushNotice(emptyNoticeQueue(), arroyo(), NOW);
		for (const id of ["r1", "r2", "r3"]) {
			state = pushNotice(state, report(id), NOW);
		}
		state = pushNotice(state, host, NOW);
		expect(state.waiting.map((n) => n.key)).toEqual([
			"anfitrion:a1",
			"reporte:r1",
			"reporte:r2",
		]);
	});

	it("dedupes: the same kind and object updates instead of adding", () => {
		let state = pushNotice(emptyNoticeQueue(), arroyo(12), NOW);
		state = pushNotice(state, arroyo(9), NOW + 5000);
		expect(state.visible?.title).toBe("Arroyo activo en 9 min");
		expect(state.shownAt).toBe(NOW);
		expect(state.waiting).toHaveLength(0);
		state = pushNotice(state, report("r1"), NOW);
		state = pushNotice(state, reportNotice("r1", "resolved"), NOW);
		expect(state.waiting.map((n) => n.title)).toEqual([
			"Tu reporte fue resuelto",
		]);
	});

	it("a dismissed modal never opens again until reiniciar", () => {
		let state = pushNotice(emptyNoticeQueue(), arroyo(), NOW);
		state = dismissNotice(state, "arroyo:ARR-MURILLO-46", NOW + 1000);
		expect(state.visible).toBeNull();
		state = pushNotice(state, arroyo(5), NOW + 2000);
		expect(state.visible).toBeNull();
		state = pushNotice(resetNotices(), arroyo(5), NOW + 3000);
		expect(state.visible?.kind).toBe("arroyo");
	});

	it("dismissing shows the next waiting notice", () => {
		let state = pushNotice(emptyNoticeQueue(), arroyo(), NOW);
		state = pushNotice(state, host, NOW);
		state = dismissNotice(state, "arroyo:ARR-MURILLO-46", NOW + 500);
		expect(state.visible?.key).toBe("anfitrion:a1");
		expect(state.shownAt).toBe(NOW + 500);
	});

	it("never closes by itself before 20 s", () => {
		let state = pushNotice(emptyNoticeQueue(), host, NOW);
		state = resolveNotice(state, "anfitrion:a1", NOW + 5000);
		expect(state.visible?.key).toBe("anfitrion:a1");
		expect(canCloseByItself(state, NOW + 5000)).toBe(false);
		state = tickNotices(state, NOW + MIN_VISIBLE_MS);
		expect(state.visible).toBeNull();
	});

	it("expires a diversion suggestion after 20 min, waiting or visible", () => {
		const desvio = diversionNotice(
			{ walkMinutes: 20, openBusinesses: 12 },
			NOW,
		);
		let state = pushNotice(emptyNoticeQueue(), host, NOW);
		state = pushNotice(state, desvio, NOW);
		expect(state.waiting).toHaveLength(1);
		state = tickNotices(state, NOW + DESVIO_TTL_MS);
		expect(state.waiting).toHaveLength(0);
		expect(pushNotice(emptyNoticeQueue(), desvio, NOW + DESVIO_TTL_MS)).toEqual(
			emptyNoticeQueue(),
		);
	});

	it("returns the same state when nothing changes", () => {
		const state = pushNotice(emptyNoticeQueue(), host, NOW);
		expect(tickNotices(state, NOW + 1)).toBe(state);
		expect(dismissNotice(state, "nope", NOW)).toBe(state);
		expect(resolveNotice(state, "nope", NOW)).toBe(state);
		expect(pushNotice(state, { ...host }, NOW + 5)).toBe(state);
	});
});

describe("arroyo relevance", () => {
	it("applies when it crosses the route or the current zone", () => {
		expect(
			floodTouchesVisitor(zone, { routeFloodZoneCodes: [zone.code] }),
		).toBe(true);
		expect(floodTouchesVisitor(zone, { routeZones: ["troncal_murillo"] })).toBe(
			true,
		);
		expect(floodTouchesVisitor(zone, { currentZone: "troncal_murillo" })).toBe(
			true,
		);
		expect(
			floodTouchesVisitor(zone, {
				routeFloodZoneCodes: ["ARR-VIA-40"],
				routeZones: ["gran_malecon"],
				currentZone: "gran_malecon",
			}),
		).toBe(false);
	});

	it("applies when nothing is known about the visitor (safety first)", () => {
		expect(floodTouchesVisitor(zone)).toBe(true);
	});

	it("writes the countdown copy", () => {
		expect(arroyo(12).title).toBe("Arroyo activo en 12 min");
		expect(arroyoNotice({ zone, status: { kind: "active" } }).title).toBe(
			"Arroyo activo ahora",
		);
		expect(arroyo().action?.label).toBe("Cambiar ruta");
		expect(arroyo().secondaryAction?.label).toBe("Entendido");
	});
});
