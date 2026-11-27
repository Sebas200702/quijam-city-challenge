import type {
	ActiveDiversion,
	AffectedRoute,
	ArroyoRow,
	DiversionProposal,
	HostDispatch,
} from "./city-sections-types";

/**
 * Reference sample data (corridor seed style) for the section preview page and
 * render tests, taken from the approved mockups (ciudad/c2, c3).
 */

export const SAMPLE_ARROYOS: ArroyoRow[] = [
	{
		id: "arr-46",
		name: "Arroyo Carrera 46",
		zoneLabel: "Troncal Murillo",
		riskLabel: "riesgo alto",
		status: { kind: "countdown", minutesLeft: 6 },
	},
	{
		id: "arr-fel",
		name: "Arroyo La Felicidad",
		zoneLabel: "Centro Histórico",
		riskLabel: "riesgo moderado",
		status: { kind: "countdown", minutesLeft: 6 },
	},
	{
		id: "arr-48",
		name: "Arroyos Calle 48 y Vía 40",
		zoneLabel: "Barrio Abajo",
		riskLabel: "riesgo bajo",
		status: { kind: "none" },
	},
];

export const SAMPLE_ROUTES: AffectedRoute[] = [
	{
		id: "verde",
		label: "Ruta verde Malecón → Estadio",
		detail: "Por Troncal Murillo. Ahora por Vía 40, 44 min (+6)",
		state: "blocked",
		icon: "bus",
	},
	{
		id: "accesible",
		label: "Ruta accesible por Vía 40",
		detail: "Sin escaleras, sin arroyos",
		state: "active",
		icon: "accessible",
	},
	{
		id: "bus-arenosa",
		label: "Bus Centro → La Arenosa",
		detail: "Cruza el Arroyo La Felicidad",
		state: "suspended",
		icon: "bus-front",
	},
];

export const SAMPLE_HOSTS: HostDispatch[] = [
	{
		id: "jb-03",
		title: "Dupla JB-03 · Joaquín Barrios Polo, salida con rampa",
		detail: "Chaleco dorado · visitante en silla de ruedas, habla inglés",
		steps: { requested: "17:16", accepted: "17:17", arrived: "17:23" },
	},
];

export const SAMPLE_PROPOSAL: DiversionProposal = {
	id: "desvio-barrio-abajo",
	fromLabel: "Gran Malecón",
	toLabel: "Barrio Abajo",
	why: "El Malecón está al 89 % y Barrio Abajo tiene cupo para 730 personas a 20 min a pie.",
	fromPctNow: 89,
	fromPctAfter: 68,
	quota: 730,
	walkMinutes: 20,
	confidence: 0.82,
	chosenBy: "weighted",
	rules: [
		{
			id: "capacity",
			passed: true,
			text: "Capacidad: Barrio Abajo al 34 %, bajo el 75 % de su umbral.",
		},
		{ id: "quota", passed: true, text: "Cupo: 1.350 − 620 = 730 personas." },
		{
			id: "threshold",
			passed: true,
			text: "Umbral fijado por el comité de barrio: 1.800 personas.",
		},
		{ id: "hours", passed: true, text: "Horario acordado: 10:00 a 20:00." },
		{ id: "pause", passed: true, text: "Sin pausa del comité." },
		{ id: "arroyo", passed: true, text: "Arroyo Calle 48 sin alerta." },
		{
			id: "places",
			passed: true,
			text: "Destinos: Casa del Carnaval y 12 negocios verificados abiertos.",
		},
	],
	alternatives: [
		"Barrio Abajo (elegida).",
		"Centro: cupo de 475, más lejos y cerca del Arroyo La Felicidad.",
		"No desviar: el Malecón seguiría saturado.",
	],
};

export const SAMPLE_ACTIVE_DIVERSION: ActiveDiversion = {
	id: "desvio-barrio-abajo",
	fromLabel: "Gran Malecón",
	toLabel: "Barrio Abajo",
	since: "17:46",
	arrived: 210,
	quota: 730,
	fromPctBefore: 89,
	fromPctNow: 83,
	businessVisits: 34,
	committeePaused: false,
};
