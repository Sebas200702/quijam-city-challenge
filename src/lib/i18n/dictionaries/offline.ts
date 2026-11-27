// offline text in the four languages: the page shown without network and the
// installed app. Spanish is the reference: es, en, pt and fr must have the
// same keys (the compiler and messages.test.ts check it).

import type { Language } from "../languages";

const es = {
	pageTitle: "Sin conexión · QUILLART",
	title: "Estás sin conexión",
	text: "Esta página todavía no está guardada en tu teléfono. Estas sí abren sin red:",
	retry: "Reintentar",
};

export type OfflineMessages = typeof es;

const en: OfflineMessages = {
	pageTitle: "Offline · QUILLART",
	title: "You are offline",
	text: "This page is not saved on your phone yet. These ones open without a connection:",
	retry: "Try again",
};

const pt: OfflineMessages = {
	pageTitle: "Sem conexão · QUILLART",
	title: "Você está sem conexão",
	text: "Esta página ainda não está salva no seu celular. Estas abrem sem internet:",
	retry: "Tentar de novo",
};

const fr: OfflineMessages = {
	pageTitle: "Hors ligne · QUILLART",
	title: "Vous êtes hors ligne",
	text: "Cette page n'est pas encore enregistrée sur votre téléphone. Celles-ci s'ouvrent sans connexion :",
	retry: "Réessayer",
};

export const offline: Record<Language, OfflineMessages> = { es, en, pt, fr };
