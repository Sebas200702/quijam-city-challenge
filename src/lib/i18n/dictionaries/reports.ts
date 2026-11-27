// reports text in the four languages. Spanish is the reference: es, en, pt and fr
// must have the same keys (the compiler and messages.test.ts check it).

import type { Language } from "../languages";

const es = {
	pageTitle: "Reportar cobro abusivo · QUILLART",
	vehicles: {
		taxi: "Taxi",
		bus: "Bus",
		informal: "Informal",
		other: "Otro",
	},
	backToMap: "Volver al mapa",
	empty: {
		eyebrow: "Tarifa justa",
		title: "No hay trayectos disponibles",
		body: "No pudimos cargar los trayectos del corredor en este momento. Vuelve al mapa para consultar las tarifas oficiales.",
	},
	referenceData: "Datos de referencia",
	offlineNotice:
		"Sin conexión. Puedes llenar el reporte igual: lo guardaremos en este teléfono para enviarlo después.",
	pending: (n: number) =>
		`Tienes ${n} reporte(s) pendiente(s) guardado(s) sin conexión.`,
	resendNow: "Reenviar ahora",
	resending: "Reenviando…",
	saved: {
		eyebrow: "Reporte enviado",
		title: "La ciudad ya recibió tu reporte",
		badge: "Nuevo",
		summaryOver: (charged: string, percent: number, reference: string) =>
			`Reportaste un cobro de ${charged} (${percent} % por encima de la tarifa de referencia de ${reference}).`,
		summaryNormal: (charged: string, reference: string) =>
			`Reportaste un cobro de ${charged} frente a una tarifa de referencia de ${reference}.`,
		currentState: "Estado actual:",
		stateNew: "Nuevo",
		willMoveTo: "Pasará a",
		stateReview: "En revisión",
		and: "y",
		stateResolved: "Resuelto",
		onBoard: "en el tablero de ciudad.",
		referenceLabel: "Referencia",
		another: "Reportar otro cobro",
	},
	offline: {
		eyebrow: "Guardado sin conexión",
		title: "Tu reporte quedó en este teléfono",
		body: (queued: number) =>
			`No pudimos conectarnos con el servidor en este momento. Guardamos tu reporte (${queued} en cola) para enviarlo cuando vuelva la señal.`,
		retrying: "Reintentando…",
		retry: "Reintentar envío",
		newReport: "Nuevo reporte",
	},
	form: {
		eyebrow: "Tarifa justa · Reporte anónimo",
		title: "Reportar cobro abusivo",
		route: "Trayecto del corredor",
		officialFare: "Tarifa oficial de referencia",
		fairRange: (min: string, max: string) => `Rango justo: ${min} – ${max}`,
		vehicleQuestion: "¿En qué ibas?",
		charged: "Monto cobrado (COP)",
		chargedPlaceholder: "Ej. 55000",
		overcharge: (delta: string) => `Sobrecobro estimado: +${delta}`,
		overchargePercent: (percent: number) => ` (+${percent} % sobre referencia)`,
		withinFare: "Dentro de la tarifa de referencia.",
		driverCode: "Código QR del conductor",
		optional: "(opcional)",
		driverPlaceholder: "Ej. DRV-104",
		notes: "¿Qué pasó?",
		notesPlaceholder:
			"Describe brevemente el cobro sin incluir datos personales.",
		privacy:
			"Anónimo (Ley 1581 de 2012): no pedimos tu nombre ni tu ubicación exacta.",
		sending: "Enviando reporte…",
		submit: "Enviar reporte",
		invalidAmount:
			"Ingresa un monto cobrado válido en pesos colombianos (COP).",
		validateError:
			"No pudimos validar el reporte. Revisa los datos e intenta de nuevo.",
	},
};

export type ReportsMessages = typeof es;

const en: ReportsMessages = {
	pageTitle: "Report an overcharge · QUILLART",
	vehicles: {
		taxi: "Taxi",
		bus: "Bus",
		informal: "Informal",
		other: "Other",
	},
	backToMap: "Back to the map",
	empty: {
		eyebrow: "Fair fare",
		title: "No routes available",
		body: "We couldn't load the corridor routes right now. Go back to the map to check the official fares.",
	},
	referenceData: "Reference data",
	offlineNotice:
		"No connection. You can still fill in the report: we'll save it on this phone and send it later.",
	pending: (n: number) =>
		`You have ${n} pending report${n === 1 ? "" : "s"} saved offline.`,
	resendNow: "Resend now",
	resending: "Resending…",
	saved: {
		eyebrow: "Report sent",
		title: "The city has received your report",
		badge: "New",
		summaryOver: (charged: string, percent: number, reference: string) =>
			`You reported a charge of ${charged} (${percent} % above the reference fare of ${reference}).`,
		summaryNormal: (charged: string, reference: string) =>
			`You reported a charge of ${charged} against a reference fare of ${reference}.`,
		currentState: "Current status:",
		stateNew: "New",
		willMoveTo: "It will move to",
		stateReview: "In review",
		and: "and",
		stateResolved: "Resolved",
		onBoard: "on the city dashboard.",
		referenceLabel: "Reference",
		another: "Report another charge",
	},
	offline: {
		eyebrow: "Saved offline",
		title: "Your report is stored on this phone",
		body: (queued: number) =>
			`We couldn't reach the server right now. We saved your report (${queued} in queue) to send it when the signal is back.`,
		retrying: "Retrying…",
		retry: "Retry sending",
		newReport: "New report",
	},
	form: {
		eyebrow: "Fair fare · Anonymous report",
		title: "Report an overcharge",
		route: "Corridor route",
		officialFare: "Official reference fare",
		fairRange: (min: string, max: string) => `Fair range: ${min} – ${max}`,
		vehicleQuestion: "What were you riding?",
		charged: "Amount charged (COP)",
		chargedPlaceholder: "E.g. 55000",
		overcharge: (delta: string) => `Estimated overcharge: +${delta}`,
		overchargePercent: (percent: number) => ` (+${percent} % over reference)`,
		withinFare: "Within the reference fare.",
		driverCode: "Driver's QR code",
		optional: "(optional)",
		driverPlaceholder: "E.g. DRV-104",
		notes: "What happened?",
		notesPlaceholder:
			"Briefly describe the charge without including personal details.",
		privacy:
			"Anonymous (Law 1581 of 2012): we don't ask for your name or exact location.",
		sending: "Sending report…",
		submit: "Send report",
		invalidAmount: "Enter a valid amount charged in Colombian pesos (COP).",
		validateError:
			"We couldn't validate the report. Check the details and try again.",
	},
};

const pt: ReportsMessages = {
	pageTitle: "Denunciar cobrança abusiva · QUILLART",
	vehicles: {
		taxi: "Táxi",
		bus: "Ônibus",
		informal: "Informal",
		other: "Outro",
	},
	backToMap: "Voltar ao mapa",
	empty: {
		eyebrow: "Tarifa justa",
		title: "Não há trajetos disponíveis",
		body: "Não conseguimos carregar os trajetos do corredor agora. Volte ao mapa para consultar as tarifas oficiais.",
	},
	referenceData: "Dados de referência",
	offlineNotice:
		"Sem conexão. Você pode preencher a denúncia mesmo assim: vamos guardá-la neste celular para enviar depois.",
	pending: (n: number) =>
		`Você tem ${n} denúncia${n === 1 ? "" : "s"} pendente${n === 1 ? "" : "s"} guardada${n === 1 ? "" : "s"} sem conexão.`,
	resendNow: "Reenviar agora",
	resending: "Reenviando…",
	saved: {
		eyebrow: "Denúncia enviada",
		title: "A cidade já recebeu sua denúncia",
		badge: "Novo",
		summaryOver: (charged: string, percent: number, reference: string) =>
			`Você denunciou uma cobrança de ${charged} (${percent} % acima da tarifa de referência de ${reference}).`,
		summaryNormal: (charged: string, reference: string) =>
			`Você denunciou uma cobrança de ${charged} frente a uma tarifa de referência de ${reference}.`,
		currentState: "Status atual:",
		stateNew: "Novo",
		willMoveTo: "Passará para",
		stateReview: "Em análise",
		and: "e",
		stateResolved: "Resolvido",
		onBoard: "no painel da cidade.",
		referenceLabel: "Referência",
		another: "Denunciar outra cobrança",
	},
	offline: {
		eyebrow: "Guardado sem conexão",
		title: "Sua denúncia ficou neste celular",
		body: (queued: number) =>
			`Não conseguimos nos conectar ao servidor agora. Guardamos sua denúncia (${queued} na fila) para enviá-la quando o sinal voltar.`,
		retrying: "Tentando de novo…",
		retry: "Tentar enviar de novo",
		newReport: "Nova denúncia",
	},
	form: {
		eyebrow: "Tarifa justa · Denúncia anônima",
		title: "Denunciar cobrança abusiva",
		route: "Trajeto do corredor",
		officialFare: "Tarifa oficial de referência",
		fairRange: (min: string, max: string) => `Faixa justa: ${min} – ${max}`,
		vehicleQuestion: "Em que você estava?",
		charged: "Valor cobrado (COP)",
		chargedPlaceholder: "Ex. 55000",
		overcharge: (delta: string) => `Sobrepreço estimado: +${delta}`,
		overchargePercent: (percent: number) =>
			` (+${percent} % sobre a referência)`,
		withinFare: "Dentro da tarifa de referência.",
		driverCode: "Código QR do motorista",
		optional: "(opcional)",
		driverPlaceholder: "Ex. DRV-104",
		notes: "O que aconteceu?",
		notesPlaceholder:
			"Descreva brevemente a cobrança sem incluir dados pessoais.",
		privacy:
			"Anônimo (Lei 1581 de 2012): não pedimos seu nome nem sua localização exata.",
		sending: "Enviando denúncia…",
		submit: "Enviar denúncia",
		invalidAmount:
			"Informe um valor cobrado válido em pesos colombianos (COP).",
		validateError:
			"Não conseguimos validar a denúncia. Confira os dados e tente de novo.",
	},
};

const fr: ReportsMessages = {
	pageTitle: "Signaler un tarif abusif · QUILLART",
	vehicles: {
		taxi: "Taxi",
		bus: "Bus",
		informal: "Informel",
		other: "Autre",
	},
	backToMap: "Retour à la carte",
	empty: {
		eyebrow: "Tarif juste",
		title: "Aucun trajet disponible",
		body: "Nous n'avons pas pu charger les trajets du corridor pour le moment. Retournez à la carte pour consulter les tarifs officiels.",
	},
	referenceData: "Données de référence",
	offlineNotice:
		"Hors connexion. Vous pouvez quand même remplir le signalement : nous l'enregistrerons sur ce téléphone pour l'envoyer plus tard.",
	pending: (n: number) =>
		`Vous avez ${n} signalement${n > 1 ? "s" : ""} en attente enregistré${n > 1 ? "s" : ""} hors connexion.`,
	resendNow: "Renvoyer maintenant",
	resending: "Renvoi en cours…",
	saved: {
		eyebrow: "Signalement envoyé",
		title: "La ville a bien reçu votre signalement",
		badge: "Nouveau",
		summaryOver: (charged: string, percent: number, reference: string) =>
			`Vous avez signalé un tarif de ${charged} (${percent} % au-dessus du tarif de référence de ${reference}).`,
		summaryNormal: (charged: string, reference: string) =>
			`Vous avez signalé un tarif de ${charged} pour un tarif de référence de ${reference}.`,
		currentState: "Statut actuel :",
		stateNew: "Nouveau",
		willMoveTo: "Il passera à",
		stateReview: "En cours d'examen",
		and: "puis",
		stateResolved: "Résolu",
		onBoard: "sur le tableau de bord de la ville.",
		referenceLabel: "Référence",
		another: "Signaler un autre tarif",
	},
	offline: {
		eyebrow: "Enregistré hors connexion",
		title: "Votre signalement est resté sur ce téléphone",
		body: (queued: number) =>
			`Nous n'avons pas pu joindre le serveur pour le moment. Nous avons enregistré votre signalement (${queued} en file d'attente) pour l'envoyer dès que le réseau reviendra.`,
		retrying: "Nouvelle tentative…",
		retry: "Réessayer l'envoi",
		newReport: "Nouveau signalement",
	},
	form: {
		eyebrow: "Tarif juste · Signalement anonyme",
		title: "Signaler un tarif abusif",
		route: "Trajet du corridor",
		officialFare: "Tarif officiel de référence",
		fairRange: (min: string, max: string) =>
			`Fourchette juste : ${min} – ${max}`,
		vehicleQuestion: "Quel moyen de transport ?",
		charged: "Montant facturé (COP)",
		chargedPlaceholder: "Ex. 55000",
		overcharge: (delta: string) => `Surfacturation estimée : +${delta}`,
		overchargePercent: (percent: number) =>
			` (+${percent} % par rapport à la référence)`,
		withinFare: "Dans le tarif de référence.",
		driverCode: "Code QR du conducteur",
		optional: "(facultatif)",
		driverPlaceholder: "Ex. DRV-104",
		notes: "Que s'est-il passé ?",
		notesPlaceholder:
			"Décrivez brièvement le tarif sans inclure de données personnelles.",
		privacy:
			"Anonyme (loi 1581 de 2012) : nous ne demandons ni votre nom ni votre position exacte.",
		sending: "Envoi du signalement…",
		submit: "Envoyer le signalement",
		invalidAmount:
			"Saisissez un montant facturé valide en pesos colombiens (COP).",
		validateError:
			"Nous n'avons pas pu valider le signalement. Vérifiez les données et réessayez.",
	},
};

export const reports: Record<Language, ReportsMessages> = { es, en, pt, fr };
