// What the local agents say, in the four interface languages. Spanish is the
// reference and keeps the Caribbean tone; the others stay short and friendly.

import type { Language } from "../i18n/languages";
import type { LocalCopy } from "./local-copy-types";

function plural(count: number, one: string, many: string): string {
	return count === 1 ? `1 ${one}` : `${count} ${many}`;
}

const es: LocalCopy = {
	signIn: (reason) =>
		`${reason} Primero entra a tu cuenta o créala, es rapidito.`,
	signInLabel: "Entrar o crear cuenta",
	reasons: {
		createEvent: "Para publicar un evento necesitas una cuenta.",
		register: "Para inscribirte necesitas una cuenta.",
		forum: "Para escribir en el foro necesitas una cuenta.",
		report: "Para enviar el reporte necesitas una cuenta.",
		notSignedIn: "Aún no has entrado a tu cuenta.",
	},
	needAccount:
		"Para eso necesitas entrar a tu cuenta. Entra o créala y seguimos.",
	createEvent:
		"¡Qué buena! Llena el formulario con el nombre, la fecha y el lugar; antes de publicarse pasa por una revisión rápida.",
	createEventLabel: "Publicar un evento",
	confirmUnregister:
		"Va, te ayudo a cancelar esa inscripción. Confírmame abajo.",
	confirmRegister: "¡De una! Confírmame abajo y te inscribo.",
	whichToLeave: "Dime de cuál plan te quieres salir y te ayudo.",
	searchEvents: (category) =>
		`Déjame buscar ${category ? `planes de ${category.toLowerCase()}` : "planes"} para ti.`,
	newThread:
		"Abre una conversación nueva: cuéntale a la comunidad tu tema con respeto y pasa por moderación antes de salir.",
	newThreadLabel: "Abrir conversación",
	listThreads: "Mira de qué se está hablando en la comunidad.",
	directionsTo: (place) => `Te muestro cómo llegar a ${place}.`,
	aboutPlace: (place) => `Te cuento de ${place}.`,
	listPlaces: "Estos son lugares de la ciudad que te pueden gustar.",
	routeFromMalecon: "Te armo la ruta desde el Gran Malecón.",
	whereTo:
		"¿Pa' dónde vas? Te ayudo con el estadio, Barrio Abajo, el centro o cualquier lugar del mapa.",
	mapLabel: "Ver el mapa",
	emergency: "Si alguien está en peligro, llama ya a la Línea 123.",
	reportReady:
		"Preparé tu reporte para la ciudad; revísalo y confírmalo abajo.",
	profile: "Ahí puedes ver y editar tu perfil.",
	profileLabel: "Ir a mi perfil",
	myRegistrations: "Te muestro los planes en los que estás inscrito.",
	wrapUp: {
		failed: "Uy, no se pudo completar. ¿Probamos de otra forma?",
		held: "Quedó en revisión: un moderador lo mira pronto y te avisamos.",
		rejected: "No se publicó porque no cumple las normas de la comunidad.",
		declined: "Listo, no hice nada. ¿Te ayudo con otra cosa?",
		eventsNone: "No encontré planes con eso. ¿Probamos otra fecha o categoría?",
		eventsSome: "Aquí tienes los planes que encontré.",
		eventsCount: (count) =>
			`Encontré ${plural(count, "plan", "planes")}. ¿Te inscribo en alguno?`,
		eventDetails: "Aquí tienes los detalles del evento.",
		registrationsNone:
			"Todavía no estás inscrito en ningún plan. ¿Buscamos uno?",
		registrationsSome: "Estas son tus inscripciones.",
		registrationsCount: (count) =>
			`Tienes ${plural(count, "inscripción", "inscripciones")}.`,
		placesNone: "No encontré lugares con eso. ¿Busco de otro tipo?",
		placesSome: "Estos son los lugares que encontré.",
		placesCount: (count) =>
			`Encontré ${plural(count, "lugar", "lugares")} para ti.`,
		placeInfo: (name) =>
			name
				? `Aquí tienes la info de ${name}.`
				: "Aquí tienes la info del lugar.",
		directions: "Aquí tienes cómo llegar.",
		threadsNone: "Todavía no hay conversaciones de eso. ¿Abres una?",
		threadsSome: "Estas son las conversaciones de la comunidad.",
		threadsCount: (count) =>
			`Encontré ${plural(count, "conversación", "conversaciones")}.`,
		floodAlert:
			"Ojo: hay alerta de arroyo en la ruta. Nunca cruces un arroyo crecido.",
		route: "Esta es la ruta sugerida por el corredor verde.",
		alreadyRegistered: "Ya estabas inscrito en ese plan. ¡Nos vemos allá!",
		registered: "¡Listo, quedaste inscrito! Te esperamos.",
		unregistered: "Listo, cancelé tu inscripción.",
		eventPublished: "¡Listo, tu evento quedó publicado!",
		threadPublished: "¡Listo, tu conversación quedó publicada!",
		replyPublished: "¡Listo, tu respuesta quedó publicada!",
		reportSent:
			"Listo, tu reporte llegó a la ciudad y quedó en el foro. ¡Gracias por avisar!",
		fallback: "Listo. ¿Te ayudo con algo más?",
	},
};

const en: LocalCopy = {
	signIn: (reason) => `${reason} Sign in or create one first, it's quick.`,
	signInLabel: "Sign in or create an account",
	reasons: {
		createEvent: "You need an account to publish an event.",
		register: "You need an account to register.",
		forum: "You need an account to write in the forum.",
		report: "You need an account to send the report.",
		notSignedIn: "You haven't signed in yet.",
	},
	needAccount:
		"You need to sign in for that. Sign in or create an account and we'll continue.",
	createEvent:
		"Great! Fill in the form with the name, date and place; it gets a quick review before it's published.",
	createEventLabel: "Publish an event",
	confirmUnregister:
		"Sure, I'll help you cancel that registration. Confirm below.",
	confirmRegister: "Sure! Confirm below and I'll register you.",
	whichToLeave: "Tell me which plan you want to leave and I'll help.",
	searchEvents: (category) =>
		`Let me look for ${category ? `${category.toLowerCase()} plans` : "plans"} for you.`,
	newThread:
		"Start a new conversation: tell the community your topic respectfully; it goes through moderation before it's posted.",
	newThreadLabel: "Start a conversation",
	listThreads: "Here's what people are talking about in the community.",
	directionsTo: (place) => `Here's how to get to ${place}.`,
	aboutPlace: (place) => `Here's what ${place} is like.`,
	listPlaces: "Here are some places in the city you may like.",
	routeFromMalecon: "I'll plan the route from the Gran Malecón.",
	whereTo:
		"Where are you headed? I can help with the stadium, Barrio Abajo, downtown or any place on the map.",
	mapLabel: "View the map",
	emergency: "If someone is in danger, call Línea 123 now.",
	reportReady:
		"I prepared your report for the city; check it and confirm below.",
	profile: "There you can see and edit your profile.",
	profileLabel: "Go to my profile",
	myRegistrations: "Here are the plans you're registered for.",
	wrapUp: {
		failed: "Oops, that couldn't be completed. Shall we try another way?",
		held: "It's under review: a moderator will look at it soon and we'll let you know.",
		rejected:
			"It wasn't published because it doesn't follow the community rules.",
		declined: "Okay, I didn't do anything. Can I help with something else?",
		eventsNone:
			"I didn't find plans for that. Shall we try another date or category?",
		eventsSome: "Here are the plans I found.",
		eventsCount: (count) =>
			`I found ${plural(count, "plan", "plans")}. Shall I register you for one?`,
		eventDetails: "Here are the event details.",
		registrationsNone:
			"You're not registered for any plan yet. Shall we look for one?",
		registrationsSome: "These are your registrations.",
		registrationsCount: (count) =>
			`You have ${plural(count, "registration", "registrations")}.`,
		placesNone: "I didn't find places for that. Shall I look for another kind?",
		placesSome: "Here are the places I found.",
		placesCount: (count) =>
			`I found ${plural(count, "place", "places")} for you.`,
		placeInfo: (name) =>
			name
				? `Here's the info about ${name}.`
				: "Here's the info about the place.",
		directions: "Here's how to get there.",
		threadsNone:
			"There are no conversations about that yet. Want to start one?",
		threadsSome: "These are the community conversations.",
		threadsCount: (count) =>
			`I found ${plural(count, "conversation", "conversations")}.`,
		floodAlert:
			"Heads up: there's a flash-flood (arroyo) alert on the route. Never cross a flooded street.",
		route: "This is the suggested route along the green corridor.",
		alreadyRegistered:
			"You were already registered for that plan. See you there!",
		registered: "Done, you're registered! See you there.",
		unregistered: "Done, I cancelled your registration.",
		eventPublished: "Done, your event is published!",
		threadPublished: "Done, your conversation is published!",
		replyPublished: "Done, your reply is published!",
		reportSent:
			"Done, your report reached the city and is on the forum. Thanks for letting us know!",
		fallback: "Done. Can I help with anything else?",
	},
};

const pt: LocalCopy = {
	signIn: (reason) =>
		`${reason} Primeiro entre na sua conta ou crie uma, é rapidinho.`,
	signInLabel: "Entrar ou criar conta",
	reasons: {
		createEvent: "Para publicar um evento você precisa de uma conta.",
		register: "Para se inscrever você precisa de uma conta.",
		forum: "Para escrever no fórum você precisa de uma conta.",
		report: "Para enviar o relato você precisa de uma conta.",
		notSignedIn: "Você ainda não entrou na sua conta.",
	},
	needAccount:
		"Para isso você precisa entrar na sua conta. Entre ou crie uma e seguimos.",
	createEvent:
		"Que legal! Preencha o formulário com o nome, a data e o lugar; antes de publicar passa por uma revisão rápida.",
	createEventLabel: "Publicar um evento",
	confirmUnregister:
		"Certo, eu te ajudo a cancelar essa inscrição. Confirme abaixo.",
	confirmRegister: "Claro! Confirme abaixo e eu te inscrevo.",
	whichToLeave: "Diga de qual plano você quer sair e eu te ajudo.",
	searchEvents: (category) =>
		`Vou procurar ${category ? `planos de ${category.toLowerCase()}` : "planos"} para você.`,
	newThread:
		"Abra uma conversa nova: conte seu tema à comunidade com respeito; passa por moderação antes de sair.",
	newThreadLabel: "Abrir conversa",
	listThreads: "Veja do que se está falando na comunidade.",
	directionsTo: (place) => `Eu te mostro como chegar a ${place}.`,
	aboutPlace: (place) => `Eu te conto sobre ${place}.`,
	listPlaces: "Estes são lugares da cidade de que você pode gostar.",
	routeFromMalecon: "Vou montar a rota a partir do Gran Malecón.",
	whereTo:
		"Para onde você vai? Posso ajudar com o estádio, Barrio Abajo, o centro ou qualquer lugar do mapa.",
	mapLabel: "Ver o mapa",
	emergency: "Se alguém estiver em perigo, ligue já para a Línea 123.",
	reportReady: "Preparei seu relato para a cidade; revise e confirme abaixo.",
	profile: "Aí você pode ver e editar seu perfil.",
	profileLabel: "Ir para meu perfil",
	myRegistrations: "Eu te mostro os planos em que você está inscrito.",
	wrapUp: {
		failed: "Opa, não deu para concluir. Tentamos de outro jeito?",
		held: "Ficou em revisão: um moderador vai olhar em breve e te avisamos.",
		rejected: "Não foi publicado porque não cumpre as normas da comunidade.",
		declined: "Certo, não fiz nada. Posso te ajudar com outra coisa?",
		eventsNone:
			"Não encontrei planos com isso. Tentamos outra data ou categoria?",
		eventsSome: "Aqui estão os planos que encontrei.",
		eventsCount: (count) =>
			`Encontrei ${plural(count, "plano", "planos")}. Quer que eu te inscreva em algum?`,
		eventDetails: "Aqui estão os detalhes do evento.",
		registrationsNone:
			"Você ainda não está inscrito em nenhum plano. Procuramos um?",
		registrationsSome: "Estas são suas inscrições.",
		registrationsCount: (count) =>
			`Você tem ${plural(count, "inscrição", "inscrições")}.`,
		placesNone: "Não encontrei lugares com isso. Procuro de outro tipo?",
		placesSome: "Estes são os lugares que encontrei.",
		placesCount: (count) =>
			`Encontrei ${plural(count, "lugar", "lugares")} para você.`,
		placeInfo: (name) =>
			name
				? `Aqui está a informação de ${name}.`
				: "Aqui está a informação do lugar.",
		directions: "Aqui está como chegar.",
		threadsNone: "Ainda não há conversas sobre isso. Quer abrir uma?",
		threadsSome: "Estas são as conversas da comunidade.",
		threadsCount: (count) =>
			`Encontrei ${plural(count, "conversa", "conversas")}.`,
		floodAlert:
			"Atenção: há alerta de arroio (enxurrada) na rota. Nunca atravesse uma rua alagada.",
		route: "Esta é a rota sugerida pelo corredor verde.",
		alreadyRegistered: "Você já estava inscrito nesse plano. Nos vemos lá!",
		registered: "Pronto, você está inscrito! Te esperamos.",
		unregistered: "Pronto, cancelei sua inscrição.",
		eventPublished: "Pronto, seu evento foi publicado!",
		threadPublished: "Pronto, sua conversa foi publicada!",
		replyPublished: "Pronto, sua resposta foi publicada!",
		reportSent:
			"Pronto, seu relato chegou à cidade e ficou no fórum. Obrigado por avisar!",
		fallback: "Pronto. Posso te ajudar com mais alguma coisa?",
	},
};

const fr: LocalCopy = {
	signIn: (reason) =>
		`${reason} Connecte-toi ou crée un compte d'abord, c'est rapide.`,
	signInLabel: "Se connecter ou créer un compte",
	reasons: {
		createEvent: "Pour publier un événement, il te faut un compte.",
		register: "Pour t'inscrire, il te faut un compte.",
		forum: "Pour écrire sur le forum, il te faut un compte.",
		report: "Pour envoyer le signalement, il te faut un compte.",
		notSignedIn: "Tu n'es pas encore connecté à ton compte.",
	},
	needAccount:
		"Pour cela, tu dois te connecter à ton compte. Connecte-toi ou crée-le et on continue.",
	createEvent:
		"Super ! Remplis le formulaire avec le nom, la date et le lieu ; il passe par une vérification rapide avant d'être publié.",
	createEventLabel: "Publier un événement",
	confirmUnregister:
		"D'accord, je t'aide à annuler cette inscription. Confirme ci-dessous.",
	confirmRegister: "Avec plaisir ! Confirme ci-dessous et je t'inscris.",
	whichToLeave: "Dis-moi de quelle sortie tu veux te désinscrire et je t'aide.",
	searchEvents: (category) =>
		`Je cherche des sorties${category ? ` ${category.toLowerCase()}` : ""} pour toi.`,
	newThread:
		"Ouvre une nouvelle conversation : présente ton sujet à la communauté avec respect ; elle passe par la modération avant d'être publiée.",
	newThreadLabel: "Ouvrir une conversation",
	listThreads: "Voici de quoi on parle dans la communauté.",
	directionsTo: (place) => `Je te montre comment aller à ${place}.`,
	aboutPlace: (place) => `Je te parle de ${place}.`,
	listPlaces: "Voici des lieux de la ville qui pourraient te plaire.",
	routeFromMalecon: "Je te prépare l'itinéraire depuis le Gran Malecón.",
	whereTo:
		"Tu vas où ? Je peux t'aider pour le stade, Barrio Abajo, le centre ou n'importe quel lieu de la carte.",
	mapLabel: "Voir la carte",
	emergency: "Si quelqu'un est en danger, appelle tout de suite la Línea 123.",
	reportReady:
		"J'ai préparé ton signalement pour la ville ; vérifie-le et confirme ci-dessous.",
	profile: "Là, tu peux voir et modifier ton profil.",
	profileLabel: "Aller à mon profil",
	myRegistrations: "Je te montre les sorties auxquelles tu es inscrit.",
	wrapUp: {
		failed: "Oups, ça n'a pas pu aboutir. On essaie autrement ?",
		held: "C'est en cours de vérification : un modérateur va regarder bientôt et on te prévient.",
		rejected:
			"Ça n'a pas été publié parce que ça ne respecte pas les règles de la communauté.",
		declined: "D'accord, je n'ai rien fait. Je peux t'aider avec autre chose ?",
		eventsNone:
			"Je n'ai pas trouvé de sorties pour ça. On essaie une autre date ou catégorie ?",
		eventsSome: "Voici les sorties que j'ai trouvées.",
		eventsCount: (count) =>
			`J'ai trouvé ${plural(count, "sortie", "sorties")}. Je t'inscris à l'une d'elles ?`,
		eventDetails: "Voici les détails de l'événement.",
		registrationsNone:
			"Tu n'es encore inscrit à aucune sortie. On en cherche une ?",
		registrationsSome: "Voici tes inscriptions.",
		registrationsCount: (count) =>
			`Tu as ${plural(count, "inscription", "inscriptions")}.`,
		placesNone:
			"Je n'ai pas trouvé de lieux pour ça. J'en cherche d'un autre type ?",
		placesSome: "Voici les lieux que j'ai trouvés.",
		placesCount: (count) =>
			`J'ai trouvé ${plural(count, "lieu", "lieux")} pour toi.`,
		placeInfo: (name) =>
			name ? `Voici les infos sur ${name}.` : "Voici les infos sur le lieu.",
		directions: "Voici comment y aller.",
		threadsNone:
			"Il n'y a pas encore de conversations là-dessus. Tu en ouvres une ?",
		threadsSome: "Voici les conversations de la communauté.",
		threadsCount: (count) =>
			`J'ai trouvé ${plural(count, "conversation", "conversations")}.`,
		floodAlert:
			"Attention : alerte de crue (arroyo) sur l'itinéraire. Ne traverse jamais une rue inondée.",
		route: "Voici l'itinéraire conseillé par le corridor vert.",
		alreadyRegistered:
			"Tu étais déjà inscrit à cette sortie. À bientôt là-bas !",
		registered: "C'est fait, tu es inscrit ! On t'attend.",
		unregistered: "C'est fait, j'ai annulé ton inscription.",
		eventPublished: "C'est fait, ton événement est publié !",
		threadPublished: "C'est fait, ta conversation est publiée !",
		replyPublished: "C'est fait, ta réponse est publiée !",
		reportSent:
			"C'est fait, ton signalement est arrivé à la ville et figure sur le forum. Merci de nous avoir prévenus !",
		fallback: "C'est fait. Je peux t'aider avec autre chose ?",
	},
};

export const LOCAL_COPY: Record<Language, LocalCopy> = { es, en, pt, fr };

/** The copy for the person's language; Spanish when none was sent. */
export function localCopy(language: Language | undefined): LocalCopy {
	return LOCAL_COPY[language ?? "es"];
}
