// Templates for the city simulation (docs/32-simulacion.md). Everything here is
// SYNTHETIC: invented people, community activities and forum messages used only to
// show the app working. Real places are referenced by their slug in the places table.

/** Deterministic PRNG (mulberry32). */
export function rng(seed: number) {
	let a = seed >>> 0;
	const next = () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
	return {
		next,
		int: (min: number, max: number) => min + Math.floor(next() * (max - min + 1)),
		pick: <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)],
		chance: (p: number) => next() < p,
		weighted: <T>(items: readonly T[], weight: (item: T) => number): T | null => {
			const total = items.reduce((s, i) => s + Math.max(0, weight(i)), 0);
			if (total <= 0) return null;
			let r = next() * total;
			for (const i of items) {
				r -= Math.max(0, weight(i));
				if (r <= 0) return i;
			}
			return items[items.length - 1];
		},
	};
}
export type Rng = ReturnType<typeof rng>;

export const SIM_EMAIL_DOMAIN = "sim.quillart.test";
/** Visible marker on every synthetic display name. */
export const SIM_NAME_SUFFIX = " (simulado)";

export const FIRST_NAMES = [
	"Andrea", "Camilo", "Valentina", "Jhon", "Daniela", "Luis", "Mariana", "Kevin", "Yuliana", "Carlos",
	"Natalia", "Jesús", "Paola", "Andrés", "Katherine", "Jorge", "Melissa", "Brayan", "Diana", "Wilmer",
	"Laura", "Rafael", "Estefanía", "Javier", "Liseth", "Óscar", "Mileidys", "Hernán", "Sofía", "Álvaro",
	"Yesenia", "Fabián", "Dayana", "Eduardo", "Lorena", "Sebastián", "Karen", "Iván", "Gisela", "Tomás",
];
export const LAST_INITIALS = "ABCDEFGHJLMNOPRSTV".split("");

/** Coarse home zones (barrio + municipality). */
export const BARRIOS = [
	"El Prado, Barranquilla", "Boston, Barranquilla", "Barrio Abajo, Barranquilla", "Rebolo, Barranquilla",
	"Las Nieves, Barranquilla", "Los Andes, Barranquilla", "Villa Country, Barranquilla", "Riomar, Barranquilla",
	"Ciudad Jardín, Barranquilla", "San Roque, Barranquilla", "Simón Bolívar, Barranquilla", "Villas de San Pablo, Barranquilla",
	"La Paz, Barranquilla", "Olaya, Barranquilla", "Montes, Barranquilla", "Las Flores, Barranquilla", "California, Barranquilla",
	"Carrizal, Barranquilla", "Santo Domingo, Barranquilla",
	"Centro, Soledad", "Villa Estadio, Soledad", "Costa Hermosa, Soledad", "Manuela Beltrán, Soledad", "Ciudadela Metropolitana, Soledad",
	"El Concorde, Malambo", "Villa Esperanza, Malambo", "La Magdalena, Malambo", "Bellavista, Malambo",
	"Centro, Galapa", "Villa Olímpica, Galapa", "Las Mercedes, Galapa",
	"Centro, Puerto Colombia", "Pradomar, Puerto Colombia", "Salgar, Puerto Colombia", "Sabanilla, Puerto Colombia",
];
export const VISITOR_ORIGINS = ["Visitante de Bogotá", "Visitante de Medellín", "Visitante de Cali", "Visitante de Ciudad de México"];

export const SIM_USER_COUNT = 40;
/** Indexes of synthetic users that act as verified community organizers. */
export const ORGANIZER_INDEXES = [0, 5, 11, 18, 26, 33];
/** Indexes of synthetic visitors (is_visitor). */
export const VISITOR_INDEXES = [7, 15, 22, 37];
/** Accounts created "today": their first event goes to review (trust policy). */
export const FRESH_INDEXES = [3, 29, 38];

type Category = "culture" | "sport" | "nature" | "volunteer" | "food" | "music" | "learning" | "community";

export interface ActivityTemplate {
	key: string;
	title: string;
	description: string;
	category: Category;
	place: string; // places.slug
	/** Local Bogotá datetimes "YYYY-MM-DDTHH:MM" for each edition. */
	dates: string[];
	hours: number;
	capacity: number;
	priceCop?: number;
	/** Relative popularity (1 = average). */
	pop: number;
	organizer: number; // index of the synthetic organizer
}

const SIM_NOTE =
	"\n\nActividad simulada para la demostración de QUILLART: la organiza un usuario sintético y no es una convocatoria real.";

export const COMMUNITY_ACTIVITIES: ActivityTemplate[] = [
	{ key: "limpieza-puerto-mocho", title: "Limpieza de playa en Puerto Mocho", category: "volunteer", place: "playa-puerto-mocho",
		description: "Jornada de recolección de residuos en la playa. Lleva gorra, bloqueador y botella reutilizable; los guantes y bolsas los ponemos nosotros.",
		dates: ["2026-12-05T07:00", "2027-01-16T07:00"], hours: 3, capacity: 40, pop: 1.2, organizer: 0 },
	{ key: "limpieza-malecon-rebolo", title: "Minga de limpieza en el Malecón de Rebolo", category: "volunteer", place: "malecon-de-rebolo",
		description: "Recogemos residuos y pintamos bancas junto al río. Punto de encuentro en la entrada principal del malecón.",
		dates: ["2026-12-12T07:30"], hours: 3, capacity: 35, pop: 1, organizer: 11 },
	{ key: "murales-barrio-abajo", title: "Recorrido por los murales de Barrio Abajo", category: "culture", place: "museo-a-cielo-abierto-barrio-abajo",
		description: "Caminata de dos horas por los murales del barrio, con paradas para hablar de la historia del Carnaval y sus personajes.",
		dates: ["2026-12-06T16:00", "2027-01-10T16:00", "2027-01-31T16:00"], hours: 2, capacity: 25, pop: 1.5, organizer: 5 },
	{ key: "domino-los-andes", title: "Torneo de dominó en el Parque Los Andes", category: "community", place: "parque-los-andes",
		description: "Torneo por parejas, abierto a todas las edades. Inscripción por pareja en la app; trae tu propio juego si tienes.",
		dates: ["2026-12-13T15:00", "2027-01-24T15:00"], hours: 4, capacity: 32, pop: 1, organizer: 18 },
	{ key: "running-malecon", title: "Grupo de running al amanecer en el Gran Malecón", category: "sport", place: "gran-malecon",
		description: "Trote suave de 5 km a ritmo conversacional. Salimos a las 5:30 a. m., antes del calor. Todos los niveles.",
		dates: ["2026-12-02T05:30", "2026-12-09T05:30", "2026-12-16T05:30", "2027-01-13T05:30", "2027-01-27T05:30"], hours: 1.5, capacity: 60, pop: 1.3, organizer: 26 },
	{ key: "aves-mallorquin", title: "Avistamiento de aves en la Ciénaga de Mallorquín", category: "nature", place: "cienaga-de-mallorquin",
		description: "Salida temprana para observar aves del manglar. Trae binoculares si tienes; compartimos guías de identificación.",
		dates: ["2026-12-19T06:00", "2027-01-23T06:00"], hours: 2.5, capacity: 20, pop: 1.4, organizer: 33 },
	{ key: "aves-alameda", title: "Caminata de aves en la Reserva Alameda del Río", category: "nature", place: "reserva-alameda-del-rio",
		description: "Recorrido corto por la reserva para reconocer aves y árboles nativos.",
		dates: ["2027-01-09T06:30"], hours: 2, capacity: 18, pop: 1.1, organizer: 33 },
	{ key: "mascaras-galapa", title: "Taller de máscaras de Carnaval para niños", category: "learning", place: "biblioteca-villa-olimpica-galapa",
		description: "Taller para niños de 7 a 12 años con materiales reciclados. Cada niño se lleva su máscara.",
		dates: ["2027-01-17T09:00", "2027-01-30T09:00"], hours: 3, capacity: 20, pop: 1.2, organizer: 5 },
	{ key: "lectura-villas-san-pablo", title: "Club de lectura de autores del Caribe", category: "learning", place: "biblioteca-villas-de-san-pablo",
		description: "Encuentro mensual para conversar sobre cuentos de autores del Caribe colombiano. No hace falta haber leído antes.",
		dates: ["2026-12-10T17:00", "2027-01-14T17:00"], hours: 2, capacity: 25, pop: 0.8, organizer: 11 },
	{ key: "novena-las-nieves", title: "Novena navideña comunitaria en el Parque Las Nieves", category: "community", place: "parque-las-nieves",
		description: "Novena de aguinaldos entre vecinos, con villancicos y tambores. Cada noche una familia distinta lleva el refrigerio.",
		dates: ["2026-12-16T19:00", "2026-12-20T19:00", "2026-12-23T19:00"], hours: 1.5, capacity: 120, pop: 1.3, organizer: 18 },
	{ key: "novena-villa-estadio", title: "Novena navideña en el Parque de Villa Estadio", category: "community", place: "parque-villa-estadio-soledad",
		description: "Novena de barrio con villancicos para niños y adultos mayores.",
		dates: ["2026-12-18T19:00", "2026-12-22T19:00"], hours: 1.5, capacity: 100, pop: 1.1, organizer: 26 },
	{ key: "caminata-centro", title: "Caminata patrimonial: del Paseo Bolívar a San Nicolás", category: "culture", place: "paseo-bolivar",
		description: "Recorrido a pie por edificios republicanos del centro, con parada en la Plaza de San Nicolás.",
		dates: ["2026-12-05T08:00", "2027-01-09T08:00"], hours: 2.5, capacity: 30, pop: 1.3, organizer: 5 },
	{ key: "bici-nocturna", title: "Bicipaseo nocturno por el Gran Malecón", category: "sport", place: "gran-malecon",
		description: "Rodada tranquila de 12 km con luces y casco obligatorios. Ritmo para principiantes.",
		dates: ["2026-12-11T19:00", "2027-01-22T19:00"], hours: 2, capacity: 80, pop: 1.4, organizer: 26 },
	{ key: "cumbia-cisneros", title: "Clase abierta de cumbia en el Parque Cisneros", category: "music", place: "parque-cisneros",
		description: "Clase para principiantes con pasos básicos de cumbia y mapalé. Ropa cómoda.",
		dates: ["2027-01-08T18:00", "2027-01-29T18:00"], hours: 1.5, capacity: 50, pop: 1.5, organizer: 0 },
	{ key: "yoga-muelle", title: "Yoga al amanecer frente al Muelle de Puerto Colombia", category: "sport", place: "muelle-puerto-colombia",
		description: "Sesión de yoga suave frente al mar. Trae tu mat o toalla.",
		dates: ["2026-12-13T06:00", "2027-01-10T06:00"], hours: 1, capacity: 30, pop: 1.2, organizer: 33 },
	{ key: "siembra-bicentenario", title: "Siembra de árboles nativos en el Parque Bicentenario", category: "volunteer", place: "parque-bicentenario",
		description: "Sembramos árboles nativos y adoptamos uno por familia para regarlo en temporada seca.",
		dates: ["2026-12-06T07:00"], hours: 3, capacity: 45, pop: 1, organizer: 0 },
	{ key: "emprendedores-soledad", title: "Feria de emprendedores del barrio en Villa Estadio", category: "food", place: "parque-villa-estadio-soledad",
		description: "Venta de comidas típicas, artesanías y productos de emprendimientos del barrio.",
		dates: ["2026-12-20T15:00"], hours: 5, capacity: 300, pop: 1.1, organizer: 26 },
	{ key: "juegos-tradicionales-malambo", title: "Tarde de juegos tradicionales en el Parque La Luna", category: "community", place: "parque-la-luna-malambo",
		description: "Trompo, bolita de uñita, catapis y saltar la cuerda para niños y grandes.",
		dates: ["2026-12-27T15:00"], hours: 3, capacity: 60, pop: 0.9, organizer: 18 },
	{ key: "arroyos-malambo", title: "Conversatorio: qué hacer cuando sube un arroyo", category: "learning", place: "casa-de-la-cultura-malambo",
		description: "Charla vecinal sobre prevención ante arroyos: rutas seguras, señales de riesgo y cómo avisar a tiempo.",
		dates: ["2027-01-21T18:00"], hours: 1.5, capacity: 60, pop: 0.8, organizer: 11 },
	{ key: "microfutbol-galapa", title: "Torneo relámpago de microfútbol en La Candelaria", category: "sport", place: "cancha-la-candelaria-galapa",
		description: "Equipos de cinco, partidos de 20 minutos. Inscribe a tu equipo con el nombre del capitán.",
		dates: ["2027-01-03T08:00"], hours: 6, capacity: 80, pop: 1, organizer: 18 },
	{ key: "decimas-puerto", title: "Tarde de décimas y poesía costeña", category: "culture", place: "casa-de-la-cultura-puerto-colombia",
		description: "Micrófono abierto para decimeros, poetas y cuenteros del municipio.",
		dates: ["2027-01-15T17:00"], hours: 2, capacity: 40, pop: 0.8, organizer: 33 },
	{ key: "pesca-artesanal", title: "Charla con pescadores artesanales de Puerto Colombia", category: "learning", place: "playa-pescadores-puerto-colombia",
		description: "Conversación sobre la pesca artesanal, las artes de pesca y el cuidado del mar.",
		dates: ["2027-01-24T08:00"], hours: 2, capacity: 30, pop: 0.9, organizer: 0 },
	{ key: "patinaje-venezuela", title: "Patinaje recreativo en familia en el Parque Venezuela", category: "sport", place: "parque-venezuela",
		description: "Encuentro de patinaje para niños y adultos, con recorrido guiado y juegos.",
		dates: ["2026-12-26T16:00"], hours: 2, capacity: 50, pop: 0.9, organizer: 26 },
	{ key: "muestra-carnaval", title: "Muestra de danzas de Carnaval para visitantes", category: "culture", place: "plaza-de-la-paz",
		description: "Grupos de barrio muestran congo, garabato y mapalé y explican su origen a quienes llegan para el Carnaval.",
		dates: ["2027-02-04T17:00"], hours: 2, capacity: 400, pop: 1.8, organizer: 5 },
	{ key: "disfraces-reciclados", title: "Taller de disfraces con material reciclado", category: "learning", place: "parque-plaza-galapa",
		description: "Taller familiar para armar disfraces de Carnaval con cartón, telas y botellas.",
		dates: ["2027-01-31T09:00"], hours: 3, capacity: 30, pop: 1, organizer: 5 },
	{ key: "manglar-mallorquin", title: "Jornada de limpieza del manglar de Mallorquín", category: "volunteer", place: "cienaga-de-mallorquin",
		description: "Retiramos plásticos del borde del manglar con acompañamiento de guías del ecoparque.",
		dates: ["2027-01-30T07:00"], hours: 3, capacity: 30, pop: 1.1, organizer: 33 },
	{ key: "foto-san-nicolas", title: "Taller de fotografía urbana en San Nicolás", category: "learning", place: "plaza-san-nicolas",
		description: "Recorrido fotográfico por el centro con ejercicios de luz y encuadre. Sirve el celular.",
		dates: ["2026-12-19T15:30"], hours: 2.5, capacity: 20, pop: 1, organizer: 11 },
	// Events by non-verified accounts: the trust policy sends them to review (paid / first event).
	{ key: "ruta-butifarra", title: "Ruta gastronómica por el Mercado Público de Soledad", category: "food", place: "mercado-publico-soledad",
		description: "Recorrido para probar butifarra, bollo y jugos en puestos del mercado. El valor incluye las degustaciones.",
		dates: ["2027-01-17T09:00"], hours: 3, capacity: 20, priceCop: 35000, pop: 1, organizer: 3 },
	{ key: "softbol-malambo", title: "Partido amistoso de softbol en Malambo", category: "sport", place: "estadio-beisbol-humberto-vasquez",
		description: "Partido amistoso entre equipos de barrio. Abierto al público.",
		dates: ["2027-01-10T15:00"], hours: 3, capacity: 150, pop: 0.8, organizer: 29 },
].map((a) => ({ ...a, description: a.description + SIM_NOTE }));

type ForumCategory = "general" | "mobility" | "nature" | "safety" | "culture" | "visitors" | "neighborhood";

export interface ThreadTemplate {
	title: string;
	body: string;
	category: ForumCategory;
	place?: string;
	/** Title of a real or projected event to link. */
	eventTitleLike?: string;
	replies: string[];
}

export const THREAD_TEMPLATES: ThreadTemplate[] = [
	{ title: "¿Cuál es la mejor hora para ir al Gran Malecón en diciembre?", category: "visitors", place: "gran-malecon",
		body: "Vengo con mi familia la semana del 20. ¿Es mejor ir temprano o en la noche para ver el alumbrado sin tanta gente?",
		replies: ["En la noche se pone lleno desde las 7. Si quieres alumbrado sin tumulto, llega a las 6 y te vas a las 8.", "Entre semana es mucho más tranquilo que sábado y domingo.", "Lleva agua, que aunque sea de noche el calor pega.", "La entrada por la calle 6 se congestiona menos."] },
	{ title: "Ruta en Transmetro desde Soledad hasta el centro", category: "mobility",
		body: "¿Alguien sabe cuánto se demora el Transmetro del Portal de Soledad a la estación Parque Cultural un domingo?",
		replies: ["Un domingo en la mañana unos 35 minutos.", "Ojo que algunos domingos hay menos frecuencia.", "Yo lo hago seguido, llega rápido si no hay evento en el centro."] },
	{ title: "Cobro abusivo de taxi del Malecón a la Troja", category: "safety", place: "gran-malecon",
		body: "Anoche me cobraron 30 mil por una carrera corta del Malecón hasta la calle 72. ¿Cuánto debería costar más o menos?",
		replies: ["Eso es un abuso, repórtalo en la sección de tarifas de la app.", "A mí me pasó lo mismo en Carnaval.", "Pide siempre la tarifa antes de subirte."] },
	{ title: "Arroyo en la calle 84 con lluvia de esta tarde", category: "safety",
		body: "Con el aguacero de hoy se formó arroyo en la calle 84 bajando hacia la carrera 46. No crucen, va con fuerza.",
		replies: ["Gracias por avisar, me desvié por la 79.", "Ya bajó un poco, pero todavía corre agua.", "Siempre pasa en ese punto, ojalá lo canalicen."] },
	{ title: "Recomendaciones para la Ciénaga de Mallorquín", category: "nature", place: "cienaga-de-mallorquin",
		body: "Quiero ir a caminar por el ecoparque. ¿Qué día es mejor y qué debo llevar?",
		replies: ["Temprano en la mañana se ven más aves.", "Lleva repelente, los mosquitos no perdonan.", "Los sábados hay más gente pero también más guías."] },
	{ title: "¿Qué hacer en Puerto Colombia un domingo?", category: "visitors", place: "muelle-puerto-colombia",
		body: "Llego de Medellín y quiero pasar un día en Puerto Colombia. ¿Qué me recomiendan además del muelle?",
		replies: ["Almuerza pescado frito cerca de la playa de Pescadores.", "El Castillo de Salgar vale la pena para el atardecer.", "Ve temprano, en la tarde se llena la vía."] },
	{ title: "Los murales de Barrio Abajo están quedando hermosos", category: "culture", place: "museo-a-cielo-abierto-barrio-abajo",
		body: "Pasé por Barrio Abajo y hay murales nuevos de personajes del Carnaval. Vale la pena el recorrido a pie.",
		replies: ["Sí, el de la marimonda está espectacular.", "Ojalá los cuiden del grafiti.", "Recomiendo ir con alguien del barrio que cuente las historias."] },
	{ title: "Basura acumulada en el Parque Los Andes", category: "neighborhood", place: "parque-los-andes",
		body: "Desde el fin de semana hay basura acumulada en la esquina del parque. ¿Alguien sabe cuándo pasa la recolección?",
		replies: ["Pasa martes, jueves y sábado en la mañana.", "Hay que organizar una jornada de limpieza entre vecinos.", "Yo avisé a la empresa de aseo, quedaron de pasar."] },
	{ title: "¿Ya se sabe la fecha de la Guacherna 2027?", category: "culture",
		body: "Quiero planear la visita de mi familia. ¿Alguien vio la fecha oficial de la Guacherna?",
		replies: ["Todavía no la he visto publicada, hay que esperar a Carnaval de Barranquilla.", "Normalmente es el viernes antes del Carnaval.", "Pendientes de la página oficial."] },
	{ title: "Grupo para trotar en Soledad", category: "neighborhood",
		body: "¿Hay algún grupo que salga a trotar en la mañana por Soledad 2000 o Villa Estadio?",
		replies: ["Nosotros salimos martes y jueves a las 5:30.", "Me apunto, vivo en Villa Estadio.", "Cuidado con la vía, mejor por el polideportivo."] },
	{ title: "¿Dónde ver el alumbrado navideño en Galapa?", category: "general", place: "parque-plaza-galapa",
		body: "¿Este año habrá alumbrado en la plaza de Galapa? El año pasado estuvo bonito.",
		replies: ["Siempre lo ponen alrededor de la plaza principal.", "Dicen que lo encienden a inicios de diciembre.", "Llevo a los niños todos los años."] },
	{ title: "Hueco grande en la vía a Puerto Colombia", category: "mobility",
		body: "Hay un hueco grande en la vía al mar a la altura de Pradomar, sentido Puerto Colombia. De noche no se ve.",
		replies: ["Casi me caigo en moto ahí.", "Ya lo reporté también.", "Pongan una señal, es peligroso."] },
	{ title: "Mercado campesino en San Vicente", category: "neighborhood", place: "mercado-campesino-san-vicente",
		body: "¿Alguien sabe si este mes vuelve el mercado campesino a San Vicente? Las frutas estaban muy buenas.",
		replies: ["Creo que es el primer sábado de cada mes.", "Yo compré queso costeño muy bueno ahí.", "Ojalá anuncien la fecha con tiempo."] },
	{ title: "Accesibilidad en el Parque Cultural del Caribe", category: "visitors", place: "parque-cultural-del-caribe",
		body: "Voy con mi mamá en silla de ruedas. ¿El Parque Cultural tiene rampas y baños accesibles?",
		replies: ["La plaza es plana y se recorre bien.", "Pregunta en la entrada del museo, tienen ascensor.", "Llega por la estación Parque Cultural del Transmetro, que queda al lado."] },
];

export const GENERIC_REPLIES = [
	"Gracias por la información, muy útil.",
	"Me apunto, cuenten conmigo.",
	"¿Alguien sabe si hay parqueadero cerca?",
	"Buenísimo, nos vemos allá.",
	"Lo comparto con mis vecinos.",
	"Ojalá se repita el próximo mes.",
	"Fui la vez pasada y estuvo muy bien organizado.",
	"¿Es apto para niños?",
	"Yo llego en Transmetro, es lo más fácil.",
];

/**
 * Messages that should land in the moderation queue (held or city follow-up), to show
 * the triage working. They do not contain personal data and do not target real people.
 */
export const MODERATION_SAMPLES: { title: string; body: string; category: ForumCategory }[] = [
	{ title: "Gana dinero desde tu casa esta temporada", category: "general",
		body: "Ingresos extra garantizados con criptomoneda, inversion garantizada. Escribeme al privado y te explico." },
	{ title: "Difundan: cancelan todos los eventos del Malecón", category: "general",
		body: "Alerta maxima, difundan antes de que lo borren: cancelan todo en el Malecón esta semana. Los medios no lo dicen." },
	{ title: "Comunicado oficial sobre cierres viales", category: "mobility",
		body: "Comunicado oficial: somos la alcaldia y mañana cierran todas las vías del centro. Pasalo." },
	{ title: "Inundado el paso de la calle 17 en Soledad", category: "safety",
		body: "Está inundado el paso de la calle 17 cerca del puente. Hay un carro atrapado, que alguien llame a emergencia." },
];
export const MODERATION_REPLIES = [
	"Eso que dices es de idiota, no sabes nada.",
	"Ingresos extra con bitcoin, escribeme al privado.",
];

export const OVERCHARGE_NOTES = [
	"Carrera corta después del evento, el conductor no quiso negociar.",
	"Me cobraron casi el triple por ser de noche.",
	"Pidió tarifa fija sin taxímetro.",
	"Salida de evento, cobro alto en la fila de taxis.",
];
