// inbox text in the four languages. Spanish is the reference: es, en, pt and fr
// must have the same keys (the compiler and messages.test.ts check it).

import type { Language } from "../languages";

const es = {
	eyebrow: "Tarifa justa · Ciudadanía · Control en vivo",
	title: "Bandeja de reportes de cobro abusivo",
	resolvedBadge: (resolved: number, total: number, rate: number) =>
		`${resolved} / ${total} resueltos (${rate} %)`,
	indicatorTitle: "Indicador de reportes resueltos",
	flow: "Flujo operativo: Nuevo → En revisión → Resuelto",
	meterLabel: "Porcentaje de reportes de cobro abusivo resueltos",
	meterText: (rate: number, resolved: number, total: number) =>
		`${rate}% (${resolved} de ${total})`,
	noPending: "Sin reportes pendientes",
	resolvedOf: (resolved: number, total: number) =>
		`${resolved} resuelto(s) de ${total}`,
	newCount: (n: number) => `${n} nuevo(s)`,
	filterAria: "Filtrar reportes por estado",
	all: "Todos",
	status: {
		open: "Nuevo",
		in_review: "En revisión",
		resolved: "Resuelto",
		dismissed: "Descartado",
	},
	transport: {
		taxi: "Taxi",
		bus: "Bus",
		informal: "Informal",
		other: "Otro",
	},
	loading: "Cargando bandeja de reportes…",
	retry: "Reintentar",
	emptyAll: "No hay reportes de cobro abusivo registrados.",
	emptyStatus: (status: string) => `No hay reportes en estado "${status}".`,
	emptyHint:
		"Cuando un visitante envíe un reporte desde /reportar o el Guía, aparecerá aquí en tiempo real.",
	justArrived: "Recién llegado",
	justNow: "Hace un momento",
	minutesAgo: (n: number) => `Hace ${n} min`,
	hoursAgo: (n: number) => `Hace ${n} h`,
	daysAgo: (n: number) => `Hace ${n} d`,
	charged: "Cobrado",
	reference: "Referencia",
	actions: {
		review: "Revisar",
		resolve: "Resolver",
		markResolved: "Marcar resuelto",
		dismiss: "Descartar",
		reopen: "Reabrir",
	},
};

export type InboxMessages = typeof es;

const en: InboxMessages = {
	eyebrow: "Fair fare · Citizens · Live monitoring",
	title: "Overcharge report inbox",
	resolvedBadge: (resolved, total, rate) =>
		`${resolved} / ${total} resolved (${rate}%)`,
	indicatorTitle: "Resolved reports indicator",
	flow: "Workflow: New → In review → Resolved",
	meterLabel: "Percentage of overcharge reports resolved",
	meterText: (rate, resolved, total) => `${rate}% (${resolved} of ${total})`,
	noPending: "No pending reports",
	resolvedOf: (resolved, total) => `${resolved} of ${total} resolved`,
	newCount: (n) => `${n} new`,
	filterAria: "Filter reports by status",
	all: "All",
	status: {
		open: "New",
		in_review: "In review",
		resolved: "Resolved",
		dismissed: "Dismissed",
	},
	transport: {
		taxi: "Taxi",
		bus: "Bus",
		informal: "Informal",
		other: "Other",
	},
	loading: "Loading report inbox…",
	retry: "Retry",
	emptyAll: "No overcharge reports have been filed.",
	emptyStatus: (status) => `No reports with status "${status}".`,
	emptyHint:
		"When a visitor submits a report from /reportar or the Guide, it will show up here in real time.",
	justArrived: "Just in",
	justNow: "Just now",
	minutesAgo: (n) => `${n} min ago`,
	hoursAgo: (n) => `${n} h ago`,
	daysAgo: (n) => `${n} d ago`,
	charged: "Charged",
	reference: "Reference",
	actions: {
		review: "Review",
		resolve: "Resolve",
		markResolved: "Mark resolved",
		dismiss: "Dismiss",
		reopen: "Reopen",
	},
};

const pt: InboxMessages = {
	eyebrow: "Tarifa justa · Cidadania · Monitoramento ao vivo",
	title: "Caixa de relatos de cobrança abusiva",
	resolvedBadge: (resolved, total, rate) =>
		`${resolved} / ${total} resolvidos (${rate}%)`,
	indicatorTitle: "Indicador de relatos resolvidos",
	flow: "Fluxo operacional: Novo → Em análise → Resolvido",
	meterLabel: "Porcentagem de relatos de cobrança abusiva resolvidos",
	meterText: (rate, resolved, total) => `${rate}% (${resolved} de ${total})`,
	noPending: "Sem relatos pendentes",
	resolvedOf: (resolved, total) => `${resolved} de ${total} resolvido(s)`,
	newCount: (n) => `${n} novo(s)`,
	filterAria: "Filtrar relatos por status",
	all: "Todos",
	status: {
		open: "Novo",
		in_review: "Em análise",
		resolved: "Resolvido",
		dismissed: "Descartado",
	},
	transport: {
		taxi: "Táxi",
		bus: "Ônibus",
		informal: "Informal",
		other: "Outro",
	},
	loading: "Carregando caixa de relatos…",
	retry: "Tentar de novo",
	emptyAll: "Nenhum relato de cobrança abusiva registrado.",
	emptyStatus: (status) => `Nenhum relato com status "${status}".`,
	emptyHint:
		"Quando um visitante enviar um relato por /reportar ou pelo Guia, ele aparecerá aqui em tempo real.",
	justArrived: "Acabou de chegar",
	justNow: "Agora há pouco",
	minutesAgo: (n) => `Há ${n} min`,
	hoursAgo: (n) => `Há ${n} h`,
	daysAgo: (n) => `Há ${n} d`,
	charged: "Cobrado",
	reference: "Referência",
	actions: {
		review: "Analisar",
		resolve: "Resolver",
		markResolved: "Marcar como resolvido",
		dismiss: "Descartar",
		reopen: "Reabrir",
	},
};

const fr: InboxMessages = {
	eyebrow: "Tarif juste · Citoyenneté · Suivi en direct",
	title: "Boîte des signalements de surfacturation",
	resolvedBadge: (resolved, total, rate) =>
		`${resolved} / ${total} résolus (${rate} %)`,
	indicatorTitle: "Indicateur des signalements résolus",
	flow: "Flux opérationnel : Nouveau → En cours d'examen → Résolu",
	meterLabel: "Pourcentage de signalements de surfacturation résolus",
	meterText: (rate, resolved, total) => `${rate} % (${resolved} sur ${total})`,
	noPending: "Aucun signalement en attente",
	resolvedOf: (resolved, total) => `${resolved} résolu(s) sur ${total}`,
	newCount: (n) => `${n} nouveau(x)`,
	filterAria: "Filtrer les signalements par statut",
	all: "Tous",
	status: {
		open: "Nouveau",
		in_review: "En cours d'examen",
		resolved: "Résolu",
		dismissed: "Écarté",
	},
	transport: {
		taxi: "Taxi",
		bus: "Bus",
		informal: "Informel",
		other: "Autre",
	},
	loading: "Chargement de la boîte des signalements…",
	retry: "Réessayer",
	emptyAll: "Aucun signalement de surfacturation enregistré.",
	emptyStatus: (status) => `Aucun signalement au statut « ${status} ».`,
	emptyHint:
		"Quand un visiteur enverra un signalement depuis /reportar ou le Guide, il apparaîtra ici en temps réel.",
	justArrived: "Tout juste arrivé",
	justNow: "À l'instant",
	minutesAgo: (n) => `Il y a ${n} min`,
	hoursAgo: (n) => `Il y a ${n} h`,
	daysAgo: (n) => `Il y a ${n} j`,
	charged: "Facturé",
	reference: "Référence",
	actions: {
		review: "Examiner",
		resolve: "Résoudre",
		markResolved: "Marquer comme résolu",
		dismiss: "Écarter",
		reopen: "Rouvrir",
	},
};

export const inbox: Record<Language, InboxMessages> = { es, en, pt, fr };
