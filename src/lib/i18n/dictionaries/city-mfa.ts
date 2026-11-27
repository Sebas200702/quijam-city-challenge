// City MFA gate text in the four languages: TOTP enrollment and verification
// for accounts with the city role. Spanish is the reference: es, en, pt and fr
// must have the same keys (the compiler and messages.test.ts check it).

import type { Language } from "../languages";

const es = {
	eyebrow: "Cuenta de la ciudad",
	checking: "Comprobando tu segundo factor…",
	enrollTitle: "Activa tu segundo factor",
	enrollIntro:
		"Las funciones de la ciudad exigen un código de una app de autenticación (Google Authenticator, Microsoft Authenticator, 1Password u otra).",
	enrollStepScan:
		"Escanea este código QR con tu app, o escribe la clave a mano.",
	qrAlt: "Código QR para registrar QUILLART en tu app de autenticación",
	secretLabel: "Clave para escribir a mano",
	startEnroll: "Generar código QR",
	verifyTitle: "Verifica tu segundo factor",
	verifyIntro:
		"Escribe el código de 6 dígitos que muestra tu app de autenticación para seguir.",
	codeLabel: "Código de 6 dígitos",
	codeHint: "Solo números. El código cambia cada 30 segundos.",
	submit: "Verificar",
	submitting: "Verificando…",
	signOut: "Cerrar sesión",
	errorIncomplete: "Escribe los 6 dígitos del código.",
	errorInvalid:
		"El código no es correcto o ya expiró. Escribe el código actual de tu app.",
	errorEnroll:
		"No pudimos preparar el segundo factor. Revisa tu conexión e inténtalo de nuevo.",
	errorLoad:
		"No pudimos comprobar tu segundo factor. Revisa tu conexión e inténtalo de nuevo.",
	retry: "Reintentar",
};

export type CityMfaMessages = typeof es;

const en: CityMfaMessages = {
	eyebrow: "City account",
	checking: "Checking your second factor…",
	enrollTitle: "Turn on your second factor",
	enrollIntro:
		"City features require a code from an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password or another).",
	enrollStepScan: "Scan this QR code with your app, or type the key by hand.",
	qrAlt: "QR code to add QUILLART to your authenticator app",
	secretLabel: "Key to type by hand",
	startEnroll: "Generate QR code",
	verifyTitle: "Verify your second factor",
	verifyIntro:
		"Type the 6-digit code shown in your authenticator app to continue.",
	codeLabel: "6-digit code",
	codeHint: "Numbers only. The code changes every 30 seconds.",
	submit: "Verify",
	submitting: "Verifying…",
	signOut: "Sign out",
	errorIncomplete: "Type the 6 digits of the code.",
	errorInvalid:
		"The code is wrong or has expired. Type the current code from your app.",
	errorEnroll:
		"We could not set up the second factor. Check your connection and try again.",
	errorLoad:
		"We could not check your second factor. Check your connection and try again.",
	retry: "Try again",
};

const pt: CityMfaMessages = {
	eyebrow: "Conta da cidade",
	checking: "Verificando seu segundo fator…",
	enrollTitle: "Ative seu segundo fator",
	enrollIntro:
		"As funções da cidade exigem um código de um app autenticador (Google Authenticator, Microsoft Authenticator, 1Password ou outro).",
	enrollStepScan:
		"Escaneie este código QR com seu app ou digite a chave manualmente.",
	qrAlt: "Código QR para adicionar o QUILLART ao seu app autenticador",
	secretLabel: "Chave para digitar manualmente",
	startEnroll: "Gerar código QR",
	verifyTitle: "Verifique seu segundo fator",
	verifyIntro:
		"Digite o código de 6 dígitos mostrado no seu app autenticador para continuar.",
	codeLabel: "Código de 6 dígitos",
	codeHint: "Apenas números. O código muda a cada 30 segundos.",
	submit: "Verificar",
	submitting: "Verificando…",
	signOut: "Sair",
	errorIncomplete: "Digite os 6 dígitos do código.",
	errorInvalid:
		"O código está errado ou expirou. Digite o código atual do seu app.",
	errorEnroll:
		"Não foi possível preparar o segundo fator. Verifique sua conexão e tente de novo.",
	errorLoad:
		"Não foi possível verificar seu segundo fator. Verifique sua conexão e tente de novo.",
	retry: "Tentar de novo",
};

const fr: CityMfaMessages = {
	eyebrow: "Compte de la ville",
	checking: "Vérification de votre second facteur…",
	enrollTitle: "Activez votre second facteur",
	enrollIntro:
		"Les fonctions de la ville exigent un code d'une application d'authentification (Google Authenticator, Microsoft Authenticator, 1Password ou autre).",
	enrollStepScan:
		"Scannez ce code QR avec votre application, ou saisissez la clé à la main.",
	qrAlt: "Code QR pour ajouter QUILLART à votre application d'authentification",
	secretLabel: "Clé à saisir à la main",
	startEnroll: "Générer le code QR",
	verifyTitle: "Vérifiez votre second facteur",
	verifyIntro:
		"Saisissez le code à 6 chiffres affiché par votre application d'authentification pour continuer.",
	codeLabel: "Code à 6 chiffres",
	codeHint: "Chiffres uniquement. Le code change toutes les 30 secondes.",
	submit: "Vérifier",
	submitting: "Vérification…",
	signOut: "Se déconnecter",
	errorIncomplete: "Saisissez les 6 chiffres du code.",
	errorInvalid:
		"Le code est incorrect ou a expiré. Saisissez le code actuel de votre application.",
	errorEnroll:
		"Impossible de préparer le second facteur. Vérifiez votre connexion et réessayez.",
	errorLoad:
		"Impossible de vérifier votre second facteur. Vérifiez votre connexion et réessayez.",
	retry: "Réessayer",
};

export const cityMfa: Record<Language, CityMfaMessages> = { es, en, pt, fr };
