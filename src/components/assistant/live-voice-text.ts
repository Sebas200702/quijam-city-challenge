// Interface text for the Gemini Live voice in the chat, per app language.

import type { Language } from "../../lib/i18n/languages";

export interface LiveVoiceText {
	start: string;
	stop: string;
	connecting: string;
	live: string;
	fallback: string;
	/** Read aloud when an action waits for the person on its card. */
	confirmPrompt: string;
}

export const LIVE_VOICE_TEXT: Record<Language, LiveVoiceText> = {
	es: {
		start: "Voz en vivo (beta)",
		stop: "Terminar voz en vivo",
		connecting: "Conectando la voz en vivo…",
		live: "Voz en vivo activa: habla cuando quieras.",
		fallback:
			"La voz en vivo no está disponible ahora. Sigue con el micrófono o escribiendo.",
		confirmPrompt:
			"Revisa la tarjeta en pantalla y confirma si quieres que lo haga.",
	},
	en: {
		start: "Live voice (beta)",
		stop: "End live voice",
		connecting: "Connecting live voice…",
		live: "Live voice on: speak whenever you want.",
		fallback:
			"Live voice is not available right now. Keep going with the microphone or by typing.",
		confirmPrompt:
			"Check the card on screen and confirm if you want me to do it.",
	},
	pt: {
		start: "Voz ao vivo (beta)",
		stop: "Encerrar voz ao vivo",
		connecting: "Conectando a voz ao vivo…",
		live: "Voz ao vivo ativa: fale quando quiser.",
		fallback:
			"A voz ao vivo não está disponível agora. Continue com o microfone ou digitando.",
		confirmPrompt:
			"Confira o cartão na tela e confirme se quer que eu faça isso.",
	},
	fr: {
		start: "Voix en direct (bêta)",
		stop: "Arrêter la voix en direct",
		connecting: "Connexion de la voix en direct…",
		live: "Voix en direct active : parlez quand vous voulez.",
		fallback:
			"La voix en direct n'est pas disponible. Continuez avec le micro ou en écrivant.",
		confirmPrompt:
			"Vérifiez la carte à l'écran et confirmez si vous voulez que je le fasse.",
	},
};
