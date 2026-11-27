import { describe, expect, it } from "vitest";
import type { ModerationDecision } from "./moderation-types";
import { type AuthorTrust, applyTrustPolicy } from "./trust-policy";

const published: ModerationDecision = {
	verdict: "publish",
	labels: ["ok"],
	priority: "none",
	reason: "Publicado.",
	source: "rules",
	confidence: null,
};

const trusted: AuthorTrust = {
	kind: "event",
	accountAgeHours: 500,
	publishedEvents: 4,
	isVerifiedOrganizer: false,
	isPaidEvent: false,
};

describe("applyTrustPolicy", () => {
	it("publishes free events from established accounts", () => {
		expect(applyTrustPolicy(published, trusted).verdict).toBe("publish");
	});

	it("reviews the first event of a new account", () => {
		const decision = applyTrustPolicy(published, {
			...trusted,
			accountAgeHours: 2,
			publishedEvents: 0,
		});
		expect(decision.verdict).toBe("review");
		expect(decision.reason).toMatch(/primer evento/);
	});

	it("reviews paid events from unverified organizers only", () => {
		expect(
			applyTrustPolicy(published, { ...trusted, isPaidEvent: true }).verdict,
		).toBe("review");
		expect(
			applyTrustPolicy(published, {
				...trusted,
				isPaidEvent: true,
				isVerifiedOrganizer: true,
			}).verdict,
		).toBe("publish");
	});

	it("never touches forum content or softens a stricter verdict", () => {
		expect(
			applyTrustPolicy(published, {
				...trusted,
				kind: "post",
				accountAgeHours: 0,
			}).verdict,
		).toBe("publish");
		const rejected = { ...published, verdict: "reject" as const };
		expect(
			applyTrustPolicy(rejected, { ...trusted, isPaidEvent: true }).verdict,
		).toBe("reject");
	});
});
