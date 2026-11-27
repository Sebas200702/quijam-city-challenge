// host app text (/anfitrion) in the four languages. Spanish is the reference:
// es, en, pt and fr must have the same keys (the compiler and messages.test.ts check it).

import type { Language } from "../languages";

const es = {
	pageTitle: "Anfitrión · QUILLART",
	eyebrow: "Anfitrión",
	title: "Tu turno",
	homeLabel: "QUILLART, inicio",
	signOut: "Salir",
	signInTitle: "Entra para recibir visitantes",
	signInText:
		"La app del anfitrión es para las duplas que acompañan a visitantes. Entra con tu cuenta para avisar que estás disponible.",
	signIn: "Entrar o crear cuenta",
	offline: "Sin conexión con la ciudad. Reintentamos solos.",
	idleTitle: "Todavía no estás disponible",
	idleText: "Avísale a la ciudad que puedes acompañar a un visitante.",
	available: "Estoy disponible",
	waitingTitle: "Sin asignaciones por ahora",
	waitingText: "Te avisamos aquí apenas haya un visitante que te necesite.",
	unavailable: "Ya no estoy disponible",
	assignment: "Asignación",
	reducedMobility: "Visitante con movilidad reducida",
	eta: (minutes: number) => `Llegas en unos ${minutes} min.`,
	demo: "Demo: enviar una asignación",
	actions: { accept: "Aceptar", arrived: "Llegué", finish: "Terminar" },
	status: {
		pendiente: "Asignación nueva",
		en_camino: "Vas en camino",
		llego: "Estás con el visitante",
		terminada: "Terminaste",
	},
};

export type HostMessages = typeof es;

const en: HostMessages = {
	pageTitle: "Host · QUILLART",
	eyebrow: "Host",
	title: "Your shift",
	homeLabel: "QUILLART, home",
	signOut: "Sign out",
	signInTitle: "Sign in to welcome visitors",
	signInText:
		"The host app is for the pairs who walk with visitors. Sign in to say you are available.",
	signIn: "Sign in or create an account",
	offline: "No connection with the city. We keep retrying.",
	idleTitle: "You are not available yet",
	idleText: "Let the city know you can walk with a visitor.",
	available: "I am available",
	waitingTitle: "No assignments for now",
	waitingText: "We will tell you here as soon as a visitor needs you.",
	unavailable: "I am no longer available",
	assignment: "Assignment",
	reducedMobility: "Visitor with reduced mobility",
	eta: (minutes: number) => `You arrive in about ${minutes} min.`,
	demo: "Demo: send an assignment",
	actions: { accept: "Accept", arrived: "I am here", finish: "Finish" },
	status: {
		pendiente: "New assignment",
		en_camino: "On your way",
		llego: "You are with the visitor",
		terminada: "You are done",
	},
};

const pt: HostMessages = {
	pageTitle: "Anfitrião · QUILLART",
	eyebrow: "Anfitrião",
	title: "Seu turno",
	homeLabel: "QUILLART, início",
	signOut: "Sair",
	signInTitle: "Entre para receber visitantes",
	signInText:
		"O app do anfitrião é para as duplas que acompanham visitantes. Entre com sua conta para avisar que está disponível.",
	signIn: "Entrar ou criar conta",
	offline: "Sem conexão com a cidade. Tentamos de novo sozinhos.",
	idleTitle: "Você ainda não está disponível",
	idleText: "Avise à cidade que você pode acompanhar um visitante.",
	available: "Estou disponível",
	waitingTitle: "Sem atribuições por enquanto",
	waitingText: "Avisamos aqui assim que um visitante precisar de você.",
	unavailable: "Não estou mais disponível",
	assignment: "Atribuição",
	reducedMobility: "Visitante com mobilidade reduzida",
	eta: (minutes: number) => `Você chega em uns ${minutes} min.`,
	demo: "Demo: enviar uma atribuição",
	actions: { accept: "Aceitar", arrived: "Cheguei", finish: "Terminar" },
	status: {
		pendiente: "Nova atribuição",
		en_camino: "Você está a caminho",
		llego: "Você está com o visitante",
		terminada: "Você terminou",
	},
};

const fr: HostMessages = {
	pageTitle: "Hôte · QUILLART",
	eyebrow: "Hôte",
	title: "Votre service",
	homeLabel: "QUILLART, accueil",
	signOut: "Se déconnecter",
	signInTitle: "Connectez-vous pour accueillir des visiteurs",
	signInText:
		"L’app hôte est pour les binômes qui accompagnent les visiteurs. Connectez-vous pour signaler que vous êtes disponible.",
	signIn: "Se connecter ou créer un compte",
	offline: "Pas de connexion avec la ville. Nous réessayons tout seuls.",
	idleTitle: "Vous n’êtes pas encore disponible",
	idleText: "Prévenez la ville que vous pouvez accompagner un visiteur.",
	available: "Je suis disponible",
	waitingTitle: "Aucune mission pour l’instant",
	waitingText: "Nous vous prévenons ici dès qu’un visiteur a besoin de vous.",
	unavailable: "Je ne suis plus disponible",
	assignment: "Mission",
	reducedMobility: "Visiteur à mobilité réduite",
	eta: (minutes: number) => `Vous arrivez dans environ ${minutes} min.`,
	demo: "Démo : envoyer une mission",
	actions: { accept: "Accepter", arrived: "Je suis là", finish: "Terminer" },
	status: {
		pendiente: "Nouvelle mission",
		en_camino: "Vous êtes en route",
		llego: "Vous êtes avec le visiteur",
		terminada: "Vous avez terminé",
	},
};

export const host: Record<Language, HostMessages> = { es, en, pt, fr };
