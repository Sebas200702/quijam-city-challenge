// /ciudad island: the city dashboard behind the city MFA gate.

import { CityDashboard } from "../city-dashboard";
import { CityMfaGate } from "./city-mfa-gate";

export function CityDashboardWithMfa() {
	return (
		<CityMfaGate>
			<CityDashboard />
		</CityMfaGate>
	);
}
