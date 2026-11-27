// Appeals (#126): the person whose content was removed asks for a second review.

export const APPEAL_MIN_LENGTH = 10;
export const APPEAL_MAX_LENGTH = 500;

export type AppealCheck =
	| { ok: true; message: string }
	| { ok: false; error: string };

/** Same bounds as the check in `request_appeal()` (SQL). */
export function checkAppealMessage(raw: string): AppealCheck {
	const message = raw.trim().replace(/\s+/g, " ");
	if (message.length < APPEAL_MIN_LENGTH) {
		return {
			ok: false,
			error: `Cuéntanos en al menos ${APPEAL_MIN_LENGTH} caracteres por qué debemos revisarlo.`,
		};
	}
	if (message.length > APPEAL_MAX_LENGTH) {
		return {
			ok: false,
			error: `Máximo ${APPEAL_MAX_LENGTH} caracteres.`,
		};
	}
	return { ok: true, message };
}

/** A removed item can be appealed once; later states are final. */
export function canAppeal(
	moderationStatus: string,
	appealStatus: string | null,
): boolean {
	return moderationStatus === "removed" && appealStatus === null;
}
