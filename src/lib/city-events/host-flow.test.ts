import { describe, expect, it } from "vitest";
import type { HostAssignment } from "./city-events-types";
import { hostActionEvent, nextHostAction } from "./host-flow";

const base: HostAssignment = {
	id: "h1",
	need: "movilidad_reducida",
	meetingPointCode: "STOP-MURILLO-SUR",
	status: "pendiente",
};

describe("host flow", () => {
	it("offers one action per step and none while waiting", () => {
		expect(nextHostAction(null)).toBeNull();
		expect(nextHostAction(base)).toBe("accept");
		expect(nextHostAction({ ...base, status: "en_camino" })).toBe("arrived");
		expect(nextHostAction({ ...base, status: "llego" })).toBe("finish");
	});

	it("publishes the matching status", () => {
		expect(hostActionEvent("accept", "h1")).toMatchObject({
			status: "en_camino",
			etaMin: 6,
		});
		expect(hostActionEvent("arrived", "h1")).toMatchObject({ status: "llego" });
		expect(hostActionEvent("finish", "h1")).toMatchObject({
			status: "terminada",
		});
	});
});
