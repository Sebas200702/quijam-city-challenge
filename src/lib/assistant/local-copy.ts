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
	actionKept:
		"Te dejé la acción lista con el texto exacto. Entra a tu cuenta o créala para confirmarla; cuando vuelvas, sigue aquí.",
	uiDone: "Listo, ya lo tienes en pantalla.",
	createEvent:
		"¡Qué buena! Llena el formulario con el nombre, la fecha y el lugar; se publica al enviarlo y, si el sistema detecta algo, pasa a revisión.",
	createEventLabel: "Publicar un evento",
	eventDrafted:
		"Te armé el evento con lo que me dijiste: revisa el texto exacto y confírmalo abajo. Se publica al confirmar; si el sistema detecta algo, pasa a revisión.",
	eventFormFilled:
		"Te dejé el formulario lleno con lo que me dijiste; complétalo con la fecha y la hora y publícalo.",
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
	fareReportReady:
		"Te dejé el reporte de cobro casi listo: revisa el tramo y el monto y envíalo.",
	fareReportLabel: "Reportar el cobro",
	profile: "Ahí puedes ver y editar tu perfil.",
	profileLabel: "Ir a mi perfil",
	myRegistrations: "Te muestro los planes en los que estás inscrito.",
	fares: "Te busco las tarifas vigentes del Transmetro, el bus y el taxi.",
	news: "Te cuento las novedades de la ciudad.",
	openData: "Te muestro los datos abiertos de la ciudad.",
	indicators: "Te traigo los indicadores de la ciudad.",
	openDataLabel: "Ver datos abiertos",
	app: {
		languageSet: "Listo, ahora te hablo en español.",
		themeDark: "Listo, activé el modo oscuro.",
		themeLight: "Listo, activé el modo claro.",
		back: "Listo, volvemos a la pantalla anterior.",
		opening: (label) => `Listo, aquí tienes: ${label}.`,
		screens: {
			inicio: "Inicio",
			agenda: "Agenda",
			foro: "Foro",
			lugares: "Lugares",
			mapa: "Mapa",
			reportar: "Reportar",
			perfil: "Mi perfil",
			pasaporte: "Pasaporte",
			jerga: "Jerga costeña",
			datos: "Datos abiertos",
		},
		onMap: (place) => `Te muestro ${place} en el mapa.`,
		slang: "Te explico qué significa en Barranquilla.",
	},
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
		fares: (list) => `Tarifas vigentes en pesos: ${list}.`,
		news: (alerts, events) =>
			`${alerts === 0 ? "No hay alertas de arroyo activas" : `Hay ${plural(alerts, "alerta de arroyo activa", "alertas de arroyo activas")}`} y ${plural(events, "evento nuevo", "eventos nuevos")} en la agenda.`,
		openDataCatalog: (count) =>
			`El portal tiene ${plural(count, "conjunto de datos", "conjuntos de datos")}.`,
		openDataRecords: (count) =>
			`Este conjunto tiene ${plural(count, "registro", "registros")}.`,
		indicators: (list) => `Indicadores de la ciudad: ${list}.`,
		slang: (list) => `Así se dice en Barranquilla: ${list}`,
		slangNone:
			"No encontré esa palabra en el glosario; échale un ojo a la jerga completa.",
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
	actionKept:
		"I left the action ready with the exact text. Sign in or create an account to confirm it; when you come back, it will be right here.",
	uiDone: "Done, it's on your screen.",
	createEvent:
		"Great! Fill in the form with the name, date and place; it goes live when you send it and, if the system flags something, it goes to review.",
	createEventLabel: "Publish an event",
	eventDrafted:
		"I put the event together from what you told me: check the exact text and confirm it below. It goes live when you confirm; if the system flags something, it goes to review.",
	eventFormFilled:
		"I filled in the form with what you told me; add the date and time and publish it.",
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
	fareReportReady:
		"I left the fare report almost ready: check the route and the amount and send it.",
	fareReportLabel: "Report the fare",
	profile: "There you can see and edit your profile.",
	profileLabel: "Go to my profile",
	myRegistrations: "Here are the plans you're registered for.",
	fares: "Let me look up the current Transmetro, bus and taxi fares.",
	news: "Here is what's new in the city.",
	openData: "Here is the city's open data.",
	indicators: "Here are the city indicators.",
	openDataLabel: "View open data",
	app: {
		languageSet: "Done, I'll talk to you in English now.",
		themeDark: "Done, dark mode is on.",
		themeLight: "Done, light mode is on.",
		back: "Okay, going back to the previous screen.",
		opening: (label) => `Here you go: ${label}.`,
		screens: {
			inicio: "Home",
			agenda: "Agenda",
			foro: "Forum",
			lugares: "Places",
			mapa: "Map",
			reportar: "Report",
			perfil: "My profile",
			pasaporte: "Passport",
			jerga: "Costeño slang",
			datos: "Open data",
		},
		onMap: (place) => `Here's ${place} on the map.`,
		slang: "Here's what it means in Barranquilla.",
	},
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
		fares: (list) => `Current fares in pesos: ${list}.`,
		news: (alerts, events) =>
			`${alerts === 0 ? "No active arroyo alerts" : plural(alerts, "active arroyo alert", "active arroyo alerts")} and ${plural(events, "new event", "new events")} on the agenda.`,
		openDataCatalog: (count) =>
			`The portal has ${plural(count, "dataset", "datasets")}.`,
		openDataRecords: (count) =>
			`This dataset has ${plural(count, "record", "records")}.`,
		indicators: (list) => `City indicators: ${list}.`,
		slang: (list) => `As we say in Barranquilla: ${list}`,
		slangNone:
			"I couldn't find that word in the glossary; have a look at the full slang list.",
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
	actionKept:
		"Deixei a ação pronta com o texto exato. Entre na sua conta ou crie uma para confirmá-la; quando voltar, ela estará aqui.",
	uiDone: "Pronto, já está na sua tela.",
	createEvent:
		"Que legal! Preencha o formulário com o nome, a data e o lugar; é publicado ao enviar e, se o sistema detectar algo, passa por revisão.",
	createEventLabel: "Publicar um evento",
	eventDrafted:
		"Montei o evento com o que você me disse: revise o texto exato e confirme abaixo. Ele é publicado ao confirmar; se o sistema detectar algo, passa por revisão.",
	eventFormFilled:
		"Deixei o formulário preenchido com o que você me disse; complete a data e a hora e publique.",
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
	fareReportReady:
		"Deixei o relato de cobrança quase pronto: revise o trajeto e o valor e envie.",
	fareReportLabel: "Relatar a cobrança",
	profile: "Aí você pode ver e editar seu perfil.",
	profileLabel: "Ir para meu perfil",
	myRegistrations: "Eu te mostro os planos em que você está inscrito.",
	fares: "Vou buscar as tarifas atuais do Transmetro, do ônibus e do táxi.",
	news: "Eu te conto as novidades da cidade.",
	openData: "Eu te mostro os dados abertos da cidade.",
	indicators: "Aqui estão os indicadores da cidade.",
	openDataLabel: "Ver dados abertos",
	app: {
		languageSet: "Pronto, agora falo com você em português.",
		themeDark: "Pronto, ativei o modo escuro.",
		themeLight: "Pronto, ativei o modo claro.",
		back: "Certo, voltando à tela anterior.",
		opening: (label) => `Pronto, aqui está: ${label}.`,
		screens: {
			inicio: "Início",
			agenda: "Agenda",
			foro: "Fórum",
			lugares: "Lugares",
			mapa: "Mapa",
			reportar: "Relatar",
			perfil: "Meu perfil",
			pasaporte: "Passaporte",
			jerga: "Gíria costeña",
			datos: "Dados abertos",
		},
		onMap: (place) => `Eu te mostro ${place} no mapa.`,
		slang: "Eu te explico o que significa em Barranquilla.",
	},
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
		fares: (list) => `Tarifas atuais em pesos: ${list}.`,
		news: (alerts, events) =>
			`${alerts === 0 ? "Não há alertas de arroyo ativos" : plural(alerts, "alerta de arroyo ativo", "alertas de arroyo ativos")} e ${plural(events, "evento novo", "eventos novos")} na agenda.`,
		openDataCatalog: (count) =>
			`O portal tem ${plural(count, "conjunto de dados", "conjuntos de dados")}.`,
		openDataRecords: (count) =>
			`Este conjunto tem ${plural(count, "registro", "registros")}.`,
		indicators: (list) => `Indicadores da cidade: ${list}.`,
		slang: (list) => `Assim se diz em Barranquilla: ${list}`,
		slangNone:
			"Não encontrei essa palavra no glossário; dê uma olhada na gíria completa.",
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
	actionKept:
		"J'ai préparé l'action avec le texte exact. Connecte-toi ou crée un compte pour la confirmer ; à ton retour, elle t'attendra ici.",
	uiDone: "C'est fait, c'est à l'écran.",
	createEvent:
		"Super ! Remplis le formulaire avec le nom, la date et le lieu ; il est publié à l'envoi et, si le système détecte quelque chose, il passe en vérification.",
	createEventLabel: "Publier un événement",
	eventDrafted:
		"J'ai préparé l'événement avec ce que tu m'as dit : vérifie le texte exact et confirme-le ci-dessous. Il est publié à la confirmation ; si le système détecte un problème, il passe en vérification.",
	eventFormFilled:
		"J'ai rempli le formulaire avec ce que tu m'as dit ; ajoute la date et l'heure, puis publie-le.",
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
	fareReportReady:
		"J'ai presque terminé le signalement du tarif : vérifie le trajet et le montant, puis envoie-le.",
	fareReportLabel: "Signaler le tarif",
	profile: "Là, tu peux voir et modifier ton profil.",
	profileLabel: "Aller à mon profil",
	myRegistrations: "Je te montre les sorties auxquelles tu es inscrit.",
	fares: "Je cherche les tarifs actuels du Transmetro, du bus et du taxi.",
	news: "Voici les nouveautés de la ville.",
	openData: "Voici les données ouvertes de la ville.",
	indicators: "Voici les indicateurs de la ville.",
	openDataLabel: "Voir les données ouvertes",
	app: {
		languageSet: "C'est fait, je te parle en français maintenant.",
		themeDark: "C'est fait, mode sombre activé.",
		themeLight: "C'est fait, mode clair activé.",
		back: "D'accord, on revient à l'écran précédent.",
		opening: (label) => `Et voilà : ${label}.`,
		screens: {
			inicio: "Accueil",
			agenda: "Agenda",
			foro: "Forum",
			lugares: "Lieux",
			mapa: "Carte",
			reportar: "Signaler",
			perfil: "Mon profil",
			pasaporte: "Passeport",
			jerga: "Argot costeño",
			datos: "Données ouvertes",
		},
		onMap: (place) => `Je te montre ${place} sur la carte.`,
		slang: "Je t'explique ce que ça veut dire à Barranquilla.",
	},
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
		fares: (list) => `Tarifs actuels en pesos : ${list}.`,
		news: (alerts, events) =>
			`${alerts === 0 ? "Aucune alerte d'arroyo active" : plural(alerts, "alerte d'arroyo active", "alertes d'arroyo actives")} et ${plural(events, "nouvel événement", "nouveaux événements")} à l'agenda.`,
		openDataCatalog: (count) =>
			`Le portail compte ${plural(count, "jeu de données", "jeux de données")}.`,
		openDataRecords: (count) =>
			`Ce jeu de données compte ${plural(count, "enregistrement", "enregistrements")}.`,
		indicators: (list) => `Indicateurs de la ville : ${list}.`,
		slang: (list) => `Comme on dit à Barranquilla : ${list}`,
		slangNone:
			"Je n'ai pas trouvé ce mot dans le glossaire ; jette un œil à l'argot complet.",
		fallback: "C'est fait. Je peux t'aider avec autre chose ?",
	},
};

export const LOCAL_COPY: Record<Language, LocalCopy> = { es, en, pt, fr };

/** The copy for the person's language; Spanish when none was sent. */
export function localCopy(language: Language | undefined): LocalCopy {
	return LOCAL_COPY[language ?? "es"];
}
