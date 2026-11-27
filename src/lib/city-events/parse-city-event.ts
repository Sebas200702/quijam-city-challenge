import type { CityEvent, CityMode } from "./city-events-types";

const CITY_MODES: CityMode[] = ["mundial", "carnaval", "cotidiano"];
const FLOOD_ZONE_ID = /^[A-Za-z0-9_-]{1,40}$/;
const REPORT_ID = /^[A-Za-z0-9-]{1,64}$/;

export type ParsedCityEvent =
	| { ok: true; value: CityEvent }
	| { ok: false; error: string };

const fail = (error: string): ParsedCityEvent => ({ ok: false, error });

/**
 * Strict check of a `city-events` event received from outside (the presenter
 * API). Returns a clean copy with only the contract's fields.
 */
export function parseCityEvent(body: unknown): ParsedCityEvent {
	if (typeof body !== "object" || body === null || Array.isArray(body)) {
		return fail("Send the event as a JSON object.");
	}
	const input = body as Record<string, unknown>;
	switch (input.type) {
		case "aguacero": {
			const { zoneIds, startsInMin } = input;
			if (
				!Array.isArray(zoneIds) ||
				zoneIds.length === 0 ||
				zoneIds.length > 10 ||
				!zoneIds.every((id) => typeof id === "string" && FLOOD_ZONE_ID.test(id))
			) {
				return fail("aguacero needs 1 to 10 flood zone ids.");
			}
			if (
				!Number.isInteger(startsInMin) ||
				(startsInMin as number) < 0 ||
				(startsInMin as number) > 120
			) {
				return fail("startsInMin must be a whole number from 0 to 120.");
			}
			return {
				ok: true,
				value: {
					type: "aguacero",
					zoneIds: [...new Set(zoneIds as string[])],
					startsInMin: startsInMin as number,
				},
			};
		}
		case "malecon_saturado": {
			const { capacityPct } = input;
			if (
				typeof capacityPct !== "number" ||
				!Number.isFinite(capacityPct) ||
				capacityPct < 0 ||
				capacityPct > 300
			) {
				return fail("capacityPct must be a number from 0 to 300.");
			}
			return {
				ok: true,
				value: {
					type: "malecon_saturado",
					capacityPct: Math.round(capacityPct),
				},
			};
		}
		case "cobro_abusivo": {
			const { reportId } = input;
			if (typeof reportId !== "string" || !REPORT_ID.test(reportId)) {
				return fail(
					"cobro_abusivo needs the reportId the reports API returned.",
				);
			}
			return { ok: true, value: { type: "cobro_abusivo", reportId } };
		}
		case "modo_ciudad": {
			const { mode } = input;
			if (!CITY_MODES.includes(mode as CityMode)) {
				return fail("mode must be mundial, carnaval or cotidiano.");
			}
			return {
				ok: true,
				value: { type: "modo_ciudad", mode: mode as CityMode },
			};
		}
		case "tiempo": {
			const { hour } = input;
			if (
				!Number.isInteger(hour) ||
				(hour as number) < 8 ||
				(hour as number) > 23
			) {
				return fail("hour must be a whole number from 8 to 23.");
			}
			return { ok: true, value: { type: "tiempo", hour: hour as number } };
		}
		case "reiniciar":
			return { ok: true, value: { type: "reiniciar" } };
		default:
			return fail("Unknown event type.");
	}
}
