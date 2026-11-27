// inbox text in the four languages. Spanish is the reference: es, en, pt and fr
// must have the same keys (the compiler and messages.test.ts check it).

import type { Language } from "../languages";

const es = {
	eyebrow: "Tarifa de referencia · Ciudadanía · Control en vivo",
	title: "Bandeja de reportes de cobro abusivo",
	resolvedBadge: (resolved: number, total: number, rate: string) =>
		`${resolved} / ${total} resueltos (${rate})`,
	percent: (n: number) => `${n} %`,
	meterPercent: (n: number) => `${n}%`,
	indicatorEyebrow: "Indicador de reportes resueltos",
	flow: "Flujo operativo: Nuevo → En revisión → Resuelto",
	meterLabel: "Porcentaje de reportes de cobro abusivo resueltos",
	meterText: (rate: string, resolved: number, total: number) =>
		`${rate} (${resolved} de ${total})`,
	noPending: "Sin reportes pendientes",
	resolvedOf: (resolved: number, total: number) =>
		`${resolved} ${resolved === 1 ? "resuelto" : "resueltos"} de ${total}`,
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
	actions: {
		review: "Revisar",
		resolve: "Resolver",
		markResolved: "Marcar resuelto",
		dismiss: "Descartar",
		reopen: "Reabrir",
	},
	loadingTitle: "Cargando reportes",
	loadingText: "Traemos los cobros abusivos que enviaron los visitantes.",
	errorTitle: "No pudimos cargar los reportes",
	emptyTitle: "No hay cobros abusivos reportados",
	emptyText:
		"Cuando un visitante reporte uno desde Reportar o Quillart AI, aparece aquí al momento.",
	emptyFilterTitle: (status: string) => `No hay reportes en «${status}»`,
	emptyFilterText: "Cambia el filtro para ver los demás.",
	justArrived: "Recién llegado",
	charged: "Cobrado",
	reference: "Referencia",
	idLabel: "ID",
	ago: {
		now: "Hace un momento",
		minutes: (n: number) => `Hace ${n} min`,
		hours: (n: number) => `Hace ${n} h`,
		days: (n: number) => `Hace ${n} d`,
	},
};

export type InboxMessages = typeof es;

const en: InboxMessages = {
	eyebrow: "Reference fares · Citizens · Live monitoring",
	title: "Overcharge report inbox",
	resolvedBadge: (resolved, total, rate) =>
		`${resolved} / ${total} resolved (${rate})`,
	percent: (n) => `${n}%`,
	meterPercent: (n) => `${n}%`,
	indicatorEyebrow: "Resolved reports indicator",
	flow: "Workflow: New → In review → Resolved",
	meterLabel: "Percentage of overcharge reports resolved",
	meterText: (rate, resolved, total) => `${rate} (${resolved} of ${total})`,
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
	actions: {
		review: "Review",
		resolve: "Resolve",
		markResolved: "Mark resolved",
		dismiss: "Dismiss",
		reopen: "Reopen",
	},
	loadingTitle: "Loading reports",
	loadingText: "We're fetching the overcharges visitors have submitted.",
	errorTitle: "We couldn't load the reports",
	emptyTitle: "No overcharges reported",
	emptyText:
		"When a visitor reports one from Report or Quillart AI, it shows up here right away.",
	emptyFilterTitle: (status) => `No reports in “${status}”`,
	emptyFilterText: "Change the filter to see the rest.",
	justArrived: "Just in",
	charged: "Charged",
	reference: "Reference",
	idLabel: "ID",
	ago: {
		now: "Just now",
		minutes: (n) => `${n} min ago`,
		hours: (n) => `${n} h ago`,
		days: (n) => `${n} d ago`,
	},
};

const pt: InboxMessages = {
	eyebrow: "Tarifa de referência · Cidadania · Controle ao vivo",
	title: "Caixa de relatos de cobrança abusiva",
	resolvedBadge: (resolved, total, rate) =>
		`${resolved} / ${total} resolvidos (${rate})`,
	percent: (n) => `${n} %`,
	meterPercent: (n) => `${n}%`,
	indicatorEyebrow: "Indicador de relatos resolvidos",
	flow: "Fluxo operacional: Novo → Em análise → Resolvido",
	meterLabel: "Porcentagem de relatos de cobrança abusiva resolvidos",
	meterText: (rate, resolved, total) => `${rate} (${resolved} de ${total})`,
	noPending: "Nenhum relato pendente",
	resolvedOf: (resolved, total) =>
		`${resolved} ${resolved === 1 ? "resolvido" : "resolvidos"} de ${total}`,
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
	actions: {
		review: "Analisar",
		resolve: "Resolver",
		markResolved: "Marcar como resolvido",
		dismiss: "Descartar",
		reopen: "Reabrir",
	},
	loadingTitle: "Carregando relatos",
	loadingText:
		"Estamos buscando as cobranças abusivas enviadas pelos visitantes.",
	errorTitle: "Não conseguimos carregar os relatos",
	emptyTitle: "Nenhuma cobrança abusiva relatada",
	emptyText:
		"Quando um visitante relatar uma em Reportar ou no Quillart AI, ela aparece aqui na hora.",
	emptyFilterTitle: (status) => `Nenhum relato em «${status}»`,
	emptyFilterText: "Mude o filtro para ver os demais.",
	justArrived: "Acabou de chegar",
	charged: "Cobrado",
	reference: "Referência",
	idLabel: "ID",
	ago: {
		now: "Agora há pouco",
		minutes: (n) => `Há ${n} min`,
		hours: (n) => `Há ${n} h`,
		days: (n) => `Há ${n} d`,
	},
};

const fr: InboxMessages = {
	eyebrow: "Tarif de référence · Citoyenneté · Suivi en direct",
	title: "Boîte des signalements de surfacturation",
	resolvedBadge: (resolved, total, rate) =>
		`${resolved} / ${total} résolus (${rate})`,
	percent: (n) => `${n} %`,
	meterPercent: (n) => `${n} %`,
	indicatorEyebrow: "Indicateur des signalements résolus",
	flow: "Flux opérationnel : Nouveau → En cours d'examen → Résolu",
	meterLabel: "Pourcentage de signalements de surfacturation résolus",
	meterText: (rate, resolved, total) => `${rate} (${resolved} sur ${total})`,
	noPending: "Aucun signalement en attente",
	resolvedOf: (resolved, total) =>
		`${resolved} ${resolved <= 1 ? "résolu" : "résolus"} sur ${total}`,
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
	actions: {
		review: "Examiner",
		resolve: "Résoudre",
		markResolved: "Marquer comme résolu",
		dismiss: "Écarter",
		reopen: "Rouvrir",
	},
	loadingTitle: "Chargement des signalements",
	loadingText:
		"Nous récupérons les surfacturations envoyées par les visiteurs.",
	errorTitle: "Impossible de charger les signalements",
	emptyTitle: "Aucune surfacturation signalée",
	emptyText:
		"Dès qu'un visiteur en signale une depuis Signaler ou Quillart AI, elle apparaît ici immédiatement.",
	emptyFilterTitle: (status) => `Aucun signalement dans « ${status} »`,
	emptyFilterText: "Changez le filtre pour voir les autres.",
	justArrived: "Vient d'arriver",
	charged: "Facturé",
	reference: "Référence",
	idLabel: "ID",
	ago: {
		now: "À l'instant",
		minutes: (n) => `Il y a ${n} min`,
		hours: (n) => `Il y a ${n} h`,
		days: (n) => `Il y a ${n} j`,
	},
};

export const inbox: Record<Language, InboxMessages> = { es, en, pt, fr };
