// Interface text in the four languages. Spanish is the reference: the other
// dictionaries must have the same keys (the compiler checks it).

import type { Language } from "./languages";

const es = {
	language: {
		button: "Idioma",
		menuTitle: "Elige el idioma",
		current: "Idioma actual",
	},
	nav: {
		sections: "Secciones",
		home: "Quillart",
		agenda: "Agenda",
		forum: "Comunidad",
		places: "Lugares",
		map: "Mapa",
		profile: "Perfil",
	},
	theme: {
		toDark: "Cambiar a tema oscuro",
		toLight: "Cambiar a tema claro",
	},
	chat: {
		composerLabel: "Escríbele a Quillart",
		placeholder: "Escribe o habla con Quillart",
		listening: "Te escucho…",
		stopListening: "Dejar de escuchar",
		talk: "Hablar con Quillart",
		send: "Enviar",
		newConversation: "Nueva conversación",
		thinking: "Pensando",
		retry: "Reintentar",
	},
	home: {
		greeting: "¿Qué quieres hacer hoy en Barranquilla?",
		intro: "Planes, comunidad, lugares y reportes. Escríbeme o háblame.",
		starters: [
			"Planes para este fin de semana",
			"Quiero publicar un evento",
			"Lugares de naturaleza cerca",
			"¿Cómo llego al estadio?",
			"Reportar un arroyo o un problema",
			"¿Qué se habla en la comunidad?",
			"Mis inscripciones",
		],
		todayTitle: "Hoy en tu ciudad",
		seeAgenda: "Ver agenda",
		searching: "Buscando planes…",
		noEvents: "Todavía no hay eventos próximos. ¡Publica el primero!",
		agendaHint: "Eventos y planes",
		forumHint: "Conversaciones",
		placesHint: "Parques y naturaleza",
		mapHint: "Rutas y alertas",
	},
};

export type Messages = typeof es;

const en: Messages = {
	language: {
		button: "Language",
		menuTitle: "Choose your language",
		current: "Current language",
	},
	nav: {
		sections: "Sections",
		home: "Quillart",
		agenda: "Events",
		forum: "Community",
		places: "Places",
		map: "Map",
		profile: "Profile",
	},
	theme: {
		toDark: "Switch to dark theme",
		toLight: "Switch to light theme",
	},
	chat: {
		composerLabel: "Write to Quillart",
		placeholder: "Type or talk to Quillart",
		listening: "I'm listening…",
		stopListening: "Stop listening",
		talk: "Talk to Quillart",
		send: "Send",
		newConversation: "New conversation",
		thinking: "Thinking",
		retry: "Try again",
	},
	home: {
		greeting: "What would you like to do in Barranquilla today?",
		intro: "Plans, community, places and reports. Type or talk to me.",
		starters: [
			"Plans for this weekend",
			"I want to post an event",
			"Nature spots nearby",
			"How do I get to the stadium?",
			"Report a stream or a problem",
			"What is the community talking about?",
			"My registrations",
		],
		todayTitle: "Today in your city",
		seeAgenda: "See events",
		searching: "Looking for plans…",
		noEvents: "No upcoming events yet. Post the first one!",
		agendaHint: "Events and plans",
		forumHint: "Conversations",
		placesHint: "Parks and nature",
		mapHint: "Routes and alerts",
	},
};

const pt: Messages = {
	language: {
		button: "Idioma",
		menuTitle: "Escolha o idioma",
		current: "Idioma atual",
	},
	nav: {
		sections: "Seções",
		home: "Quillart",
		agenda: "Agenda",
		forum: "Comunidade",
		places: "Lugares",
		map: "Mapa",
		profile: "Perfil",
	},
	theme: {
		toDark: "Mudar para o tema escuro",
		toLight: "Mudar para o tema claro",
	},
	chat: {
		composerLabel: "Escreva para o Quillart",
		placeholder: "Escreva ou fale com o Quillart",
		listening: "Estou ouvindo…",
		stopListening: "Parar de ouvir",
		talk: "Falar com o Quillart",
		send: "Enviar",
		newConversation: "Nova conversa",
		thinking: "Pensando",
		retry: "Tentar de novo",
	},
	home: {
		greeting: "O que você quer fazer hoje em Barranquilla?",
		intro:
			"Programação, comunidade, lugares e denúncias. Escreva ou fale comigo.",
		starters: [
			"Programação para este fim de semana",
			"Quero publicar um evento",
			"Lugares de natureza por perto",
			"Como chego ao estádio?",
			"Relatar um arroio ou um problema",
			"Do que a comunidade está falando?",
			"Minhas inscrições",
		],
		todayTitle: "Hoje na sua cidade",
		seeAgenda: "Ver agenda",
		searching: "Procurando programação…",
		noEvents: "Ainda não há eventos próximos. Publique o primeiro!",
		agendaHint: "Eventos e programação",
		forumHint: "Conversas",
		placesHint: "Parques e natureza",
		mapHint: "Rotas e alertas",
	},
};

const fr: Messages = {
	language: {
		button: "Langue",
		menuTitle: "Choisissez la langue",
		current: "Langue actuelle",
	},
	nav: {
		sections: "Sections",
		home: "Quillart",
		agenda: "Agenda",
		forum: "Communauté",
		places: "Lieux",
		map: "Carte",
		profile: "Profil",
	},
	theme: {
		toDark: "Passer au thème sombre",
		toLight: "Passer au thème clair",
	},
	chat: {
		composerLabel: "Écrire à Quillart",
		placeholder: "Écrivez ou parlez à Quillart",
		listening: "Je vous écoute…",
		stopListening: "Arrêter l'écoute",
		talk: "Parler à Quillart",
		send: "Envoyer",
		newConversation: "Nouvelle conversation",
		thinking: "Réflexion",
		retry: "Réessayer",
	},
	home: {
		greeting: "Que voulez-vous faire aujourd'hui à Barranquilla ?",
		intro:
			"Sorties, communauté, lieux et signalements. Écrivez-moi ou parlez-moi.",
		starters: [
			"Idées pour ce week-end",
			"Je veux publier un événement",
			"Lieux de nature à proximité",
			"Comment aller au stade ?",
			"Signaler un ruisseau ou un problème",
			"De quoi parle la communauté ?",
			"Mes inscriptions",
		],
		todayTitle: "Aujourd'hui dans votre ville",
		seeAgenda: "Voir l'agenda",
		searching: "Recherche de sorties…",
		noEvents: "Aucun événement à venir pour l'instant. Publiez le premier !",
		agendaHint: "Événements et sorties",
		forumHint: "Conversations",
		placesHint: "Parcs et nature",
		mapHint: "Itinéraires et alertes",
	},
};

export const messages: Record<Language, Messages> = { es, en, pt, fr };
