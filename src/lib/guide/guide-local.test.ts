import { describe, expect, it } from "vitest";
import { CORRIDOR_SEED } from "../corridor/corridor-seed";
import { planTrip } from "../trip/trip-planner";
import {
	detectDestination,
	detectLanguage,
	formatFare,
	localReply,
} from "./guide-local";

describe("detectLanguage", () => {
	it.each([
		["How do I get to the stadium?", "en"],
		["¿Cómo llego al estadio?", "es"],
		["Como chego ao estádio, por favor?", "pt"],
		["Comment aller au stade ?", "fr"],
		["Wie komme ich zum Stadion?", "de"],
	])("%s → %s", (question, language) => {
		expect(detectLanguage(question)).toBe(language);
	});

	it("defaults to English when nothing matches", () => {
		expect(detectLanguage("¿¿??")).toBe("en");
	});
});

describe("detectDestination", () => {
	it.each([
		["How do I get to the stadium?", "estadio"],
		["Wie komme ich zum Stadion?", "estadio"],
		["I want to see the carnival house", "barrio_abajo"],
		["Comment aller au centre ?", "centro"],
		["Where can I eat?", null],
	])("%s → %s", (question, destination) => {
		expect(detectDestination(question)).toBe(destination);
	});
});

describe("localReply", () => {
	it("gives the green route, its fare and the fair taxi range in the visitor's language", () => {
		const reply = localReply("en", planTrip(CORRIDOR_SEED, "estadio"));
		expect(reply).toContain("Take the Transmetro to Estadio Metropolitano");
		expect(reply).toContain("about 38 min");
		expect(reply).toContain(formatFare(3500, "en"));
		expect(reply).toContain(
			`between ${formatFare(20000, "en")} and ${formatFare(28000, "en")}`,
		);
		expect(reply).toContain("report it");
	});

	it("formats fares with the visitor's separators", () => {
		expect(formatFare(24000, "en")).toBe("$24,000 COP");
		expect(formatFare(24000, "es")).toBe("$24.000 COP");
	});

	it("asks where to go without a destination", () => {
		expect(localReply("fr", null)).toMatch(/Où voulez-vous aller/);
	});
});
