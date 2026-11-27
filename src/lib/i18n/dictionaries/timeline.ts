// Match-day timeline text (#44) in the four languages. Spanish is the reference:
// es, en, pt and fr must have the same keys (the compiler and messages.test.ts check it).

import type { Language } from "../languages";

const es = {
	title: "Día del partido 2034",
	/** Plain text, not a tag: the screen already carries its one "datos de referencia" tag. */
	scenario: "Escenario de referencia, no la ciudad en vivo",
	open: (hour: string) => `Día del partido · ${hour}`,
	collapse: "Ocultar la línea de tiempo",
	sliderLabel: "Hora del día del partido, de 8:00 a 23:00",
	valueText: (hour: string, events: number) =>
		events === 0
			? `${hour}, sin eventos de la agenda a esta hora`
			: `${hour}, ${events === 1 ? "1 evento" : `${events} eventos`} de la agenda a esta hora`,
	play: "Reproducir el día",
	pause: "Pausar",
	agendaToday: "Agenda de la comunidad hoy",
	agendaOn: (date: string) => `Agenda de la comunidad: ${date}`,
	eventCount: (n: number) => (n === 1 ? "1 evento" : `${n} eventos`),
	loading: "Cargando la agenda…",
	offline: "Sin conexión: la agenda vuelve con la red.",
	error: "No pudimos cargar la agenda.",
	emptyDay: "La agenda no tiene eventos próximos entre 8:00 y 23:00.",
	emptyHour: "Ningún evento de la agenda a esta hora.",
	more: (n: number) => `y ${n} más`,
	seeAgenda: "Ver agenda",
};

export type TimelineMessages = typeof es;

const en: TimelineMessages = {
	title: "2034 match day",
	scenario: "Reference scenario, not the live city",
	open: (hour) => `Match day · ${hour}`,
	collapse: "Hide the timeline",
	sliderLabel: "Time of the match day, from 8:00 to 23:00",
	valueText: (hour, events) =>
		events === 0
			? `${hour}, no agenda events at this time`
			: `${hour}, ${events === 1 ? "1 event" : `${events} events`} on the agenda at this time`,
	play: "Play the day",
	pause: "Pause",
	agendaToday: "Community agenda today",
	agendaOn: (date) => `Community agenda: ${date}`,
	eventCount: (n) => (n === 1 ? "1 event" : `${n} events`),
	loading: "Loading the agenda…",
	offline: "Offline: the agenda comes back with the connection.",
	error: "We could not load the agenda.",
	emptyDay: "The agenda has no upcoming events between 8:00 and 23:00.",
	emptyHour: "No agenda events at this time.",
	more: (n) => `and ${n} more`,
	seeAgenda: "See agenda",
};

const pt: TimelineMessages = {
	title: "Dia da partida 2034",
	scenario: "Cenário de referência, não a cidade ao vivo",
	open: (hour) => `Dia da partida · ${hour}`,
	collapse: "Ocultar a linha do tempo",
	sliderLabel: "Hora do dia da partida, das 8:00 às 23:00",
	valueText: (hour, events) =>
		events === 0
			? `${hour}, sem eventos da agenda neste horário`
			: `${hour}, ${events === 1 ? "1 evento" : `${events} eventos`} da agenda neste horário`,
	play: "Reproduzir o dia",
	pause: "Pausar",
	agendaToday: "Agenda da comunidade hoje",
	agendaOn: (date) => `Agenda da comunidade: ${date}`,
	eventCount: (n) => (n === 1 ? "1 evento" : `${n} eventos`),
	loading: "Carregando a agenda…",
	offline: "Sem conexão: a agenda volta com a rede.",
	error: "Não conseguimos carregar a agenda.",
	emptyDay: "A agenda não tem eventos próximos entre 8:00 e 23:00.",
	emptyHour: "Nenhum evento da agenda neste horário.",
	more: (n) => `e mais ${n}`,
	seeAgenda: "Ver agenda",
};

const fr: TimelineMessages = {
	title: "Jour du match 2034",
	scenario: "Scénario de référence, pas la ville en direct",
	open: (hour) => `Jour du match · ${hour}`,
	collapse: "Masquer la frise",
	sliderLabel: "Heure du jour du match, de 8:00 à 23:00",
	valueText: (hour, events) =>
		events === 0
			? `${hour}, aucun événement de l’agenda à cette heure`
			: `${hour}, ${events === 1 ? "1 événement" : `${events} événements`} de l’agenda à cette heure`,
	play: "Lire la journée",
	pause: "Pause",
	agendaToday: "Agenda de la communauté aujourd’hui",
	agendaOn: (date) => `Agenda de la communauté : ${date}`,
	eventCount: (n) => (n === 1 ? "1 événement" : `${n} événements`),
	loading: "Chargement de l’agenda…",
	offline: "Hors ligne : l’agenda revient avec la connexion.",
	error: "Impossible de charger l’agenda.",
	emptyDay: "L’agenda n’a aucun événement à venir entre 8:00 et 23:00.",
	emptyHour: "Aucun événement de l’agenda à cette heure.",
	more: (n) => `et ${n} de plus`,
	seeAgenda: "Voir l’agenda",
};

export const timeline: Record<Language, TimelineMessages> = { es, en, pt, fr };
