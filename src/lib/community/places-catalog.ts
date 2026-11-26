// Public spaces and natural areas of Barranquilla and its metro area.
// Same list as supabase/seed-community.sql; used when the app runs without Supabase.
// Coordinates are approximate (place centre) and only used for the map link.

import type { Place } from "./community-types";

type PlaceSeed = Omit<Place, "id">;

const PLACE_SEEDS: PlaceSeed[] = [
	{
		slug: "cienaga-de-mallorquin",
		name: "Ecoparque Ciénaga de Mallorquín",
		kind: "nature",
		neighborhood: "Las Flores",
		description:
			"Manglar, senderos sobre pilotes y miradores de aves junto a la desembocadura del río Magdalena. Ideal para caminatas al amanecer y avistamiento de aves.",
		address: "Corregimiento La Playa, vía a Las Flores",
		latitude: 11.0405,
		longitude: -74.8535,
		isAccessible: true,
		isFree: true,
		openingHours: "Martes a domingo, 6:00 a. m. – 5:00 p. m.",
	},
	{
		slug: "gran-malecon",
		name: "Gran Malecón del Río",
		kind: "waterfront",
		neighborhood: "Riomar",
		description:
			"Más de cinco kilómetros a orillas del Magdalena con ciclorruta, zonas verdes, juegos y comida. El punto de encuentro de la ciudad al atardecer.",
		address: "Avenida del Río (Vía 40)",
		latitude: 11.0075,
		longitude: -74.7815,
		isAccessible: true,
		isFree: true,
		openingHours: "Todos los días, 5:00 a. m. – 11:00 p. m.",
	},
	{
		slug: "bocas-de-ceniza",
		name: "Bocas de Ceniza y Tajamar",
		kind: "nature",
		neighborhood: "Las Flores",
		description:
			"El lugar donde el río Magdalena se encuentra con el mar Caribe. Se recorre en el tren turístico o a pie sobre el tajamar.",
		address: "Final del barrio Las Flores",
		latitude: 11.1065,
		longitude: -74.852,
		isAccessible: false,
		isFree: false,
		openingHours: "Todos los días, 7:00 a. m. – 5:00 p. m.",
	},
	{
		slug: "isla-salamanca",
		name: "Vía Parque Isla de Salamanca",
		kind: "nature",
		neighborhood: "Sitionuevo (Magdalena)",
		description:
			"Área protegida de manglares y ciénagas al otro lado del puente Pumarejo. Hogar de cientos de especies de aves migratorias y residentes.",
		address: "Kilómetro 10, vía Barranquilla – Ciénaga",
		latitude: 11.0215,
		longitude: -74.66,
		isAccessible: false,
		isFree: false,
		openingHours: "Todos los días, 8:00 a. m. – 4:00 p. m.",
	},
	{
		slug: "parque-washington",
		name: "Parque Washington",
		kind: "park",
		neighborhood: "El Prado",
		description:
			"Parque arborizado y tranquilo, con caminos para trotar, zona de mascotas y espacio para picnic bajo los árboles.",
		address: "Calle 79 con Carrera 52",
		latitude: 11.0058,
		longitude: -74.8082,
		isAccessible: true,
		isFree: true,
		openingHours: "Todos los días, 5:00 a. m. – 10:00 p. m.",
	},
	{
		slug: "zoologico-barranquilla",
		name: "Zoológico de Barranquilla",
		kind: "nature",
		neighborhood: "El Recreo",
		description:
			"Centro de conservación de fauna del Caribe colombiano, con programas de educación ambiental para familias y colegios.",
		address: "Calle 77 # 68-40",
		latitude: 11.0068,
		longitude: -74.8158,
		isAccessible: true,
		isFree: false,
		openingHours: "Martes a domingo, 9:00 a. m. – 5:00 p. m.",
	},
	{
		slug: "parque-cultural-del-caribe",
		name: "Parque Cultural del Caribe",
		kind: "culture",
		neighborhood: "Centro",
		description:
			"Plaza abierta y Museo del Caribe: exposiciones, conciertos y talleres sobre la cultura de la región.",
		address: "Calle 36 # 46-66",
		latitude: 10.9866,
		longitude: -74.782,
		isAccessible: true,
		isFree: true,
		openingHours: "Martes a domingo, 9:00 a. m. – 6:00 p. m.",
	},
	{
		slug: "casa-del-carnaval",
		name: "Casa del Carnaval",
		kind: "culture",
		neighborhood: "Barrio Abajo",
		description:
			"Sede del Carnaval de Barranquilla, patrimonio de la humanidad. Talleres de danza, música de millo y tambora durante todo el año.",
		address: "Carrera 54 # 49B-39",
		latitude: 10.9928,
		longitude: -74.784,
		isAccessible: true,
		isFree: true,
		openingHours: "Lunes a sábado, 8:00 a. m. – 6:00 p. m.",
	},
	{
		slug: "paseo-bolivar",
		name: "Paseo Bolívar",
		kind: "heritage",
		neighborhood: "Centro",
		description:
			"El corazón histórico de la ciudad: comercio, edificios republicanos y la estatua del Libertador. Punto de partida de los recorridos a pie por el centro.",
		address: "Paseo Bolívar entre Carreras 38 y 45",
		latitude: 10.9835,
		longitude: -74.779,
		isAccessible: true,
		isFree: true,
		openingHours: null,
	},
	{
		slug: "plaza-de-la-paz",
		name: "Plaza de la Paz",
		kind: "heritage",
		neighborhood: "Centro",
		description:
			"Gran plaza frente a la Catedral Metropolitana, escenario de conciertos, ferias y encuentros ciudadanos.",
		address: "Carrera 45 con Calle 53",
		latitude: 10.9878,
		longitude: -74.7889,
		isAccessible: true,
		isFree: true,
		openingHours: null,
	},
	{
		slug: "estadio-metropolitano",
		name: "Estadio Metropolitano Roberto Meléndez",
		kind: "sport",
		neighborhood: "Ciudadela 20 de Julio",
		description:
			"Casa de la Selección Colombia y del Junior. Sus alrededores tienen canchas y espacios para actividad física.",
		address: "Avenida Circunvalar con Calle 45",
		latitude: 10.9269,
		longitude: -74.8006,
		isAccessible: true,
		isFree: false,
		openingHours: null,
	},
	{
		slug: "muelle-puerto-colombia",
		name: "Muelle de Puerto Colombia",
		kind: "waterfront",
		neighborhood: "Puerto Colombia",
		description:
			"Muelle histórico restaurado frente al mar, a 20 minutos de Barranquilla. Playa, atardeceres y pescado frito.",
		address: "Malecón de Puerto Colombia",
		latitude: 11.0003,
		longitude: -74.955,
		isAccessible: true,
		isFree: true,
		openingHours: "Todos los días, 6:00 a. m. – 9:00 p. m.",
	},
];

/** Places with the stable ids used by the on-device store. */
export const PLACES: Place[] = PLACE_SEEDS.map((seed) => ({
	...seed,
	id: `place-${seed.slug}`,
}));
