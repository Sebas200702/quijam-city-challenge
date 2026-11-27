// Hard moderation rules. They run first, on the server and in the browser,
// and always win: personal data and slurs never reach OpenJev or the forum.

import type {
	ModerationInput,
	ModerationLabel,
	ModerationVerdict,
	RuleFindings,
	TriagePriority,
} from "./moderation-types";

export function normalizeText(text: string): string {
	return text
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase()
		.replace(/[0@]/g, (char) => (char === "0" ? "o" : "a"))
		.replace(/(.)\1{2,}/g, "$1$1");
}

// Personal data (Ley 1581 de 2012): phone numbers, e-mails and ID numbers.
const PHONE = /(\+?57[\s-]?)?\b3\d{2}[\s.-]?\d{3}[\s.-]?\d{4}\b/;
const EMAIL = /[^\s@]+@[^\s@]+\.[a-z]{2,}/i;
const ID_NUMBER =
	/\b(c\.?\s?c\.?|cedula|pasaporte|documento)\s*(n[or]\.?|#)?\s*:?\s*\d[\d.\s]{5,}/i;

// Slurs and hate speech: blocked outright.
const HATE_TERMS = [
	"sudaca",
	"veneco de mierda",
	"negro de mierda",
	"indio de mierda",
	"maricon de mierda",
	"muerte a los",
	"hay que matar",
];

// Direct insults: held for a person to look at (costeño slang can be friendly).
const INSULT_TERMS = [
	"hijueputa",
	"hijo de puta",
	"malparido",
	"gonorrea",
	"carechimba",
	"guevon",
	"huevon",
	"imbecil",
	"estupido",
	"idiota",
	"perra",
	"puta",
	"careverga",
	"mamaguevo",
];

const THREAT_TERMS = [
	"te voy a matar",
	"te voy a buscar",
	"te vamos a encontrar",
	"le voy a dar plomo",
];

const SPAM_TERMS = [
	"gana dinero",
	"ingresos extra",
	"inversion garantizada",
	"criptomoneda",
	"bitcoin",
	"forex",
	"escribeme al privado",
	"prestamos sin fiador",
	"click aqui",
];

// Reports the city should see: flooding, risks in public space, abuse.
const CITY_TERMS = [
	"arroyo",
	"inundacion",
	"inundado",
	"crecida",
	"hueco",
	"alcantarilla",
	"poste caido",
	"cable caido",
	"arbol caido",
	"sin luz",
	"basura acumulada",
	"cobro abusivo",
	"me cobraron",
	"robo",
	"atraco",
	"trancon",
];

const EMERGENCY_TERMS = [
	"herido",
	"heridos",
	"incendio",
	"se lo llevo el arroyo",
	"arrastrado",
	"atrapado",
	"emergencia",
	"ambulancia",
	"nino perdido",
	"nina perdida",
	"persona perdida",
	"desaparecido",
];

// Chain-message style alarms: real reports rarely ask to be forwarded.
const MISINFORMATION_TERMS = [
	"difundan",
	"difundir urgente",
	"compartan antes de que lo borren",
	"reenvien",
	"reenvia a todos",
	"pasalo",
	"cadena",
	"alerta maxima",
	"los medios no lo dicen",
	"nadie lo esta diciendo",
	"100% confirmado",
	"confirmadisimo",
];

// Speaking as an authority the author is not.
const IMPERSONATION_TERMS = [
	"comunicado oficial",
	"mensaje oficial",
	"aviso oficial",
	"somos la alcaldia",
	"soy de la alcaldia",
	"de parte de la alcaldia",
	"la policia informa",
	"los bomberos informan",
	"defensa civil informa",
	"equipo de quillart",
	"soporte de quillart",
];

/** Domains whose links publish without review (government, universities, the city). */
export const TRUSTED_LINK_DOMAINS = [
	"barranquilla.gov.co",
	"gov.co",
	"edu.co",
	"carnavaldebarranquilla.org",
	"google.com",
	"maps.app.goo.gl",
];

const URL_PATTERN = /\b(?:https?:\/\/|www\.)[^\s<>"]+/gi;

function linkHost(url: string): string | null {
	try {
		const withScheme = url.startsWith("www.") ? `https://${url}` : url;
		return new URL(withScheme).hostname.toLowerCase().replace(/^www\./, "");
	} catch {
		return null;
	}
}

export function isTrustedLink(url: string): boolean {
	const host = linkHost(url);
	if (!host) return false;
	return TRUSTED_LINK_DOMAINS.some(
		(domain) => host === domain || host.endsWith(`.${domain}`),
	);
}

/** "imbeciiiil" and "imbecil" match the same term; doubled letters still match. */
function squeeze(text: string): string {
	return text.replace(/(.)\1+/g, "$1");
}

function containsAny(text: string, terms: string[]): string[] {
	const squeezed = squeeze(text);
	return terms.filter(
		(term) =>
			new RegExp(`\\b${term}\\b`).test(text) ||
			new RegExp(`\\b${squeeze(term)}\\b`).test(squeezed),
	);
}

const VERDICT_RANK: Record<ModerationVerdict, number> = {
	publish: 0,
	review: 1,
	reject: 2,
};
const PRIORITY_RANK: Record<TriagePriority, number> = {
	none: 0,
	city_attention: 1,
	emergency: 2,
};

export function stricterVerdict(
	a: ModerationVerdict,
	b: ModerationVerdict,
): ModerationVerdict {
	return VERDICT_RANK[a] >= VERDICT_RANK[b] ? a : b;
}

export function higherPriority(
	a: TriagePriority,
	b: TriagePriority,
): TriagePriority {
	return PRIORITY_RANK[a] >= PRIORITY_RANK[b] ? a : b;
}

export function applyModerationRules(input: ModerationInput): RuleFindings {
	const raw = `${input.title ?? ""}\n${input.body}`;
	const text = normalizeText(raw);
	const labels = new Set<ModerationLabel>();
	const signals: string[] = [];
	let verdict: ModerationVerdict = "publish";
	let reason: string | null = null;

	if (PHONE.test(raw) || EMAIL.test(raw) || ID_NUMBER.test(raw)) {
		labels.add("personal_data");
		verdict = "reject";
		reason =
			"Por tu seguridad no publicamos teléfonos, correos ni números de documento. Quítalos y vuelve a intentarlo.";
	}

	if (containsAny(text, HATE_TERMS).length > 0) {
		labels.add("hate");
		verdict = "reject";
		reason ??=
			"El mensaje tiene expresiones de odio o discriminación y no se puede publicar.";
	}

	if (containsAny(text, THREAT_TERMS).length > 0) {
		labels.add("threat");
		verdict = "reject";
		reason ??= "El mensaje contiene amenazas y no se puede publicar.";
	}

	const insults = containsAny(text, INSULT_TERMS);
	if (insults.length > 0) {
		labels.add("harassment");
		signals.push(`contains ${insults.length} insult word(s)`);
		verdict = stricterVerdict(verdict, "review");
		reason ??=
			"Tu mensaje quedó en revisión porque tiene palabras ofensivas. Un moderador lo revisará pronto.";
	}

	const links = raw.match(URL_PATTERN) ?? [];
	const untrustedLinks = links.filter((link) => !isTrustedLink(link));
	const spamTerms = containsAny(text, SPAM_TERMS);
	if (links.length > 2 || spamTerms.length > 0) {
		labels.add("spam");
		signals.push(`${links.length} link(s), ${spamTerms.length} spam phrase(s)`);
		verdict = stricterVerdict(verdict, "review");
		reason ??=
			"Tu mensaje quedó en revisión porque parece publicidad. Un moderador lo revisará pronto.";
	} else if (untrustedLinks.length > 0) {
		labels.add("spam");
		signals.push(`${untrustedLinks.length} external link(s)`);
		verdict = stricterVerdict(verdict, "review");
		reason ??=
			"Tu mensaje quedó en revisión porque tiene un enlace externo. Un moderador lo revisará pronto.";
	}

	if (containsAny(text, IMPERSONATION_TERMS).length > 0) {
		labels.add("impersonation");
		signals.push("speaks as an official authority");
		verdict = stricterVerdict(verdict, "review");
		reason ??=
			"Tu mensaje quedó en revisión porque habla en nombre de una entidad oficial. Solo la ciudad publica avisos oficiales.";
	}

	if (containsAny(text, MISINFORMATION_TERMS).length > 0) {
		labels.add("misinformation");
		signals.push("chain-message style alarm");
		verdict = stricterVerdict(verdict, "review");
		reason ??=
			"Tu mensaje quedó en revisión para confirmar la información antes de publicarla. Si alguien está en peligro, llama al 123.";
	}

	const letters = raw.replace(/[^\p{L}]/gu, "");
	if (letters.length > 40 && letters === letters.toUpperCase()) {
		signals.push("written in all caps");
	}

	let priority: TriagePriority = "none";
	const cityTerms = containsAny(text, CITY_TERMS);
	if (cityTerms.length > 0) {
		priority = "city_attention";
		signals.push("mentions a public-space problem");
	}
	if (containsAny(text, EMERGENCY_TERMS).length > 0) {
		priority = "emergency";
		signals.push("mentions a possible emergency");
	}

	if (labels.size === 0) labels.add("ok");
	return { verdict, labels: [...labels], priority, signals, reason };
}
