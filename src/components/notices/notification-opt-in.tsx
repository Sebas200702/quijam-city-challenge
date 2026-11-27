import { Bell } from "lucide-react";
import { useState } from "react";
import { useT } from "../../lib/i18n/use-language";
import {
	askNotificationPermission,
	notificationPermission,
} from "../../lib/notifications/notify";

/**
 * The only place that asks for notification permission: under the arroyo
 * band, right after a safety alert, never on load (epic #57, rule 4). Hidden
 * when the browser cannot notify or the person already said no.
 */
export function NotificationOptIn() {
	const t = useT().notifications;
	const [permission, setPermission] = useState(notificationPermission);
	if (permission === "granted") {
		return (
			<p className="q-sm q-muted" role="status">
				{t.enabled}
			</p>
		);
	}
	if (permission !== "default") return null;
	return (
		<button
			type="button"
			className="q-btn q-btn--secondary q-btn--sm self-start"
			onClick={() => void askNotificationPermission().then(setPermission)}
		>
			<Bell size={18} strokeWidth={1.75} aria-hidden="true" />
			{t.enable}
		</button>
	);
}
