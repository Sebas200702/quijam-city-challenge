// Consent line for the sign-up forms (Ley 1581 de 2012). Give it an id and point
// the submit button's aria-describedby at it, so the consent is read with the action.

import { useT } from "../../lib/i18n/use-language";

export const PRIVACY_PATH = "/privacidad";

export function ConsentNote({ id }: { id: string }) {
	const t = useT();
	return (
		<p id={id} className="q-sm q-muted">
			{t.profile.consentBefore}{" "}
			<a href={PRIVACY_PATH} className="underline underline-offset-2">
				{t.profile.consentLink}
			</a>{" "}
			{t.profile.consentAfter}
		</p>
	);
}
