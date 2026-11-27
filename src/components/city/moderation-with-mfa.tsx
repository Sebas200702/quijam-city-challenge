// /moderacion island: the moderation page behind the city MFA gate.

import ModerationPage from "../community/moderation-page";
import { CityMfaGate } from "./city-mfa-gate";

export function ModerationWithMfa({ aiHref }: { aiHref?: string }) {
	return (
		<CityMfaGate>
			<ModerationPage aiHref={aiHref} />
		</CityMfaGate>
	);
}
