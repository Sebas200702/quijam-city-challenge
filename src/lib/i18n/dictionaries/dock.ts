// Agent dock text in the four languages: the Quillart AI bar on every screen,
// its contextual suggestions and the marks of what the agent changed on the
// screen. Spanish is the reference: es, en, pt and fr must have the same keys
// (the compiler and messages.test.ts check it).

import type { Language } from "../languages";

const es = {
	region: "Quillart AI",
	seeing: "viendo",
	contextOn: "Quillart AI ve esta pantalla. Toca para no compartirla.",
	contextOff: "No compartes esta pantalla. Toca para compartirla.",
	inputLabel: "Pregunta o pide algo a Quillart AI",
	placeholder: "Pregunta o pide algo…",
	expand: "Abrir Quillart AI",
	collapse: "Minimizar Quillart AI",
	stop: "Detener",
	stopped: "Detuve la respuesta.",
	waitForAnswer: "Espera la respuesta o tócale «Detener» para pedir otra cosa.",
	answered: (text: string) => `Quillart AI respondió: ${text}`,
	actionReady: "Quillart AI preparó una acción. Revísala y confirma.",
	undo: "Deshacer",
	undone: "Listo, lo dejé como estaba.",
	changesLabel: "Cambios que hizo Quillart AI",
	madeByAgent: "Hecho por Quillart AI",
	filteredByAgent: "Filtrado por Quillart AI",
	filledByAgent: "Llenado por Quillart AI: revisa antes de enviar",
	clear: "Quitar",
	resumed: "Entraste a tu cuenta: tu acción sigue lista para confirmar.",
	liveResumed:
		"La voz en vivo siguió contigo en esta página. Si no la oyes, toca la pantalla.",
	whenLegend: "Cuándo",
	when: { hoy: "Hoy", finde: "Este finde", semana: "Esta semana" },
	searchFor: (text: string) => `«${text}»`,
	routeTo: (place: string) => `Ruta a ${place}`,
	pinsOnMap: (count: number) =>
		count === 1 ? "1 punto en el mapa" : `${count} puntos en el mapa`,
	formFilled: (count: number) =>
		count === 1 ? "1 campo lleno" : `${count} campos llenos`,
	suggestions: {
		home: [
			"Planes para este fin de semana",
			"¿Cómo llego al estadio?",
			"Lugares de naturaleza cerca",
		],
		agenda: [
			"Planes de música hoy",
			"Gratis este finde",
			"Quiero publicar un evento",
		],
		event: ["Inscríbeme", "¿Cómo llego?", "¿De qué se habla de este plan?"],
		eventForm: ["Llena el formulario por mí", "¿Qué categoría le pongo?"],
		places: [
			"Lugares de naturaleza",
			"Parques para ir con niños",
			"¿Qué hay en el Malecón?",
		],
		place: [
			"¿Qué hay aquí este mes?",
			"¿Cómo llego?",
			"¿Qué dice la comunidad de este lugar?",
		],
		forum: [
			"¿De qué se habla hoy?",
			"Quiero abrir una conversación",
			"Reportar un problema",
		],
		thread: ["Resúmeme esta conversación", "Ayúdame a responder"],
		map: [
			"¿Cómo llego al estadio?",
			"¿Cómo llego al centro?",
			"Lugares de naturaleza",
		],
		report: [
			"Me cobraron de más en un taxi",
			"¿Cuál es la tarifa de referencia?",
		],
		profile: [
			"¿En qué eventos estoy inscrito?",
			"Planes para este fin de semana",
		],
		vendor: [
			"¿Cómo me ven los visitantes?",
			"¿Qué planes hay cerca de mi negocio?",
		],
		host: ["¿Qué planes hay hoy?", "¿Cómo llego al estadio?"],
		city: ["Reportes de la comunidad", "¿Qué arroyos tienen alerta?"],
		presenter: ["¿Qué planes hay hoy?", "¿Cómo llego al estadio?"],
	},
	placeholders: {
		vendor: "Pregunta por tu negocio…",
		city: "Pide un resumen o un dato…",
		presenter: "Pregunta algo para la demo…",
	},
};

export type DockMessages = typeof es;

const en: DockMessages = {
	region: "Quillart AI",
	seeing: "viewing",
	contextOn: "Quillart AI sees this screen. Tap to stop sharing it.",
	contextOff: "You are not sharing this screen. Tap to share it.",
	inputLabel: "Ask Quillart AI or ask it to do something",
	placeholder: "Ask or request something…",
	expand: "Open Quillart AI",
	collapse: "Minimize Quillart AI",
	stop: "Stop",
	stopped: "I stopped the answer.",
	waitForAnswer: "Wait for the answer or tap “Stop” to ask something else.",
	answered: (text: string) => `Quillart AI answered: ${text}`,
	actionReady: "Quillart AI prepared an action. Review it and confirm.",
	undo: "Undo",
	undone: "Done, I put it back as it was.",
	changesLabel: "Changes made by Quillart AI",
	madeByAgent: "Done by Quillart AI",
	filteredByAgent: "Filtered by Quillart AI",
	filledByAgent: "Filled in by Quillart AI: review before sending",
	clear: "Clear",
	resumed: "You signed in: your action is still ready to confirm.",
	liveResumed:
		"Live voice came with you to this page. If you can't hear it, tap the screen.",
	whenLegend: "When",
	when: { hoy: "Today", finde: "This weekend", semana: "This week" },
	searchFor: (text: string) => `“${text}”`,
	routeTo: (place: string) => `Route to ${place}`,
	pinsOnMap: (count: number) =>
		count === 1 ? "1 spot on the map" : `${count} spots on the map`,
	formFilled: (count: number) =>
		count === 1 ? "1 field filled" : `${count} fields filled`,
	suggestions: {
		home: [
			"Plans for this weekend",
			"How do I get to the stadium?",
			"Nature spots nearby",
		],
		agenda: [
			"Music plans today",
			"Free this weekend",
			"I want to post an event",
		],
		event: [
			"Sign me up",
			"How do I get there?",
			"What are people saying about this plan?",
		],
		eventForm: ["Fill in the form for me", "Which category should I choose?"],
		places: [
			"Nature spots",
			"Parks to visit with kids",
			"What is at the Malecón?",
		],
		place: [
			"What is on here this month?",
			"How do I get there?",
			"What does the community say about this place?",
		],
		forum: [
			"What are people talking about today?",
			"I want to start a conversation",
			"Report a problem",
		],
		thread: ["Summarize this conversation", "Help me reply"],
		map: [
			"How do I get to the stadium?",
			"How do I get downtown?",
			"Nature spots",
		],
		report: ["A taxi overcharged me", "What is the reference fare?"],
		profile: ["Which events am I registered for?", "Plans for this weekend"],
		vendor: ["How do visitors see me?", "What plans are near my business?"],
		host: ["What plans are on today?", "How do I get to the stadium?"],
		city: ["Community reports", "Which streams have an alert?"],
		presenter: ["What plans are on today?", "How do I get to the stadium?"],
	},
	placeholders: {
		vendor: "Ask about your business…",
		city: "Ask for a summary or a figure…",
		presenter: "Ask something for the demo…",
	},
};

const pt: DockMessages = {
	region: "Quillart AI",
	seeing: "vendo",
	contextOn: "A Quillart AI vê esta tela. Toque para não compartilhá-la.",
	contextOff:
		"Você não está compartilhando esta tela. Toque para compartilhar.",
	inputLabel: "Pergunte ou peça algo à Quillart AI",
	placeholder: "Pergunte ou peça algo…",
	expand: "Abrir a Quillart AI",
	collapse: "Minimizar a Quillart AI",
	stop: "Parar",
	stopped: "Parei a resposta.",
	waitForAnswer:
		"Espere a resposta ou toque em «Parar» para pedir outra coisa.",
	answered: (text: string) => `A Quillart AI respondeu: ${text}`,
	actionReady: "A Quillart AI preparou uma ação. Revise e confirme.",
	undo: "Desfazer",
	undone: "Pronto, deixei como estava.",
	changesLabel: "Mudanças feitas pela Quillart AI",
	madeByAgent: "Feito pela Quillart AI",
	filteredByAgent: "Filtrado pela Quillart AI",
	filledByAgent: "Preenchido pela Quillart AI: revise antes de enviar",
	clear: "Limpar",
	resumed: "Você entrou na sua conta: sua ação continua pronta para confirmar.",
	liveResumed:
		"A voz ao vivo veio com você para esta página. Se não ouvir, toque na tela.",
	whenLegend: "Quando",
	when: { hoy: "Hoje", finde: "Este fim de semana", semana: "Esta semana" },
	searchFor: (text: string) => `«${text}»`,
	routeTo: (place: string) => `Rota até ${place}`,
	pinsOnMap: (count: number) =>
		count === 1 ? "1 ponto no mapa" : `${count} pontos no mapa`,
	formFilled: (count: number) =>
		count === 1 ? "1 campo preenchido" : `${count} campos preenchidos`,
	suggestions: {
		home: [
			"Programação para este fim de semana",
			"Como chego ao estádio?",
			"Lugares de natureza por perto",
		],
		agenda: [
			"Música hoje",
			"Grátis neste fim de semana",
			"Quero publicar um evento",
		],
		event: ["Inscreva-me", "Como chego?", "O que dizem deste evento?"],
		eventForm: ["Preencha o formulário por mim", "Que categoria escolho?"],
		places: [
			"Lugares de natureza",
			"Parques para ir com crianças",
			"O que tem no Malecón?",
		],
		place: [
			"O que acontece aqui este mês?",
			"Como chego?",
			"O que a comunidade diz deste lugar?",
		],
		forum: [
			"Do que se fala hoje?",
			"Quero abrir uma conversa",
			"Relatar um problema",
		],
		thread: ["Resuma esta conversa", "Me ajude a responder"],
		map: [
			"Como chego ao estádio?",
			"Como chego ao centro?",
			"Lugares de natureza",
		],
		report: ["Um táxi me cobrou a mais", "Qual é a tarifa de referência?"],
		profile: [
			"Em quais eventos estou inscrito?",
			"Programação para este fim de semana",
		],
		vendor: [
			"Como os visitantes me veem?",
			"Que eventos há perto do meu negócio?",
		],
		host: ["O que acontece hoje?", "Como chego ao estádio?"],
		city: ["Relatos da comunidade", "Quais arroios têm alerta?"],
		presenter: ["O que acontece hoje?", "Como chego ao estádio?"],
	},
	placeholders: {
		vendor: "Pergunte sobre o seu negócio…",
		city: "Peça um resumo ou um dado…",
		presenter: "Pergunte algo para a demonstração…",
	},
};

const fr: DockMessages = {
	region: "Quillart AI",
	seeing: "voit",
	contextOn: "Quillart AI voit cet écran. Touchez pour ne plus le partager.",
	contextOff: "Vous ne partagez pas cet écran. Touchez pour le partager.",
	inputLabel: "Posez une question ou demandez quelque chose à Quillart AI",
	placeholder: "Demandez quelque chose…",
	expand: "Ouvrir Quillart AI",
	collapse: "Réduire Quillart AI",
	stop: "Arrêter",
	stopped: "J’ai arrêté la réponse.",
	waitForAnswer:
		"Attendez la réponse ou touchez « Arrêter » pour demander autre chose.",
	answered: (text: string) => `Quillart AI a répondu : ${text}`,
	actionReady: "Quillart AI a préparé une action. Vérifiez-la et confirmez.",
	undo: "Annuler",
	undone: "C’est fait, j’ai tout remis comme avant.",
	changesLabel: "Changements faits par Quillart AI",
	madeByAgent: "Fait par Quillart AI",
	filteredByAgent: "Filtré par Quillart AI",
	filledByAgent: "Rempli par Quillart AI : vérifiez avant d’envoyer",
	clear: "Effacer",
	resumed: "Vous êtes connecté : votre action est toujours prête à confirmer.",
	liveResumed:
		"La voix en direct vous a suivi sur cette page. Si vous ne l'entendez pas, touchez l'écran.",
	whenLegend: "Quand",
	when: { hoy: "Aujourd’hui", finde: "Ce week-end", semana: "Cette semaine" },
	searchFor: (text: string) => `« ${text} »`,
	routeTo: (place: string) => `Itinéraire vers ${place}`,
	pinsOnMap: (count: number) =>
		count === 1 ? "1 point sur la carte" : `${count} points sur la carte`,
	formFilled: (count: number) =>
		count === 1 ? "1 champ rempli" : `${count} champs remplis`,
	suggestions: {
		home: [
			"Idées pour ce week-end",
			"Comment aller au stade ?",
			"Lieux de nature à proximité",
		],
		agenda: [
			"Musique aujourd’hui",
			"Gratuit ce week-end",
			"Je veux publier un événement",
		],
		event: [
			"Inscrivez-moi",
			"Comment y aller ?",
			"Que dit-on de cette sortie ?",
		],
		eventForm: ["Remplis le formulaire pour moi", "Quelle catégorie choisir ?"],
		places: [
			"Lieux de nature",
			"Parcs pour les enfants",
			"Qu’y a-t-il au Malecón ?",
		],
		place: [
			"Qu’y a-t-il ici ce mois-ci ?",
			"Comment y aller ?",
			"Que dit la communauté de ce lieu ?",
		],
		forum: [
			"De quoi parle-t-on aujourd’hui ?",
			"Je veux ouvrir une conversation",
			"Signaler un problème",
		],
		thread: ["Résume cette conversation", "Aide-moi à répondre"],
		map: [
			"Comment aller au stade ?",
			"Comment aller au centre ?",
			"Lieux de nature",
		],
		report: [
			"Un taxi m’a fait payer trop cher",
			"Quel est le tarif de référence ?",
		],
		profile: ["À quels événements suis-je inscrit ?", "Idées pour ce week-end"],
		vendor: [
			"Comment les visiteurs me voient-ils ?",
			"Quelles sorties près de mon commerce ?",
		],
		host: ["Que se passe-t-il aujourd’hui ?", "Comment aller au stade ?"],
		city: ["Signalements de la communauté", "Quels ruisseaux sont en alerte ?"],
		presenter: ["Que se passe-t-il aujourd’hui ?", "Comment aller au stade ?"],
	},
	placeholders: {
		vendor: "Posez une question sur votre commerce…",
		city: "Demandez un résumé ou un chiffre…",
		presenter: "Demandez quelque chose pour la démo…",
	},
};

export const dock: Record<Language, DockMessages> = { es, en, pt, fr };
