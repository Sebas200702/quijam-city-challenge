// Interface text in the four languages. Spanish is the reference: the other
// dictionaries must have the same keys (the compiler checks it).

import { agenda } from "./dictionaries/agenda";
import { cityMfa } from "./dictionaries/city-mfa";
import { dock } from "./dictionaries/dock";
import { forum } from "./dictionaries/forum";
import { guide } from "./dictionaries/guide";
import { host } from "./dictionaries/host";
import { inbox } from "./dictionaries/inbox";
import { landing } from "./dictionaries/landing";
import { map } from "./dictionaries/map";
import { notifications } from "./dictionaries/notifications";
import { offline } from "./dictionaries/offline";
import { places } from "./dictionaries/places";
import { profile } from "./dictionaries/profile";
import { reports } from "./dictionaries/reports";
import { shared } from "./dictionaries/shared";
import { timeline } from "./dictionaries/timeline";
import type { Language } from "./languages";

const es = {
	nav: {
		sections: "Secciones",
		home: "Quillart",
		agenda: "Agenda",
		forum: "Comunidad",
		places: "Lugares",
		map: "Mapa",
		profile: "Perfil",
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
		connectionError:
			"Uy, no pude conectarme ahora mismo. Revisa tu conexión e inténtalo otra vez.",
		readAloud: "Leer respuestas en voz alta",
		viewPost: "Ver publicación",
		routeEyebrow: "Ruta sugerida",
		viewRoute: "Ver la ruta en el mapa",
		micPermission: "Necesitamos permiso para usar el micrófono.",
		noMic: "No encontramos un micrófono.",
		needsInternet: "El dictado por voz necesita internet.",
		couldNotListen: "No pudimos escucharte. Escribe tu mensaje.",
		micFailed: "No pudimos activar el micrófono.",
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
		upcomingTitle: "Próximos planes",
		seeAgenda: "Ver agenda",
		searching: "Buscando planes…",
		noEvents: "Todavía no hay eventos próximos. ¡Publica el primero!",
		agendaHint: "Eventos y planes",
		forumHint: "Conversaciones",
		placesHint: "Parques y naturaleza",
		mapHint: "Rutas y alertas",
	},
};

type BaseMessages = typeof es;

/** The shell text above plus one dictionary per page (see ./dictionaries). */
export type Messages = BaseMessages & {
	landing: (typeof landing)[Language];
	agenda: (typeof agenda)[Language];
	forum: (typeof forum)[Language];
	places: (typeof places)[Language];
	map: (typeof map)[Language];
	offline: (typeof offline)[Language];
	notifications: (typeof notifications)[Language];
	guide: (typeof guide)[Language];
	host: (typeof host)[Language];
	profile: (typeof profile)[Language];
	reports: (typeof reports)[Language];
	inbox: (typeof inbox)[Language];
	shared: (typeof shared)[Language];
	timeline: (typeof timeline)[Language];
	cityMfa: (typeof cityMfa)[Language];
	dock: (typeof dock)[Language];
};

const en: BaseMessages = {
	nav: {
		sections: "Sections",
		home: "Quillart",
		agenda: "Events",
		forum: "Community",
		places: "Places",
		map: "Map",
		profile: "Profile",
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
		connectionError:
			"Oops, I could not connect right now. Check your connection and try again.",
		readAloud: "Read answers aloud",
		viewPost: "View post",
		routeEyebrow: "Suggested route",
		viewRoute: "See the route on the map",
		micPermission: "We need permission to use the microphone.",
		noMic: "We could not find a microphone.",
		needsInternet: "Voice dictation needs an internet connection.",
		couldNotListen: "We could not hear you. Type your message.",
		micFailed: "We could not turn on the microphone.",
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
		upcomingTitle: "Upcoming plans",
		seeAgenda: "See events",
		searching: "Looking for plans…",
		noEvents: "No upcoming events yet. Post the first one!",
		agendaHint: "Events and plans",
		forumHint: "Conversations",
		placesHint: "Parks and nature",
		mapHint: "Routes and alerts",
	},
};

const pt: BaseMessages = {
	nav: {
		sections: "Seções",
		home: "Quillart",
		agenda: "Agenda",
		forum: "Comunidade",
		places: "Lugares",
		map: "Mapa",
		profile: "Perfil",
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
		connectionError:
			"Ops, não consegui me conectar agora. Verifique sua conexão e tente de novo.",
		readAloud: "Ler respostas em voz alta",
		viewPost: "Ver publicação",
		routeEyebrow: "Rota sugerida",
		viewRoute: "Ver a rota no mapa",
		micPermission: "Precisamos de permissão para usar o microfone.",
		noMic: "Não encontramos um microfone.",
		needsInternet: "O ditado por voz precisa de internet.",
		couldNotListen: "Não conseguimos ouvir você. Escreva sua mensagem.",
		micFailed: "Não conseguimos ativar o microfone.",
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
		upcomingTitle: "Próxima programação",
		seeAgenda: "Ver agenda",
		searching: "Procurando programação…",
		noEvents: "Ainda não há eventos próximos. Publique o primeiro!",
		agendaHint: "Eventos e programação",
		forumHint: "Conversas",
		placesHint: "Parques e natureza",
		mapHint: "Rotas e alertas",
	},
};

const fr: BaseMessages = {
	nav: {
		sections: "Sections",
		home: "Quillart",
		agenda: "Agenda",
		forum: "Communauté",
		places: "Lieux",
		map: "Carte",
		profile: "Profil",
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
		connectionError:
			"Oups, je n’ai pas pu me connecter. Vérifiez votre connexion et réessayez.",
		readAloud: "Lire les réponses à voix haute",
		viewPost: "Voir la publication",
		routeEyebrow: "Itinéraire suggéré",
		viewRoute: "Voir l’itinéraire sur la carte",
		micPermission:
			"Nous avons besoin de l’autorisation d’utiliser le microphone.",
		noMic: "Nous n’avons pas trouvé de microphone.",
		needsInternet: "La dictée vocale nécessite internet.",
		couldNotListen: "Nous n’avons pas pu vous entendre. Écrivez votre message.",
		micFailed: "Nous n’avons pas pu activer le microphone.",
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
		upcomingTitle: "Prochaines sorties",
		seeAgenda: "Voir l'agenda",
		searching: "Recherche de sorties…",
		noEvents: "Aucun événement à venir pour l'instant. Publiez le premier !",
		agendaHint: "Événements et sorties",
		forumHint: "Conversations",
		placesHint: "Parcs et nature",
		mapHint: "Itinéraires et alertes",
	},
};

const base: Record<Language, BaseMessages> = { es, en, pt, fr };

function build(language: Language): Messages {
	return {
		...base[language],
		landing: landing[language],
		agenda: agenda[language],
		forum: forum[language],
		places: places[language],
		map: map[language],
		offline: offline[language],
		notifications: notifications[language],
		guide: guide[language],
		host: host[language],
		profile: profile[language],
		reports: reports[language],
		inbox: inbox[language],
		shared: shared[language],
		timeline: timeline[language],
		cityMfa: cityMfa[language],
		dock: dock[language],
	};
}

export const messages: Record<Language, Messages> = {
	es: build("es"),
	en: build("en"),
	pt: build("pt"),
	fr: build("fr"),
};
