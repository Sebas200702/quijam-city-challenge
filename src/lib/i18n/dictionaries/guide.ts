// guide text in the four languages. Spanish is the reference: es, en, pt and fr
// must have the same keys (the compiler and messages.test.ts check it).
// This is the chrome around the Guide (panel, trip card, report form, voice
// errors); the language the Guide ANSWERS in is detected from the question.

import type { GuideLanguage } from "../../guide/guide-local";
import type { Language } from "../languages";

/** Icon hint for a suggested question; the panel maps it to a lucide icon. */
export type GuideSuggestionIcon = "route" | "taxi" | "slang" | "language";

export interface GuideSuggestion {
	text: string;
	/** Language of the question, when it differs from the panel's. */
	lang?: GuideLanguage;
	icon: GuideSuggestionIcon;
}

const es = {
	greenRoute: "Ruta verde",
	noGreenRoute: "Sin ruta verde directa",
	referenceFare: "Tarifa de referencia",
	free: "Gratis",
	minutes: (value: number) => `${value} min`,
	floodBlocked: "Evitamos un tramo con alerta de arroyo.",
	reportOvercharge: "Reportar cobro abusivo",
	modes: {
		transmetro: "Transmetro",
		bus: "Bus",
		taxi_verified: "Taxi verificado",
		walk: "A pie",
		bike: "Bici",
	},
	languageNames: {
		es: "Español",
		en: "Inglés",
		pt: "Portugués",
		fr: "Francés",
		de: "Alemán",
	},
	panel: {
		eyebrow: "Agente de Movilidad",
		title: "Quillart AI",
		close: "Cerrar la conversación",
		referenceData: "Datos de referencia",
		readAloud: "Leer respuestas en voz alta",
		openAssistant: "Seguir en Quillart AI",
		offline: "Sin conexión",
		greeting:
			"Hola. Soy Quillart AI. Te ayudo a moverte por el corredor: toca el micrófono y habla en tu idioma, o escribe abajo.",
		tryThis: "Prueba con",
		suggestions: [
			{ text: "¿Cómo llego al estadio?", icon: "route" },
			{ text: "¿Cuánto cuesta un taxi al estadio?", icon: "taxi" },
			{ text: "¿Qué significa ajá?", icon: "slang" },
			{ text: "How do I get to Barrio Abajo?", lang: "en", icon: "language" },
		] as GuideSuggestion[],
		suggestionsLabel: "Preguntas sugeridas",
		talk: "Hablar con Quillart",
		stopTalking: "Dejar de escuchar",
		tapToTalk: "Toca y habla en tu idioma",
		listening: "Escuchando… habla en tu idioma",
		voiceOffline: "Sin conexión no hay voz. Escribe tu pregunta.",
		typeLabel: "O escribe tu pregunta",
		typePlaceholder: "O escribe tu pregunta…",
		send: "Enviar pregunta",
		thinking: "Quillart está pensando",
		guide: "Agente de Movilidad",
		saidByVoice: "Dicho por voz",
		detected: (language: string) => `${language} detectado`,
		sourceSlang: "Jerga de la costa",
		savedAnswer: "Respuesta guardada",
		savedAnswers: "Respuestas guardadas",
		offlineIntro:
			"Estás sin conexión. Te respondo con lo que tengo guardado: las rutas al estadio, Barrio Abajo y el centro, lo que ya preguntaste y la jerga.",
		offlineMissTitle: "Aún no tengo esa respuesta",
		offlineMissText:
			"Sin conexión respondo las rutas al estadio, Barrio Abajo y el centro, lo que ya preguntaste y la jerga. Inténtalo cuando vuelva la señal.",
		errorTitle: "No pude responder ahora",
		errorText: "Inténtalo otra vez en un momento.",
		retry: "Reintentar",
		micErrorTitle: "No pudimos escucharte",
		micErrorText:
			"Hay mucho ruido o no se oyó nada. Habla más cerca o escribe tu pregunta abajo.",
		micBlockedText: "No diste permiso al micrófono. Escribe tu pregunta abajo.",
	},
	trip: {
		eyebrow: "Ruta propuesta",
		showRoute: "Ver la ruta",
		accessible: "Accesible",
		whyGreen: "Es la opción verde con mejor tiempo y tarifa.",
		whyFlood: "Evitamos un tramo con alerta de arroyo; esta ruta va seca.",
		whyTaxi:
			"No pasa transporte público directo; el taxi verificado es seguro.",
		noRouteTitle: "Ahora no hay una ruta segura",
		noRouteText:
			"Espera en un lugar seco o pregúntale al Guía por otra salida.",
		taxi: "Taxi verificado",
		range: "rango justo",
		details: "Ver detalles",
		confidence: "Confianza de la ruta",
		distance: "Distancia",
		access: "Silla de ruedas",
		yes: "Sí",
		no: "No",
		sources: "Fuente: datos de referencia del corredor y alertas de arroyos.",
		levels: ["Baja", "Media", "Alta"],
	},
	report: {
		title: "Reportar cobro abusivo",
		route: "Trayecto",
		referenceFare: "Tarifa de referencia",
		overchargeEstimate: (percent: number | null, deltaCop: string) =>
			percent !== null
				? `+${deltaCop} (+${percent} % sobre la referencia)`
				: `+${deltaCop} sobre la referencia`,
		withinReference: "Dentro de la tarifa de referencia",
		vehicle: "¿En qué ibas?",
		vehicles: { taxi: "Taxi", bus: "Bus", informal: "Informal", other: "Otro" },
		charged: "¿Cuánto te cobraron? (COP)",
		driverCode: "Código QR del conductor",
		notes: "¿Qué pasó?",
		optional: "opcional",
		send: "Enviar reporte",
		sending: "Enviando…",
		cancel: "Cancelar",
		close: "Cerrar",
		saved: (percent: number | null) =>
			percent !== null && percent > 0
				? `Reporte enviado. Te cobraron ${percent} % más que la tarifa de referencia; la ciudad ya lo ve.`
				: "Reporte enviado. La ciudad ya lo ve.",
		savedOffline: "No pudimos enviarlo ahora. Lo guardamos en este teléfono.",
		failed:
			"No pudimos enviar el reporte. Revisa los datos e intenta de nuevo.",
		privacy: "No pedimos tu nombre ni tu ubicación.",
		amountEmpty: "Escribe cuánto te cobraron. Ejemplo: 35000.",
		amountFormat:
			"Escribe cuánto te cobraron, solo con números. Ejemplo: 35000.",
		amountRange: "Revisa el monto: debe estar entre $1 y $2.000.000.",
		driverCodeInvalid:
			"El código solo lleva letras, números y guiones. Ejemplo: TX-0417.",
	},
	// Messages for the voice conduit (microphone failures), by browser error code.
	voice: {
		micPermission: "Necesitamos permiso para usar el micrófono.",
		noMic: "No encontramos un micrófono.",
		needsInternet: "El dictado por voz necesita internet.",
		generic: "No pudimos escucharte. Escribe tu mensaje.",
		cannotStart: "No pudimos activar el micrófono.",
	},
};

export type GuideMessages = typeof es;

const en: GuideMessages = {
	greenRoute: "Green route",
	noGreenRoute: "No direct green route",
	referenceFare: "Reference fare",
	free: "Free",
	minutes: (value) => `${value} min`,
	floodBlocked: "We avoided a leg with a flood alert.",
	reportOvercharge: "Report an overcharge",
	modes: {
		transmetro: "Transmetro",
		bus: "Bus",
		taxi_verified: "Verified taxi",
		walk: "On foot",
		bike: "Bike",
	},
	languageNames: {
		es: "Spanish",
		en: "English",
		pt: "Portuguese",
		fr: "French",
		de: "German",
	},
	panel: {
		eyebrow: "Mobility agent",
		title: "Quillart AI",
		close: "Close the conversation",
		referenceData: "Reference data",
		readAloud: "Read answers aloud",
		openAssistant: "Continue in Quillart AI",
		offline: "Offline",
		greeting:
			"Hi. I am Quillart AI. I help you get around the corridor: tap the mic and speak your language, or type below.",
		tryThis: "Try",
		suggestions: [
			{ text: "How do I get to the stadium?", icon: "route" },
			{ text: "How much is a taxi to the stadium?", icon: "taxi" },
			{ text: "What does ajá mean?", icon: "slang" },
			{ text: "Comment aller au Centro ?", lang: "fr", icon: "language" },
		],
		suggestionsLabel: "Suggested questions",
		talk: "Talk to Quillart",
		stopTalking: "Stop listening",
		tapToTalk: "Tap and speak your language",
		listening: "Listening… speak your language",
		voiceOffline: "Voice needs a connection. Type your question.",
		typeLabel: "Or type your question",
		typePlaceholder: "Or type your question…",
		send: "Send question",
		thinking: "Quillart is thinking",
		guide: "Mobility agent",
		saidByVoice: "Said by voice",
		detected: (language) => `${language} detected`,
		sourceSlang: "Coastal slang",
		savedAnswer: "Saved answer",
		savedAnswers: "Saved answers",
		offlineIntro:
			"You are offline. I reply with what I have saved: routes to the stadium, Barrio Abajo and downtown, what you already asked and slang.",
		offlineMissTitle: "I do not have that answer yet",
		offlineMissText:
			"Offline I answer routes to the stadium, Barrio Abajo and downtown, what you already asked and slang. Try again when you are back online.",
		errorTitle: "I could not answer right now",
		errorText: "Please try again in a moment.",
		retry: "Try again",
		micErrorTitle: "We could not hear you",
		micErrorText:
			"It is too noisy or nothing was heard. Speak closer or type your question below.",
		micBlockedText: "The mic is blocked. Type your question below.",
	},
	trip: {
		eyebrow: "Suggested route",
		showRoute: "See the route",
		accessible: "Accessible",
		whyGreen: "It is the green option with the best time and fare.",
		whyFlood: "We avoided a leg with a flood alert; this route stays dry.",
		whyTaxi:
			"No direct public transport; the verified taxi is the safe option.",
		noRouteTitle: "No safe route right now",
		noRouteText: "Wait somewhere dry or ask the Guide for another way.",
		taxi: "Verified taxi",
		range: "fair range",
		details: "See details",
		confidence: "Route confidence",
		distance: "Distance",
		access: "Wheelchair",
		yes: "Yes",
		no: "No",
		sources: "Source: corridor reference data and flood alerts.",
		levels: ["Low", "Medium", "High"],
	},
	report: {
		title: "Report an overcharge",
		route: "Route",
		referenceFare: "Reference fare",
		overchargeEstimate: (percent, deltaCop) =>
			percent !== null
				? `+${deltaCop} (+${percent}% above reference)`
				: `+${deltaCop} above reference`,
		withinReference: "Within the reference fare",
		vehicle: "What were you riding?",
		vehicles: {
			taxi: "Taxi",
			bus: "Bus",
			informal: "Informal",
			other: "Other",
		},
		charged: "How much did they charge? (COP)",
		driverCode: "Driver's QR code",
		notes: "What happened?",
		optional: "optional",
		send: "Send report",
		sending: "Sending…",
		cancel: "Cancel",
		close: "Close",
		saved: (percent) =>
			percent !== null && percent > 0
				? `Report sent. You were charged ${percent}% above the reference fare; the city can see it now.`
				: "Report sent. The city can see it now.",
		savedOffline: "We could not send it now. It is saved on this phone.",
		failed: "We could not send the report. Check the details and try again.",
		privacy: "We never ask for your name or location.",
		amountEmpty: "Type how much you were charged. Example: 35000.",
		amountFormat:
			"Type how much you were charged, numbers only. Example: 35000.",
		amountRange: "Check the amount: it must be between $1 and $2,000,000.",
		driverCodeInvalid:
			"The code only has letters, numbers and dashes. Example: TX-0417.",
	},
	voice: {
		micPermission: "We need permission to use the microphone.",
		noMic: "We could not find a microphone.",
		needsInternet: "Voice dictation needs an internet connection.",
		generic: "We could not hear you. Type your message.",
		cannotStart: "We could not turn on the microphone.",
	},
};

const pt: GuideMessages = {
	greenRoute: "Rota verde",
	noGreenRoute: "Sem rota verde direta",
	referenceFare: "Tarifa de referência",
	free: "Grátis",
	minutes: (value) => `${value} min`,
	floodBlocked: "Evitamos um trecho com alerta de enxurrada.",
	reportOvercharge: "Denunciar cobrança abusiva",
	modes: {
		transmetro: "Transmetro",
		bus: "Ônibus",
		taxi_verified: "Táxi verificado",
		walk: "A pé",
		bike: "Bicicleta",
	},
	languageNames: {
		es: "Espanhol",
		en: "Inglês",
		pt: "Português",
		fr: "Francês",
		de: "Alemão",
	},
	panel: {
		eyebrow: "Agente de Mobilidade",
		title: "Quillart AI",
		close: "Fechar a conversa",
		referenceData: "Dados de referência",
		readAloud: "Ler as respostas em voz alta",
		openAssistant: "Continuar no Quillart AI",
		offline: "Sem conexão",
		greeting:
			"Olá. Eu sou o Quillart AI. Ajudo você a se locomover pelo corredor: toque no microfone e fale no seu idioma, ou escreva abaixo.",
		tryThis: "Experimente",
		suggestions: [
			{ text: "Como chego ao estádio?", icon: "route" },
			{ text: "Quanto custa um táxi até o estádio?", icon: "taxi" },
			{ text: "O que quer dizer ajá?", icon: "slang" },
			{ text: "How do I get to Barrio Abajo?", lang: "en", icon: "language" },
		],
		suggestionsLabel: "Perguntas sugeridas",
		talk: "Falar com o Quillart",
		stopTalking: "Parar de ouvir",
		tapToTalk: "Toque e fale no seu idioma",
		listening: "Ouvindo… fale no seu idioma",
		voiceOffline: "Sem conexão não há voz. Escreva sua pergunta.",
		typeLabel: "Ou escreva sua pergunta",
		typePlaceholder: "Ou escreva sua pergunta…",
		send: "Enviar pergunta",
		thinking: "O Quillart está pensando",
		guide: "Agente de Mobilidade",
		saidByVoice: "Dito por voz",
		detected: (language) => `${language} detectado`,
		sourceSlang: "Gíria da costa",
		savedAnswer: "Resposta salva",
		savedAnswers: "Respostas salvas",
		offlineIntro:
			"Você está sem conexão. Respondo com o que tenho salvo: as rotas ao estádio, Barrio Abajo e o centro, o que você já perguntou e as gírias.",
		offlineMissTitle: "Ainda não tenho essa resposta",
		offlineMissText:
			"Sem conexão, respondo as rotas ao estádio, Barrio Abajo e o centro, o que você já perguntou e as gírias. Tente de novo quando o sinal voltar.",
		errorTitle: "Não consegui responder agora",
		errorText: "Tente de novo em instantes.",
		retry: "Tentar de novo",
		micErrorTitle: "Não conseguimos ouvir você",
		micErrorText:
			"Há muito ruído ou nada foi ouvido. Fale mais perto ou escreva sua pergunta abaixo.",
		micBlockedText:
			"Você não deu permissão ao microfone. Escreva sua pergunta abaixo.",
	},
	trip: {
		eyebrow: "Rota sugerida",
		showRoute: "Ver a rota",
		accessible: "Acessível",
		whyGreen: "É a opção verde com melhor tempo e tarifa.",
		whyFlood: "Evitamos um trecho com alerta de enxurrada; esta rota é seca.",
		whyTaxi:
			"Não há transporte público direto; o táxi verificado é a opção segura.",
		noRouteTitle: "Agora não há rota segura",
		noRouteText:
			"Espere em um lugar seco ou pergunte ao Guia por outro caminho.",
		taxi: "Táxi verificado",
		range: "faixa justa",
		details: "Ver detalhes",
		confidence: "Confiança da rota",
		distance: "Distância",
		access: "Cadeira de rodas",
		yes: "Sim",
		no: "Não",
		sources: "Fonte: dados de referência do corredor e alertas de enxurrada.",
		levels: ["Baixa", "Média", "Alta"],
	},
	report: {
		title: "Denunciar cobrança abusiva",
		route: "Trajeto",
		referenceFare: "Tarifa de referência",
		overchargeEstimate: (percent, deltaCop) =>
			percent !== null
				? `+${deltaCop} (+${percent}% sobre a referência)`
				: `+${deltaCop} sobre a referência`,
		withinReference: "Dentro da tarifa de referência",
		vehicle: "Em que você estava?",
		vehicles: {
			taxi: "Táxi",
			bus: "Ônibus",
			informal: "Informal",
			other: "Outro",
		},
		charged: "Quanto cobraram de você? (COP)",
		driverCode: "Código QR do motorista",
		notes: "O que aconteceu?",
		optional: "opcional",
		send: "Enviar denúncia",
		sending: "Enviando…",
		cancel: "Cancelar",
		close: "Fechar",
		saved: (percent) =>
			percent !== null && percent > 0
				? `Denúncia enviada. Cobraram ${percent}% a mais que a tarifa de referência; a cidade já está vendo.`
				: "Denúncia enviada. A cidade já está vendo.",
		savedOffline: "Não conseguimos enviar agora. Salvamos neste telefone.",
		failed:
			"Não conseguimos enviar a denúncia. Confira os dados e tente de novo.",
		privacy: "Não pedimos seu nome nem sua localização.",
		amountEmpty: "Escreva quanto cobraram de você. Exemplo: 35000.",
		amountFormat:
			"Escreva quanto cobraram de você, só com números. Exemplo: 35000.",
		amountRange: "Confira o valor: deve estar entre $1 e $2.000.000.",
		driverCodeInvalid:
			"O código só tem letras, números e hifens. Exemplo: TX-0417.",
	},
	voice: {
		micPermission: "Precisamos de permissão para usar o microfone.",
		noMic: "Não encontramos um microfone.",
		needsInternet: "O ditado por voz precisa de internet.",
		generic: "Não conseguimos ouvir você. Escreva sua mensagem.",
		cannotStart: "Não conseguimos ativar o microfone.",
	},
};

const fr: GuideMessages = {
	greenRoute: "Itinéraire vert",
	noGreenRoute: "Pas d'itinéraire vert direct",
	referenceFare: "Tarif de référence",
	free: "Gratuit",
	minutes: (value) => `${value} min`,
	floodBlocked: "Nous évitons un tronçon sous alerte de crue.",
	reportOvercharge: "Signaler un tarif abusif",
	modes: {
		transmetro: "Transmetro",
		bus: "Bus",
		taxi_verified: "Taxi vérifié",
		walk: "À pied",
		bike: "Vélo",
	},
	languageNames: {
		es: "Espagnol",
		en: "Anglais",
		pt: "Portugais",
		fr: "Français",
		de: "Allemand",
	},
	panel: {
		eyebrow: "Agent de mobilité",
		title: "Quillart AI",
		close: "Fermer la conversation",
		referenceData: "Données de référence",
		readAloud: "Lire les réponses à voix haute",
		openAssistant: "Continuer dans Quillart AI",
		offline: "Hors connexion",
		greeting:
			"Bonjour. Je suis Quillart AI. Je vous aide à vous déplacer dans le corridor : touchez le micro et parlez dans votre langue, ou écrivez ci-dessous.",
		tryThis: "Essayez",
		suggestions: [
			{ text: "Comment aller au stade ?", icon: "route" },
			{ text: "Combien coûte un taxi jusqu'au stade ?", icon: "taxi" },
			{ text: "Que veut dire ajá ?", icon: "slang" },
			{ text: "How do I get to Barrio Abajo?", lang: "en", icon: "language" },
		],
		suggestionsLabel: "Questions suggérées",
		talk: "Parler à Quillart",
		stopTalking: "Arrêter l'écoute",
		tapToTalk: "Touchez et parlez dans votre langue",
		listening: "J'écoute… parlez dans votre langue",
		voiceOffline: "Pas de voix hors connexion. Écrivez votre question.",
		typeLabel: "Ou écrivez votre question",
		typePlaceholder: "Ou écrivez votre question…",
		send: "Envoyer la question",
		thinking: "Quillart réfléchit",
		guide: "Agent de mobilité",
		saidByVoice: "Dit à voix haute",
		detected: (language) => `${language} détecté`,
		sourceSlang: "Argot de la côte",
		savedAnswer: "Réponse enregistrée",
		savedAnswers: "Réponses enregistrées",
		offlineIntro:
			"Vous êtes hors connexion. Je réponds avec ce que j'ai enregistré : les itinéraires vers le stade, Barrio Abajo et le centre, les questions déjà posées et l'argot.",
		offlineMissTitle: "Je n'ai pas encore cette réponse",
		offlineMissText:
			"Hors connexion, je réponds aux itinéraires vers le stade, Barrio Abajo et le centre, aux questions déjà posées et à l'argot. Réessayez quand le réseau reviendra.",
		errorTitle: "Je n'ai pas pu répondre",
		errorText: "Réessayez dans un instant.",
		retry: "Réessayer",
		micErrorTitle: "Nous n'avons pas pu vous entendre",
		micErrorText:
			"Il y a trop de bruit ou rien n'a été entendu. Parlez plus près ou écrivez votre question ci-dessous.",
		micBlockedText:
			"Vous n'avez pas autorisé le micro. Écrivez votre question ci-dessous.",
	},
	trip: {
		eyebrow: "Itinéraire proposé",
		showRoute: "Voir l'itinéraire",
		accessible: "Accessible",
		whyGreen:
			"C'est l'option verte avec le meilleur temps et le meilleur tarif.",
		whyFlood:
			"Nous évitons un tronçon sous alerte de crue ; cet itinéraire reste au sec.",
		whyTaxi:
			"Pas de transport public direct ; le taxi vérifié est l'option sûre.",
		noRouteTitle: "Aucun itinéraire sûr pour l'instant",
		noRouteText:
			"Attendez dans un endroit sec ou demandez un autre chemin au Guide.",
		taxi: "Taxi vérifié",
		range: "fourchette juste",
		details: "Voir les détails",
		confidence: "Fiabilité de l'itinéraire",
		distance: "Distance",
		access: "Fauteuil roulant",
		yes: "Oui",
		no: "Non",
		sources: "Source : données de référence du corridor et alertes de crue.",
		levels: ["Faible", "Moyenne", "Élevée"],
	},
	report: {
		title: "Signaler un tarif abusif",
		route: "Trajet",
		referenceFare: "Tarif de référence",
		overchargeEstimate: (percent, deltaCop) =>
			percent !== null
				? `+${deltaCop} (+${percent} % au-dessus de la référence)`
				: `+${deltaCop} au-dessus de la référence`,
		withinReference: "Dans le tarif de référence",
		vehicle: "Dans quoi étiez-vous ?",
		vehicles: {
			taxi: "Taxi",
			bus: "Bus",
			informal: "Informel",
			other: "Autre",
		},
		charged: "Combien vous a-t-on fait payer ? (COP)",
		driverCode: "Code QR du conducteur",
		notes: "Que s'est-il passé ?",
		optional: "facultatif",
		send: "Envoyer le signalement",
		sending: "Envoi…",
		cancel: "Annuler",
		close: "Fermer",
		saved: (percent) =>
			percent !== null && percent > 0
				? `Signalement envoyé. On vous a fait payer ${percent} % de plus que le tarif de référence ; la ville le voit déjà.`
				: "Signalement envoyé. La ville le voit déjà.",
		savedOffline:
			"Nous n'avons pas pu l'envoyer maintenant. Il est enregistré sur ce téléphone.",
		failed:
			"Nous n'avons pas pu envoyer le signalement. Vérifiez les données et réessayez.",
		privacy: "Nous ne demandons ni votre nom ni votre position.",
		amountEmpty: "Indiquez combien on vous a fait payer. Exemple : 35000.",
		amountFormat:
			"Indiquez combien on vous a fait payer, en chiffres uniquement. Exemple : 35000.",
		amountRange: "Vérifiez le montant : il doit être entre 1 $ et 2 000 000 $.",
		driverCodeInvalid:
			"Le code ne contient que des lettres, des chiffres et des tirets. Exemple : TX-0417.",
	},
	voice: {
		micPermission: "Nous avons besoin de l'autorisation d'utiliser le micro.",
		noMic: "Nous n'avons pas trouvé de micro.",
		needsInternet: "La dictée vocale nécessite une connexion internet.",
		generic: "Nous n'avons pas pu vous entendre. Écrivez votre message.",
		cannotStart: "Nous n'avons pas pu activer le micro.",
	},
};

export const guide: Record<Language, GuideMessages> = { es, en, pt, fr };
