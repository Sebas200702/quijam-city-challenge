// notifications text in the four languages: the arroyo alert as a system
// notification and the in-context request to allow it. Spanish is the
// reference: es, en, pt and fr must have the same keys (the compiler and
// messages.test.ts check it).

import type { Language } from "../languages";

const es = {
	enable: "Avisarme con una notificación",
	enabled:
		"Te avisaremos de arroyos con una notificación mientras la app esté abierta.",
	floodSoon: (minutes: number) => `Arroyo activo en ${minutes} min`,
	floodNow: "Arroyo activo ahora",
	floodBody: (zone: string) =>
		`En ${zone}. No cruces calles con agua. Toca para ver rutas seguras.`,
	floodBodyNoZone: "No cruces calles con agua. Toca para ver rutas seguras.",
};

export type NotificationsMessages = typeof es;

const en: NotificationsMessages = {
	enable: "Notify me",
	enabled: "We will notify you about arroyos while the app is open.",
	floodSoon: (minutes) => `Active arroyo in ${minutes} min`,
	floodNow: "Active arroyo now",
	floodBody: (zone) =>
		`In ${zone}. Do not cross flooded streets. Tap to see safe routes.`,
	floodBodyNoZone: "Do not cross flooded streets. Tap to see safe routes.",
};

const pt: NotificationsMessages = {
	enable: "Avisar-me com uma notificação",
	enabled: "Vamos avisar você sobre arroios enquanto o app estiver aberto.",
	floodSoon: (minutes) => `Arroio ativo em ${minutes} min`,
	floodNow: "Arroio ativo agora",
	floodBody: (zone) =>
		`Em ${zone}. Não atravesse ruas alagadas. Toque para ver rotas seguras.`,
	floodBodyNoZone: "Não atravesse ruas alagadas. Toque para ver rotas seguras.",
};

const fr: NotificationsMessages = {
	enable: "M'avertir par une notification",
	enabled:
		"Nous vous avertirons des ruisseaux en alerte tant que l'application est ouverte.",
	floodSoon: (minutes) => `Ruisseau en alerte dans ${minutes} min`,
	floodNow: "Ruisseau en alerte maintenant",
	floodBody: (zone) =>
		`À ${zone}. Ne traversez pas les rues inondées. Touchez pour voir les itinéraires sûrs.`,
	floodBodyNoZone:
		"Ne traversez pas les rues inondées. Touchez pour voir les itinéraires sûrs.",
};

export const notifications: Record<Language, NotificationsMessages> = {
	es,
	en,
	pt,
	fr,
};
