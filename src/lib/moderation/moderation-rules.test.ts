import { describe, expect, it } from "vitest";
import { applyModerationRules } from "./moderation-rules";

const rules = (body: string) => applyModerationRules({ kind: "post", body });

/** What a category decides: verdict, labels and city priority (not the reason text). */
const outcome = (body: string) => {
	const { verdict, labels, priority } = rules(body);
	return { verdict, labels, priority };
};

describe("hard rules in English, Portuguese and French", () => {
	it.each([
		// [category, Spanish reference, English, Portuguese, French]
		[
			"hate",
			"muerte a los extranjeros",
			"go back to your country",
			"morte aos estrangeiros",
			"mort aux étrangers",
		],
		[
			"threat",
			"te voy a matar",
			"I will kill you",
			"vou te matar",
			"je vais te tuer",
		],
		[
			"insult",
			"eres un idiota",
			"you are an asshole",
			"seu filho da puta",
			"espèce de connard",
		],
		[
			"spam",
			"gana dinero desde la casa",
			"make money fast from home",
			"ganhe dinheiro em casa",
			"gagnez de l'argent depuis chez vous",
		],
		[
			"impersonation",
			"soy de la alcaldía y les aviso",
			"official statement from the city",
			"somos a prefeitura e avisamos",
			"communiqué officiel de la ville",
		],
		[
			"misinformation",
			"difundan esto ya",
			"forward to everyone right now",
			"repassem isso já",
			"faites tourner ce message",
		],
		[
			"city",
			"hay un hueco en la calle",
			"there is a pothole on the street",
			"tem um buraco na rua",
			"il y a un nid de poule dans la rue",
		],
		[
			"emergency",
			"hay un herido en la vía",
			"someone is injured on the road",
			"tem um ferido na estrada",
			"il y a un blessé sur la route",
		],
	])("%s: en, pt and fr decide like Spanish", (_category, es, en, pt, fr) => {
		const reference = outcome(es);
		expect([...reference.labels, reference.priority]).not.toEqual([
			"ok",
			"none",
		]);
		expect(outcome(en)).toEqual(reference);
		expect(outcome(pt)).toEqual(reference);
		expect(outcome(fr)).toEqual(reference);
	});

	it.each([
		"See you at the concert tonight, it was great last year",
		"Vamos ao parque amanhã com as crianças?",
		"On se retrouve au parc demain avec les enfants ?",
		"I'm going to kill it at the salsa class, con mucho sabor",
		"Le concert est complet, quelle idiote je suis de ne pas avoir réservé",
	])("publishes ordinary text: %s", (body) => {
		expect(outcome(body)).toEqual({
			verdict: "publish",
			labels: ["ok"],
			priority: "none",
		});
	});

	it("keeps Spanish findings unchanged", () => {
		expect(rules("eres un idiota, te voy a matar, hay un herido")).toEqual({
			verdict: "reject",
			labels: ["threat", "harassment"],
			priority: "emergency",
			signals: ["contains 1 insult word(s)", "mentions a possible emergency"],
			reason: "El mensaje contiene amenazas y no se puede publicar.",
		});
	});
});
