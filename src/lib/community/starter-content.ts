// Starter agenda published by the platform team, so the agenda is never empty
// on day one. Dates are relative to "now". Mirrors supabase/seed-community.sql.

import { bogotaLocalToIso, isoToBogotaLocal } from "./community-rules";
import type {
	CommunityEvent,
	EventCategory,
	ForumPost,
	ForumThread,
} from "./community-types";

export const PLATFORM_ORGANIZER = "Agenda QUILLART";

interface StarterEvent {
	id: string;
	title: string;
	description: string;
	category: EventCategory;
	placeSlug: string;
	/** Days from today and Barranquilla start/end hours ("06:00"). */
	inDays: number;
	start: string;
	end: string;
	capacity: number | null;
}

const STARTER_EVENTS: StarterEvent[] = [
	{
		id: "starter-aves-mallorquin",
		title: "Avistamiento de aves al amanecer",
		description:
			"Caminata guiada por los senderos del manglar para reconocer garzas, pelícanos y aves migratorias. Lleva gorra, agua y binoculares si tienes. Punto de encuentro: entrada principal del ecoparque.",
		category: "nature",
		placeSlug: "cienaga-de-mallorquin",
		inDays: 2,
		start: "06:00",
		end: "08:30",
		capacity: 25,
	},
	{
		id: "starter-limpieza-malecon",
		title: "Jornada de limpieza del Gran Malecón",
		description:
			"Voluntariado para recoger residuos en la orilla del río y separar el material reciclable. Entregamos guantes y bolsas. Apta para familias.",
		category: "volunteer",
		placeSlug: "gran-malecon",
		inDays: 3,
		start: "07:00",
		end: "10:00",
		capacity: 60,
	},
	{
		id: "starter-millo-tambora",
		title: "Taller abierto de millo y tambora",
		description:
			"Aprende los ritmos básicos del Carnaval con maestros de Barrio Abajo. No necesitas experiencia ni instrumento: la casa los presta.",
		category: "music",
		placeSlug: "casa-del-carnaval",
		inDays: 4,
		start: "16:00",
		end: "18:00",
		capacity: 30,
	},
	{
		id: "starter-recorrido-centro",
		title: "Recorrido a pie por el Centro Histórico",
		description:
			"Dos horas caminando entre el Paseo Bolívar, el antiguo edificio de la Aduana y los almacenes republicanos, con historias de la ciudad contadas por vecinos.",
		category: "culture",
		placeSlug: "paseo-bolivar",
		inDays: 5,
		start: "08:00",
		end: "10:00",
		capacity: 20,
	},
	{
		id: "starter-picnic-washington",
		title: "Picnic vecinal y juegos tradicionales",
		description:
			"Trae algo para compartir y conoce a tus vecinos. Habrá bola de trapo, chequita y lectura de cuentos para los más pequeños.",
		category: "community",
		placeSlug: "parque-washington",
		inDays: 6,
		start: "15:00",
		end: "18:00",
		capacity: null,
	},
	{
		id: "starter-5k-malecon",
		title: "Carrera recreativa 5K por el río",
		description:
			"Recorrido de 5 km ida y vuelta por el Gran Malecón, a tu ritmo: corriendo o caminando. Hidratación en la meta.",
		category: "sport",
		placeSlug: "gran-malecon",
		inDays: 9,
		start: "06:00",
		end: "08:00",
		capacity: 300,
	},
];

function dayInBarranquilla(now: Date, inDays: number): string {
	const today = isoToBogotaLocal(now.toISOString()).slice(0, 10);
	const date = new Date(`${today}T12:00:00Z`);
	date.setUTCDate(date.getUTCDate() + inDays);
	return date.toISOString().slice(0, 10);
}

export function buildStarterEvents(
	now: Date,
	placeIdBySlug: (slug: string) => string | null,
): CommunityEvent[] {
	return STARTER_EVENTS.map((seed) => {
		const day = dayInBarranquilla(now, seed.inDays);
		return {
			id: seed.id,
			title: seed.title,
			description: seed.description,
			category: seed.category,
			startsAt: bogotaLocalToIso(`${day}T${seed.start}`) ?? now.toISOString(),
			endsAt: bogotaLocalToIso(`${day}T${seed.end}`),
			placeId: placeIdBySlug(seed.placeSlug),
			locationText: null,
			capacity: seed.capacity,
			registeredCount: 0,
			isFree: true,
			priceCop: null,
			organizerId: null,
			organizerName: PLATFORM_ORGANIZER,
			status: "published",
			moderationStatus: "published",
			triagePriority: "none",
			createdAt: now.toISOString(),
		};
	});
}

export function buildStarterForum(now: Date): {
	threads: ForumThread[];
	posts: ForumPost[];
} {
	const created = now.toISOString();
	return {
		threads: [
			{
				id: "starter-bienvenida",
				title: "Bienvenida: preséntate y cuéntanos de tu barrio",
				body: "Este es el espacio para conectar entre vecinos y con quienes nos visitan. Cuéntanos quién eres, de qué barrio vienes y qué lugar de Barranquilla le recomendarías a alguien que llega por primera vez.",
				category: "general",
				placeId: null,
				eventId: null,
				authorId: null,
				authorName: PLATFORM_ORGANIZER,
				replyCount: 0,
				lastActivityAt: created,
				moderationStatus: "published",
				triagePriority: "none",
				createdAt: created,
			},
		],
		posts: [],
	};
}
