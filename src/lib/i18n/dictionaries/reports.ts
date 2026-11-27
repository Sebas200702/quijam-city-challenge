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
	status: {
		new: "Nuevo",
		inReview: "En revisión",
		resolved: "Resuelto",
	},
	amountErrors: {
		empty: "Escribe cuánto te cobraron. Ejemplo: 35000.",
		format: "Escribe cuánto te cobraron, solo con números. Ejemplo: 35000.",
		range: "Revisa el monto: debe estar entre $1 y $2.000.000.",
	},
	driverCodeError:
		"El código solo lleva letras, números y guiones. Ejemplo: DRV-104.",
	serverFallbackError:
		"No pudimos validar el reporte. Revisa los datos e intenta de nuevo.",
	empty: {
		eyebrow: "Tarifa de referencia",
		title: "No hay trayectos disponibles",
		body: "No pudimos cargar los trayectos del corredor en este momento. Vuelve al mapa para consultar las tarifas oficiales.",
	},
	backToMap: "Volver al mapa",
	referenceData: "Datos de referencia",
	offlineBanner:
		"Sin conexión. Puedes llenar el reporte igual: lo guardaremos en este teléfono para enviarlo después.",
	pendingBanner: (count: number) =>
		`Tienes ${count} reporte(s) pendiente(s) guardado(s) sin conexión.`,
	resendNow: "Reenviar ahora",
	resending: "Reenviando…",
	saved: {
		eyebrow: "Reporte enviado",
		title: "La ciudad ya recibió tu reporte",
		withPercent: (charged: string, percent: number, reference: string) =>
			`Reportaste un cobro de ${charged} (${percent} % por encima de la tarifa de referencia de ${reference}).`,
		withoutPercent: (charged: string, reference: string) =>
			`Reportaste un cobro de ${charged} frente a una tarifa de referencia de ${reference}.`,
		currentStatus: "Estado actual:",
		willMoveTo: "Pasará a",
		and: "y",
		onCityBoard: "en el tablero de ciudad.",
		reference: (id: string) => `Referencia #${id}`,
		reportAnother: "Reportar otro cobro",
	},
	offline: {
		eyebrow: "Guardado sin conexión",
		title: "Tu reporte quedó en este teléfono",
		body: (queued: number) =>
			`No pudimos conectarnos con el servidor en este momento. Guardamos tu reporte (${queued} en cola) y lo enviamos solo cuando vuelva la señal.`,
		retrying: "Reintentando…",
		retry: "Reintentar envío",
		newReport: "Nuevo reporte",
	},
	form: {
		eyebrow: "Tarifa de referencia · Reporte anónimo",
		title: "Reportar cobro abusivo",
		route: "Trayecto del corredor",
		referenceFare: "Tarifa de referencia",
		fairRange: (min: string, max: string) => `Rango justo: ${min} – ${max}`,
		vehicleLegend: "¿En qué ibas?",
		informalHint:
			"Informal: mototaxi, bicitaxi o carro particular que cobra el pasaje.",
		amountLabel: "Monto cobrado (COP)",
		amountPlaceholder: "Ej. 55000",
		overchargeEstimate: (delta: string) => `Sobrecobro estimado: +${delta}`,
		overchargePercent: (percent: number) => ` (+${percent} % sobre referencia)`,
		withinReference: "Dentro de la tarifa de referencia.",
		driverLabel: "Código QR del conductor",
		optional: "(opcional)",
		driverPlaceholder: "Ej. DRV-104",
		notesLabel: "¿Qué pasó?",
		notesPlaceholder:
			"Describe brevemente el cobro sin incluir datos personales.",
		privacy:
			"Anónimo (Ley 1581 de 2012): no pedimos tu nombre ni tu ubicación exacta.",
		sending: "Enviando reporte…",
		submit: "Enviar reporte",
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
	status: {
		new: "New",
		inReview: "In review",
		resolved: "Resolved",
	},
	amountErrors: {
		empty: "Enter how much you were charged. Example: 35000.",
		format:
			"Enter how much you were charged, using numbers only. Example: 35000.",
		range: "Check the amount: it must be between $1 and $2,000,000.",
	},
	driverCodeError:
		"The code can only contain letters, numbers and hyphens. Example: DRV-104.",
	serverFallbackError:
		"We couldn't validate the report. Check the details and try again.",
	empty: {
		eyebrow: "Reference fare",
		title: "No routes available",
		body: "We couldn't load the corridor routes right now. Go back to the map to check the official fares.",
	},
	backToMap: "Back to the map",
	referenceData: "Reference data",
	offlineBanner:
		"You're offline. You can still fill in the report: we'll save it on this phone and send it later.",
	pendingBanner: (count: number) =>
		count === 1
			? "You have 1 pending report saved offline."
			: `You have ${count} pending reports saved offline.`,
	resendNow: "Resend now",
	resending: "Resending…",
	saved: {
		eyebrow: "Report sent",
		title: "The city has received your report",
		withPercent: (charged: string, percent: number, reference: string) =>
			`You reported a charge of ${charged} (${percent}% above the reference fare of ${reference}).`,
		withoutPercent: (charged: string, reference: string) =>
			`You reported a charge of ${charged} against a reference fare of ${reference}.`,
		currentStatus: "Current status:",
		willMoveTo: "It will move to",
		and: "and",
		onCityBoard: "on the city board.",
		reference: (id: string) => `Reference #${id}`,
		reportAnother: "Report another charge",
	},
	offline: {
		eyebrow: "Saved offline",
		title: "Your report is saved on this phone",
		body: (queued: number) =>
			`We couldn't reach the server right now. We saved your report (${queued} in the queue) and will send it as soon as you have signal again.`,
		retrying: "Retrying…",
		retry: "Retry sending",
		newReport: "New report",
	},
	form: {
		eyebrow: "Reference fare · Anonymous report",
		title: "Report an overcharge",
		route: "Corridor route",
		referenceFare: "Reference fare",
		fairRange: (min: string, max: string) => `Fair range: ${min} – ${max}`,
		vehicleLegend: "What were you riding?",
		informalHint:
			"Informal: motorbike taxi, pedicab or private car charging a fare.",
		amountLabel: "Amount charged (COP)",
		amountPlaceholder: "E.g. 55000",
		overchargeEstimate: (delta: string) => `Estimated overcharge: +${delta}`,
		overchargePercent: (percent: number) => ` (+${percent}% over reference)`,
		withinReference: "Within the reference fare.",
		driverLabel: "Driver's QR code",
		optional: "(optional)",
		driverPlaceholder: "E.g. DRV-104",
		notesLabel: "What happened?",
		notesPlaceholder:
			"Briefly describe the charge without including personal details.",
		privacy:
			"Anonymous (Colombian Law 1581 of 2012): we don't ask for your name or exact location.",
		sending: "Sending report…",
		submit: "Send report",
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
	status: {
		new: "Novo",
		inReview: "Em análise",
		resolved: "Resolvido",
	},
	amountErrors: {
		empty: "Digite quanto cobraram de você. Exemplo: 35000.",
		format: "Digite quanto cobraram de você, só com números. Exemplo: 35000.",
		range: "Confira o valor: deve estar entre $1 e $2.000.000.",
	},
	driverCodeError:
		"O código só pode ter letras, números e hifens. Exemplo: DRV-104.",
	serverFallbackError:
		"Não conseguimos validar a denúncia. Confira os dados e tente de novo.",
	empty: {
		eyebrow: "Tarifa de referência",
		title: "Não há trajetos disponíveis",
		body: "Não conseguimos carregar os trajetos do corredor agora. Volte ao mapa para consultar as tarifas oficiais.",
	},
	backToMap: "Voltar ao mapa",
	referenceData: "Dados de referência",
	offlineBanner:
		"Sem conexão. Você pode preencher a denúncia mesmo assim: vamos guardá-la neste celular para enviar depois.",
	pendingBanner: (count: number) =>
		count === 1
			? "Você tem 1 denúncia pendente guardada sem conexão."
			: `Você tem ${count} denúncias pendentes guardadas sem conexão.`,
	resendNow: "Reenviar agora",
	resending: "Reenviando…",
	saved: {
		eyebrow: "Denúncia enviada",
		title: "A cidade já recebeu sua denúncia",
		withPercent: (charged: string, percent: number, reference: string) =>
			`Você denunciou uma cobrança de ${charged} (${percent}% acima da tarifa de referência de ${reference}).`,
		withoutPercent: (charged: string, reference: string) =>
			`Você denunciou uma cobrança de ${charged} frente a uma tarifa de referência de ${reference}.`,
		currentStatus: "Situação atual:",
		willMoveTo: "Passará para",
		and: "e",
		onCityBoard: "no painel da cidade.",
		reference: (id: string) => `Referência #${id}`,
		reportAnother: "Denunciar outra cobrança",
	},
	offline: {
		eyebrow: "Guardado sem conexão",
		title: "Sua denúncia ficou neste celular",
		body: (queued: number) =>
			`Não conseguimos nos conectar ao servidor agora. Guardamos sua denúncia (${queued} na fila) e a enviaremos assim que o sinal voltar.`,
		retrying: "Tentando de novo…",
		retry: "Tentar enviar de novo",
		newReport: "Nova denúncia",
	},
	form: {
		eyebrow: "Tarifa de referência · Denúncia anônima",
		title: "Denunciar cobrança abusiva",
		route: "Trajeto do corredor",
		referenceFare: "Tarifa de referência",
		fairRange: (min: string, max: string) => `Faixa justa: ${min} – ${max}`,
		vehicleLegend: "Em que você estava?",
		informalHint:
			"Informal: mototáxi, bicitáxi ou carro particular que cobra a passagem.",
		amountLabel: "Valor cobrado (COP)",
		amountPlaceholder: "Ex. 55000",
		overchargeEstimate: (delta: string) =>
			`Cobrança excessiva estimada: +${delta}`,
		overchargePercent: (percent: number) =>
			` (+${percent}% sobre a referência)`,
		withinReference: "Dentro da tarifa de referência.",
		driverLabel: "Código QR do motorista",
		optional: "(opcional)",
		driverPlaceholder: "Ex. DRV-104",
		notesLabel: "O que aconteceu?",
		notesPlaceholder:
			"Descreva brevemente a cobrança sem incluir dados pessoais.",
		privacy:
			"Anônimo (Lei colombiana 1581 de 2012): não pedimos seu nome nem sua localização exata.",
		sending: "Enviando denúncia…",
		submit: "Enviar denúncia",
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
	status: {
		new: "Nouveau",
		inReview: "En cours d'examen",
		resolved: "Résolu",
	},
	amountErrors: {
		empty: "Saisissez le montant qu'on vous a facturé. Exemple : 35000.",
		format:
			"Saisissez le montant qu'on vous a facturé, uniquement avec des chiffres. Exemple : 35000.",
		range: "Vérifiez le montant : il doit être compris entre $1 et $2.000.000.",
	},
	driverCodeError:
		"Le code ne peut contenir que des lettres, des chiffres et des tirets. Exemple : DRV-104.",
	serverFallbackError:
		"Nous n'avons pas pu valider le signalement. Vérifiez les informations et réessayez.",
	empty: {
		eyebrow: "Tarif de référence",
		title: "Aucun trajet disponible",
		body: "Nous n'avons pas pu charger les trajets du corridor pour le moment. Retournez à la carte pour consulter les tarifs officiels.",
	},
	backToMap: "Retour à la carte",
	referenceData: "Données de référence",
	offlineBanner:
		"Hors connexion. Vous pouvez quand même remplir le signalement : nous l'enregistrerons sur ce téléphone pour l'envoyer plus tard.",
	pendingBanner: (count: number) =>
		count === 1
			? "Vous avez 1 signalement en attente enregistré hors connexion."
			: `Vous avez ${count} signalements en attente enregistrés hors connexion.`,
	resendNow: "Renvoyer maintenant",
	resending: "Renvoi en cours…",
	saved: {
		eyebrow: "Signalement envoyé",
		title: "La ville a bien reçu votre signalement",
		withPercent: (charged: string, percent: number, reference: string) =>
			`Vous avez signalé un tarif de ${charged} (${percent} % au-dessus du tarif de référence de ${reference}).`,
		withoutPercent: (charged: string, reference: string) =>
			`Vous avez signalé un tarif de ${charged} face à un tarif de référence de ${reference}.`,
		currentStatus: "Statut actuel :",
		willMoveTo: "Il passera à",
		and: "puis",
		onCityBoard: "sur le tableau de bord de la ville.",
		reference: (id: string) => `Référence #${id}`,
		reportAnother: "Signaler un autre tarif",
	},
	offline: {
		eyebrow: "Enregistré hors connexion",
		title: "Votre signalement est resté sur ce téléphone",
		body: (queued: number) =>
			`Nous n'avons pas pu joindre le serveur pour le moment. Nous avons enregistré votre signalement (${queued} en attente) et l'enverrons dès le retour du réseau.`,
		retrying: "Nouvelle tentative…",
		retry: "Réessayer l'envoi",
		newReport: "Nouveau signalement",
	},
	form: {
		eyebrow: "Tarif de référence · Signalement anonyme",
		title: "Signaler un tarif abusif",
		route: "Trajet du corridor",
		referenceFare: "Tarif de référence",
		fairRange: (min: string, max: string) =>
			`Fourchette juste : ${min} – ${max}`,
		vehicleLegend: "Quel moyen de transport ?",
		informalHint:
			"Informel : moto-taxi, vélo-taxi ou voiture particulière qui fait payer le trajet.",
		amountLabel: "Montant facturé (COP)",
		amountPlaceholder: "Ex. 55000",
		overchargeEstimate: (delta: string) => `Surfacturation estimée : +${delta}`,
		overchargePercent: (percent: number) =>
			` (+${percent} % par rapport à la référence)`,
		withinReference: "Dans le tarif de référence.",
		driverLabel: "Code QR du conducteur",
		optional: "(facultatif)",
		driverPlaceholder: "Ex. DRV-104",
		notesLabel: "Que s'est-il passé ?",
		notesPlaceholder:
			"Décrivez brièvement le tarif demandé sans inclure de données personnelles.",
		privacy:
			"Anonyme (loi colombienne 1581 de 2012) : nous ne demandons ni votre nom ni votre position exacte.",
		sending: "Envoi du signalement…",
		submit: "Envoyer le signalement",
	},
};

export const reports: Record<Language, ReportsMessages> = { es, en, pt, fr };
