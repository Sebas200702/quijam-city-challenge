import { describe, expect, it } from "vitest";
import { parseCityEvent } from "../city-events/parse-city-event";
import {
	createSessionValue,
	isValidSession,
	keyMatches,
} from "./presenter-session";

const KEY = "demo-key-2034-quillart";
const NOW = 1_800_000_000_000;

describe("presenter session", () => {
	it("accepts its own unexpired cookie", () => {
		expect(isValidSession(createSessionValue(KEY, NOW), KEY, NOW + 1000)).toBe(
			true,
		);
	});

	it("rejects expired, tampered, foreign-key and malformed cookies", () => {
		const value = createSessionValue(KEY, NOW);
		expect(isValidSession(value, KEY, NOW + 8 * 3_600_000 + 1)).toBe(false);
		const [expiry, signature] = value.split(".");
		expect(
			isValidSession(`${Number(expiry) + 999_999}.${signature}`, KEY, NOW),
		).toBe(false);
		expect(isValidSession(value, "another-key-entirely", NOW)).toBe(false);
		expect(isValidSession("garbage", KEY, NOW)).toBe(false);
		expect(isValidSession(undefined, KEY, NOW)).toBe(false);
	});

	it("compares the key exactly and refuses short or missing server keys", () => {
		expect(keyMatches(KEY, KEY)).toBe(true);
		expect(keyMatches(`${KEY} `, KEY)).toBe(false);
		expect(keyMatches(123, KEY)).toBe(false);
		expect(keyMatches("short", "short")).toBe(false);
		expect(keyMatches("anything", undefined)).toBe(false);
		expect(isValidSession(createSessionValue("short", NOW), "short", NOW)).toBe(
			false,
		);
	});
});

describe("parseCityEvent", () => {
	it("accepts every event type of the contract", () => {
		for (const event of [
			{ type: "aguacero", zoneIds: ["ARR-MURILLO-46"], startsInMin: 12 },
			{ type: "malecon_saturado", capacityPct: 140 },
			{
				type: "cobro_abusivo",
				reportId: "7d0c2d58-0d53-4f5f-9d3c-7d2a7a1f3b11",
			},
			{ type: "modo_ciudad", mode: "carnaval" },
			{ type: "tiempo", hour: 18 },
			{ type: "reiniciar" },
		]) {
			expect(parseCityEvent(event)).toEqual({ ok: true, value: event });
		}
	});

	it("drops unknown fields and duplicate zones", () => {
		expect(
			parseCityEvent({
				type: "aguacero",
				zoneIds: ["A", "A"],
				startsInMin: 0,
				extra: "<script>",
			}),
		).toEqual({
			ok: true,
			value: { type: "aguacero", zoneIds: ["A"], startsInMin: 0 },
		});
	});

	it("rejects bad shapes and out-of-range values", () => {
		for (const body of [
			null,
			[],
			"reiniciar",
			{ type: "unknown" },
			{ type: "aguacero", zoneIds: [], startsInMin: 5 },
			{ type: "aguacero", zoneIds: ["bad id!"], startsInMin: 5 },
			{ type: "aguacero", zoneIds: ["A"], startsInMin: -1 },
			{ type: "aguacero", zoneIds: ["A"], startsInMin: 2.5 },
			{ type: "malecon_saturado", capacityPct: "140" },
			{ type: "malecon_saturado", capacityPct: 999 },
			{ type: "cobro_abusivo", reportId: "" },
			{ type: "modo_ciudad", mode: "fiesta" },
			{ type: "tiempo", hour: 7 },
		]) {
			expect(parseCityEvent(body).ok).toBe(false);
		}
	});
});
