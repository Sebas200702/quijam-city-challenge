// Calls the real OpenJev API with two demo decisions and prints the answers.
// Usage: bun run scripts/openjev-probe.ts  (reads TYPESAFE_API_KEY from .env)
import { createOpenJevClient } from "../src/lib/openjev/openjev-client";
import type {
	DecisionState,
	Questions,
} from "../src/lib/openjev/openjev-types";

const apiKey = process.env.TYPESAFE_API_KEY;
if (!apiKey) {
	console.error("Set TYPESAFE_API_KEY in .env first.");
	process.exit(1);
}

const client = createOpenJevClient({
	apiKey,
	baseUrl: process.env.TYPESAFE_BASE_URL || undefined,
	model: process.env.OPENJEV_MODEL || undefined,
	timeoutMs: 15000,
});

const probes: { name: string; state: DecisionState; questions: Questions }[] = [
	{
		name: "route Malecon -> Estadio",
		state: {
			visitor:
				"foreign tourist, speaks English, prefers eco-friendly transport",
			origin: "Gran Malecon",
			destination: "Estadio Metropolitano",
			time_to_kickoff_min: 90,
			weather: "dry, 33C",
			remaining_routes_after_safety_rules: {
				bus_transmetro:
					"Transmetro via Troncal Murillo, 55 min, fare 3200 COP, shaded stops",
				taxi_fair_fare:
					"verified taxi with reference fare 28000 COP, 35 min, heavy match-day traffic",
				walk_bus_mix: "walk 15 min to Centro, then bus, 70 min, fare 3200 COP",
			},
		},
		questions: {
			route: {
				type: "choice" as const,
				instructions:
					"Which route best fits this visitor: arrives on time, low cost, low emissions",
				criteria: {
					bus_transmetro: "Public transport via Troncal Murillo",
					taxi_fair_fare: "Verified taxi with reference fare",
					walk_bus_mix: "Walk to Centro then bus",
				},
			},
		},
	},
	{
		name: "crowd diversion from saturated Malecon",
		state: {
			zone_saturated: "Gran Malecon at 140% capacity",
			candidate_zones: {
				barrio_abajo:
					"60% capacity, 12 verified popular businesses open, 15 min walk, no flood alert",
				centro: "85% capacity, cultural event at 7pm, 20 min by bus",
				estadio_area: "95% capacity, match in 3 hours",
			},
		},
		questions: {
			divert_to: {
				type: "choice" as const,
				instructions:
					"Where should the city suggest visitors go to relieve the saturated zone",
				criteria: {
					barrio_abajo: "Barrio Abajo",
					centro: "Centro",
					estadio_area: "Stadium area",
				},
			},
		},
	},
];

for (const probe of probes) {
	for (let run = 1; run <= 3; run++) {
		const started = performance.now();
		const result = await client.decide(probe.state, probe.questions);
		const ms = Math.round(performance.now() - started);
		console.log(`${probe.name} #${run} ${ms}ms ${JSON.stringify(result)}`);
	}
}
