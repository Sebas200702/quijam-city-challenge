// geo text in the four languages: the point picker, the minimaps, the community
// layers of /mapa and the profile zone (docs/30, U08, U15, U36). Spanish is the
// reference: es, en, pt and fr must have the same keys (messages.test.ts checks it).
// Zone and municipality names are proper names and stay as they are.

import type { Language } from "../languages";

const es = {
	pointOutside:
		"El punto debe quedar dentro del área metropolitana de Barranquilla.",
	picker: {
		eventTitle: "¿Dónde es el evento?",
		threadTitle: "¿Dónde pasa? (opcional)",
		threadHint:
			"Si hablas de un sitio concreto, márcalo para que salga en el mapa de la comunidad.",
		mapLabel: "Mapa para elegir el punto. Mueve el mapa para ajustar el pin.",
		moveHint: "Mueve el mapa para ajustar el punto",
		outside: "Fuera del área metropolitana",
		privacyNote:
			"Guardamos el punto del lugar, nunca tu ubicación. Tu ubicación solo mueve el mapa.",
		useMyLocation: "Usar mi ubicación",
		locating: "Buscando tu ubicación…",
		locationFailed: "No pudimos usar tu ubicación. Mueve el mapa a mano.",
		locationOutside:
			"Tu ubicación queda fuera del área metropolitana. Mueve el mapa a mano.",
		usePoint: "Usar este punto",
		choosePoint: "Marcar en el mapa",
		changePoint: "Cambiar el punto",
		removePoint: "Quitar el punto",
		cancel: "Cancelar",
		noPoint: "Sin punto en el mapa.",
		pointIn: (municipality: string) => `Punto en ${municipality}`,
		fromPlace: (place: string) =>
			`Tomamos el punto de ${place}. Ajústalo si es en otra esquina.`,
		pointRequired: "Marca en el mapa dónde es el encuentro.",
		safetyTitle: "¿Dónde pasa?",
		safetyPointRequired:
			"Para un reporte de seguridad, marca en el mapa dónde pasa.",
	},
	minimap: {
		label: (name: string) => `Mapa con la ubicación de ${name}`,
		viewOnMap: "Ver en el mapa",
		directions: "Cómo llegar",
	},
	layers: {
		events: "Eventos",
		pinEvent: (name: string) => `Evento: ${name}`,
		openEvent: "Ver el evento",
		community: "Comunidad",
		pinThread: (name: string) => `Conversación: ${name}`,
		openThread: "Ver la conversación",
		unconfirmed: "Sin confirmar",
		confirmed: "Confirmado por la ciudad",
	},
	zone: {
		label: "Tu zona (opcional)",
		none: "Prefiero no decirlo",
		hint: "Solo la zona, nunca tu dirección. Sirve para mostrarte planes cerca.",
		groupBarranquilla: "Barranquilla (localidades)",
		groupOthers: "Otros municipios",
		legacy: (old: string) =>
			`Antes escribiste «${old}». Elige tu zona en la lista.`,
	},
};

export type GeoMessages = typeof es;

const en: GeoMessages = {
	pointOutside: "The point must be inside the Barranquilla Metropolitan Area.",
	picker: {
		eventTitle: "Where is the event?",
		threadTitle: "Where is it? (optional)",
		threadHint:
			"If you are talking about a specific spot, mark it so it shows on the community map.",
		mapLabel: "Map to choose the point. Move the map to adjust the pin.",
		moveHint: "Move the map to adjust the point",
		outside: "Outside the metropolitan area",
		privacyNote:
			"We save the place's point, never your location. Your location only moves the map.",
		useMyLocation: "Use my location",
		locating: "Finding your location…",
		locationFailed: "We could not use your location. Move the map by hand.",
		locationOutside:
			"Your location is outside the metropolitan area. Move the map by hand.",
		usePoint: "Use this point",
		choosePoint: "Mark on the map",
		changePoint: "Change the point",
		removePoint: "Remove the point",
		cancel: "Cancel",
		noPoint: "No point on the map.",
		pointIn: (municipality: string) => `Point in ${municipality}`,
		fromPlace: (place: string) =>
			`We used the point of ${place}. Adjust it if it is on another corner.`,
		pointRequired: "Mark on the map where the meeting is.",
		safetyTitle: "Where is it?",
		safetyPointRequired:
			"For a safety report, mark on the map where it is happening.",
	},
	minimap: {
		label: (name: string) => `Map showing where ${name} is`,
		viewOnMap: "See on the map",
		directions: "Get directions",
	},
	layers: {
		events: "Events",
		pinEvent: (name: string) => `Event: ${name}`,
		openEvent: "See the event",
		community: "Community",
		pinThread: (name: string) => `Conversation: ${name}`,
		openThread: "See the conversation",
		unconfirmed: "Unconfirmed",
		confirmed: "Confirmed by the city",
	},
	zone: {
		label: "Your area (optional)",
		none: "I'd rather not say",
		hint: "Only the area, never your address. It helps us show plans nearby.",
		groupBarranquilla: "Barranquilla (localities)",
		groupOthers: "Other municipalities",
		legacy: (old: string) =>
			`You wrote "${old}" before. Choose your area from the list.`,
	},
};

const pt: GeoMessages = {
	pointOutside:
		"O ponto deve ficar dentro da área metropolitana de Barranquilla.",
	picker: {
		eventTitle: "Onde é o evento?",
		threadTitle: "Onde acontece? (opcional)",
		threadHint:
			"Se você fala de um lugar específico, marque-o para que apareça no mapa da comunidade.",
		mapLabel: "Mapa para escolher o ponto. Mova o mapa para ajustar o pino.",
		moveHint: "Mova o mapa para ajustar o ponto",
		outside: "Fora da área metropolitana",
		privacyNote:
			"Guardamos o ponto do lugar, nunca a sua localização. Sua localização só move o mapa.",
		useMyLocation: "Usar minha localização",
		locating: "Procurando sua localização…",
		locationFailed:
			"Não conseguimos usar sua localização. Mova o mapa manualmente.",
		locationOutside:
			"Sua localização fica fora da área metropolitana. Mova o mapa manualmente.",
		usePoint: "Usar este ponto",
		choosePoint: "Marcar no mapa",
		changePoint: "Mudar o ponto",
		removePoint: "Tirar o ponto",
		cancel: "Cancelar",
		noPoint: "Sem ponto no mapa.",
		pointIn: (municipality: string) => `Ponto em ${municipality}`,
		fromPlace: (place: string) =>
			`Usamos o ponto de ${place}. Ajuste se for em outra esquina.`,
		pointRequired: "Marque no mapa onde é o encontro.",
		safetyTitle: "Onde acontece?",
		safetyPointRequired:
			"Para um relato de segurança, marque no mapa onde acontece.",
	},
	minimap: {
		label: (name: string) => `Mapa com a localização de ${name}`,
		viewOnMap: "Ver no mapa",
		directions: "Como chegar",
	},
	layers: {
		events: "Eventos",
		pinEvent: (name: string) => `Evento: ${name}`,
		openEvent: "Ver o evento",
		community: "Comunidade",
		pinThread: (name: string) => `Conversa: ${name}`,
		openThread: "Ver a conversa",
		unconfirmed: "Não confirmado",
		confirmed: "Confirmado pela cidade",
	},
	zone: {
		label: "Sua zona (opcional)",
		none: "Prefiro não dizer",
		hint: "Só a zona, nunca o seu endereço. Serve para mostrar programação perto.",
		groupBarranquilla: "Barranquilla (localidades)",
		groupOthers: "Outros municípios",
		legacy: (old: string) =>
			`Antes você escreveu «${old}». Escolha sua zona na lista.`,
	},
};

const fr: GeoMessages = {
	pointOutside:
		"Le point doit se trouver dans l'aire métropolitaine de Barranquilla.",
	picker: {
		eventTitle: "Où a lieu l'événement ?",
		threadTitle: "Où est-ce ? (facultatif)",
		threadHint:
			"Si vous parlez d'un endroit précis, marquez-le pour qu'il apparaisse sur la carte de la communauté.",
		mapLabel:
			"Carte pour choisir le point. Déplacez la carte pour ajuster l'épingle.",
		moveHint: "Déplacez la carte pour ajuster le point",
		outside: "Hors de l'aire métropolitaine",
		privacyNote:
			"Nous gardons le point du lieu, jamais votre position. Votre position ne fait que déplacer la carte.",
		useMyLocation: "Utiliser ma position",
		locating: "Recherche de votre position…",
		locationFailed:
			"Impossible d'utiliser votre position. Déplacez la carte à la main.",
		locationOutside:
			"Votre position est hors de l'aire métropolitaine. Déplacez la carte à la main.",
		usePoint: "Utiliser ce point",
		choosePoint: "Marquer sur la carte",
		changePoint: "Changer le point",
		removePoint: "Retirer le point",
		cancel: "Annuler",
		noPoint: "Aucun point sur la carte.",
		pointIn: (municipality: string) => `Point à ${municipality}`,
		fromPlace: (place: string) =>
			`Nous avons repris le point de ${place}. Ajustez-le si c'est à un autre coin.`,
		pointRequired: "Marquez sur la carte le lieu du rendez-vous.",
		safetyTitle: "Où est-ce ?",
		safetyPointRequired:
			"Pour un signalement de sécurité, marquez sur la carte où cela se passe.",
	},
	minimap: {
		label: (name: string) => `Carte montrant où se trouve ${name}`,
		viewOnMap: "Voir sur la carte",
		directions: "S'y rendre",
	},
	layers: {
		events: "Événements",
		pinEvent: (name: string) => `Événement : ${name}`,
		openEvent: "Voir l'événement",
		community: "Communauté",
		pinThread: (name: string) => `Conversation : ${name}`,
		openThread: "Voir la conversation",
		unconfirmed: "Non confirmé",
		confirmed: "Confirmé par la ville",
	},
	zone: {
		label: "Votre zone (facultatif)",
		none: "Je préfère ne pas le dire",
		hint: "Seulement la zone, jamais votre adresse. Cela sert à vous montrer des sorties à proximité.",
		groupBarranquilla: "Barranquilla (localités)",
		groupOthers: "Autres communes",
		legacy: (old: string) =>
			`Vous aviez écrit « ${old} ». Choisissez votre zone dans la liste.`,
	},
};

export const geo: Record<Language, GeoMessages> = { es, en, pt, fr };
