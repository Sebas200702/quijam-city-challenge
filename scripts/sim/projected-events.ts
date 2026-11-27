// Projected editions of recurring events (docs/32-simulacion.md). SYNTHETIC: each one is
// an estimate for Dec 2026 – Feb 2027 built from a public source. Two kinds:
// - "announced": the 2027 date and venue come from the official announcement of
//   14 Nov 2026 (Carnaval 2027); the hour is still an estimate.
// - "past-edition": date projected from the last verified edition (same weekday or the
//   same position relative to Carnaval). Date and hour are estimates.
// Events from docs/33 left out because no source gives a date: encendido de Puerto
// Colombia, Navidad y fin de año en el Gran Malecón, Gran Parada de Tradición/Comparsas.

export const PROJECTION_ORGANIZER = "Agenda proyectada (simulado)";

export interface ProjectedEvent {
	title: string;
	description: string;
	category:
		| "culture"
		| "sport"
		| "nature"
		| "volunteer"
		| "food"
		| "music"
		| "learning"
		| "community";
	/** Bogotá local time, "YYYY-MM-DDTHH:MM". */
	startsAt: string;
	endsAt?: string;
	place?: string; // places.slug
	locationText?: string;
	capacity?: number;
	isFree: boolean;
	priceCop?: number;
	basis: "announced" | "past-edition";
	pastEdition: string;
	sourceUrl: string;
}

const INFOBAE_2027 =
	"https://www.infobae.com/colombia/2026/11/14/el-carnaval-de-barranquilla-2027-estrenara-escenarios-con-eventos-en-la-avenida-shakira-el-supermetro-y-el-romelio-martinez-anuncio-el-alcalde-alejandro-char/";
const BLU_2027 =
	"https://www.bluradio.com/regiones/caribe/coronacion-de-la-reina-del-carnaval-de-barranquilla-2027-sera-en-el-supermetro-rg10";
const ELTIEMPO_2027 =
	"https://www.eltiempo.com/colombia/barranquilla/el-traslado-al-malecon-no-va-confirman-que-la-via-40-seguira-siendo-sede-de-los-grandes-desfiles-del-carnaval-de-barranquilla-3601084";

export const PROJECTED_EVENTS: ProjectedEvent[] = [
	// ── Navidad 2026 ──
	{
		title: "Encendido del alumbrado navideño en el Gran Malecón",
		description:
			"Encendido de las luces de Navidad a orillas del río. En 2024 fue el domingo 1 de diciembre a las 6:30 p. m.; se proyecta al primer domingo de diciembre de 2026.",
		category: "community",
		startsAt: "2026-12-06T18:30",
		endsAt: "2026-12-06T21:00",
		place: "gran-malecon",
		isFree: true,
		basis: "past-edition",
		pastEdition: "2024",
		sourceUrl:
			"https://www.elheraldo.co/atlantico/2024/12/01/desde-este-domingo-barranquilla-se-ilumina-con-el-encendido-navideno/",
	},
	{
		title: "Gran Parada de la Luz",
		description:
			"Desfile navideño de la noche de velitas. La edición 2024 fue la noche del 8 de diciembre.",
		category: "culture",
		startsAt: "2026-12-08T18:00",
		endsAt: "2026-12-08T22:00",
		locationText: "Barranquilla (recorrido por confirmar)",
		isFree: true,
		basis: "past-edition",
		pastEdition: "2024",
		sourceUrl:
			"https://www.eluniversal.com.co/regional/atlantico/2024/12/08/la-reina-tatiana-brillo-como-un-copo-de-nieve-en-la-gran-parada-de-la-luz/",
	},
	{
		title: "Novenas navideñas en el Gran Malecón",
		description:
			"Novenas del 16 al 22 de diciembre en distintos sectores del Gran Malecón (en 2025: Gastronómico, Puerta de Oro, Recreodeportivo y Nativo).",
		category: "community",
		startsAt: "2026-12-16T18:00",
		endsAt: "2026-12-22T20:00",
		place: "gran-malecon",
		isFree: true,
		basis: "past-edition",
		pastEdition: "2025",
		sourceUrl:
			"https://www.elheraldo.co/sociedad/2025/12/16/barranquilla-abre-sus-espacios-para-rezar-la-novena-en-familia/",
	},
	// ── Precarnaval y Carnaval 2027 (fechas anunciadas el 14 nov 2026) ──
	{
		title:
			"Lectura del Bando y coronación de los reyes del Carnaval de los Niños",
		description:
			"Apertura oficial del Carnaval 2027 en el estadio Romelio Martínez.",
		category: "culture",
		startsAt: "2027-01-17T16:00",
		place: "estadio-romelio-martinez",
		isFree: false,
		basis: "announced",
		pastEdition: "2026",
		sourceUrl: INFOBAE_2027,
	},
	{
		title: "Desfile de La Guacherna",
		description:
			"Desfile nocturno del precarnaval por la carrera 44; en 2027 homenajea al grupo Bananas.",
		category: "culture",
		startsAt: "2027-01-29T19:00",
		locationText: "Carrera 44, Barranquilla",
		isFree: true,
		basis: "announced",
		pastEdition: "2026",
		sourceUrl: BLU_2027,
	},
	{
		title: "Desfile del Carnaval de los Niños",
		description:
			"Desfile infantil, por primera vez en la Avenida Shakira (antigua calle 72).",
		category: "culture",
		startsAt: "2027-01-31T14:00",
		locationText: "Avenida Shakira (calle 72), Barranquilla",
		isFree: true,
		basis: "announced",
		pastEdition: "2026",
		sourceUrl: ELTIEMPO_2027,
	},
	{
		title: "Coronación de los Reyes del Carnaval 2027",
		description:
			"Coronación de la reina y el rey del Carnaval en el Supermetro (estadio Metropolitano).",
		category: "culture",
		startsAt: "2027-02-05T19:00",
		place: "estadio-metropolitano",
		isFree: false,
		basis: "announced",
		pastEdition: "2026",
		sourceUrl: INFOBAE_2027,
	},
	{
		title: "Superconcierto del Carnaval",
		description: "Concierto central del Carnaval en el Supermetro.",
		category: "music",
		startsAt: "2027-02-06T20:00",
		place: "estadio-metropolitano",
		isFree: false,
		basis: "announced",
		pastEdition: "2026",
		sourceUrl: INFOBAE_2027,
	},
	{
		title: "Desfile del Rey Momo",
		description: "Desfile del Rey Momo por la calle 17 el sábado de Carnaval.",
		category: "culture",
		startsAt: "2027-02-06T15:00",
		locationText: "Calle 17, Barranquilla",
		isFree: true,
		basis: "announced",
		pastEdition: "2026",
		sourceUrl: INFOBAE_2027,
	},
	{
		title: "Batalla de Flores",
		description:
			"Desfile inaugural del Carnaval en el cumbiódromo de la Vía 40, el sábado de Carnaval (6 de febrero).",
		category: "culture",
		startsAt: "2027-02-06T11:00",
		locationText: "Cumbiódromo de la Vía 40, Barranquilla",
		isFree: false,
		basis: "announced",
		pastEdition: "2026",
		sourceUrl: ELTIEMPO_2027,
	},
	// ── Otros municipios (proyección: el domingo anterior al Carnaval de Barranquilla, como en 2025) ──
	{
		title: "Gran Parada Departamental del Folclor de Galapa",
		description:
			"Desfile de grupos folclóricos del Atlántico por las calles de Galapa. En 2025 fue el domingo 23 de febrero, con concentración a la 1:30 p. m. en el Parque la Prosperidad, una semana antes del Carnaval de Barranquilla.",
		category: "culture",
		startsAt: "2027-01-31T13:30",
		locationText: "Parque la Prosperidad, Galapa",
		isFree: true,
		basis: "past-edition",
		pastEdition: "2025",
		sourceUrl:
			"https://www.elheraldo.co/sociedad/2025/02/24/fuera-de-serie-asi-fue-la-gran-parada-departamental-de-galapa/",
	},
	{
		title: "Gran Batalla de Flores de Malambo",
		description:
			"Desfile desde El Piloto hasta la entrada de Malambo. En 2025 fue el domingo 23 de febrero, una semana antes del Carnaval de Barranquilla.",
		category: "culture",
		startsAt: "2027-01-31T14:00",
		locationText: "De El Piloto a la entrada de Malambo",
		isFree: true,
		basis: "past-edition",
		pastEdition: "2025",
		sourceUrl:
			"https://www.elheraldo.co/atlantico/2025/02/24/con-musica-y-muestras-culturales-malambo-vibro-en-la-gran-batalla-de-flores/",
	},
];

/** Text shown in the app: always says it is a projection, with edition and source. */
export function projectedDescription(e: ProjectedEvent): string {
	const date =
		e.basis === "announced"
			? "Fecha anunciada para 2027; hora estimada a partir de la edición anterior."
			: "Fecha y hora estimadas a partir de esa edición.";
	return `${e.description}\n\nProyección basada en la edición ${e.pastEdition} (fuente: ${e.sourceUrl}). ${date} Confirma con la fuente oficial antes de ir. Publicado por la simulación de QUILLART, no por los organizadores.`;
}

const LOCAL = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const WINDOW = { from: "2026-12-01", to: "2027-02-28T23:59" };

/** Returns one message per problem; empty when the list is valid. */
export function validateProjectedEvents(events: ProjectedEvent[]): string[] {
	const errors: string[] = [];
	const seen = new Set<string>();
	for (const e of events) {
		if (seen.has(e.title)) errors.push(`${e.title}: duplicate title`);
		seen.add(e.title);
		if (!/^https:\/\/\S+$/.test(e.sourceUrl))
			errors.push(`${e.title}: sourceUrl must be an https URL`);
		if (!LOCAL.test(e.startsAt)) {
			errors.push(`${e.title}: startsAt must be YYYY-MM-DDTHH:MM`);
			continue;
		}
		if (e.startsAt < WINDOW.from || e.startsAt > WINDOW.to)
			errors.push(`${e.title}: outside Dec 2026 – Feb 2027`);
		if (e.endsAt && (!LOCAL.test(e.endsAt) || e.endsAt <= e.startsAt))
			errors.push(`${e.title}: endsAt must be after startsAt`);
		if (!e.place && !e.locationText)
			errors.push(`${e.title}: needs place or locationText`);
	}
	return errors;
}
