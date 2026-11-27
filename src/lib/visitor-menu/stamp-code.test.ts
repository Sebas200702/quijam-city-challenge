import { describe, expect, it } from "vitest";
import {
	addStamp,
	buildBusinessStampCode,
	buildEventStampCode,
	GREEN_EVENT_REWARD,
	parseStampCode,
	stampFromCode,
} from "./stamp-code";

describe("parseStampCode", () => {
	it("reads a business code", () => {
		expect(parseStampCode(buildBusinessStampCode("biz-fritos-rosa"))).toEqual({
			kind: "negocio",
			code: "BIZ-FRITOS-ROSA",
		});
	});

	it("reads an event code with accents", () => {
		const raw = buildEventStampCode(
			"e1",
			"Siembra en la Ciénaga",
			"Las Flores",
		);
		expect(parseStampCode(raw)).toEqual({
			kind: "evento",
			id: "e1",
			name: "Siembra en la Ciénaga",
			place: "Las Flores",
		});
	});

	it("rejects anything else", () => {
		expect(parseStampCode("https://example.com")).toBeNull();
		expect(parseStampCode("quillart:sello:negocio:")).toBeNull();
		expect(parseStampCode("quillart:sello:evento:e1:%E0%A4%A:x")).toBeNull();
		expect(parseStampCode("quillart:sello:otro:x")).toBeNull();
	});
});

describe("stampFromCode", () => {
	const now = new Date("2026-11-27T12:00:00Z");

	it("gives a verified business a stamp without reward", () => {
		const stamp = stampFromCode(
			{ kind: "negocio", code: "BIZ-FRITOS-ROSA" },
			now,
		);
		expect(stamp?.source).toBe("verified-business");
		expect(stamp?.reward).toBeUndefined();
		expect(stamp?.place).toBe("Barrio Abajo");
	});

	it("rejects an unknown business", () => {
		expect(
			stampFromCode({ kind: "negocio", code: "BIZ-NOPE" }, now),
		).toBeNull();
	});

	it("gives a green event a reward", () => {
		const stamp = stampFromCode(
			{ kind: "evento", id: "e1", name: "Siembra", place: "Las Flores" },
			now,
		);
		expect(stamp?.source).toBe("green-event");
		expect(stamp?.reward).toBe(GREEN_EVENT_REWARD);
	});
});

describe("addStamp", () => {
	it("keeps the first stamp when the same QR is scanned twice", () => {
		const stamp = stampFromCode({ kind: "negocio", code: "BIZ-FRITOS-ROSA" });
		if (!stamp) throw new Error("expected a stamp");
		const first = addStamp({ stamps: [] }, stamp);
		expect(first.added).toBe(true);
		const second = addStamp(first.passport, stamp);
		expect(second.added).toBe(false);
		expect(second.passport.stamps).toHaveLength(1);
	});
});
