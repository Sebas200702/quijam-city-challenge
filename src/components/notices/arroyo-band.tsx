import { CloudRain } from "lucide-react";
import {
	type ArroyoAlert,
	arroyoTitle,
} from "../../lib/notices/notice-builders";
import "./notices.css";

/**
 * After the visitor answers the modal, the arroyo stays as a red band on the
 * route card until `reiniciar` (docs/26, 3.2). Not a notice: it does not use
 * the slot and cannot be closed.
 */
export function ArroyoBand({ alert }: { alert: ArroyoAlert }) {
	return (
		// The notice text is Spanish only for now: say so, so screen readers read it right (WCAG 3.1.2).
		<div className="q-alert q-alert--alert q-notice-band" lang="es">
			<span className="q-alert__icon" aria-hidden="true">
				<CloudRain size={18} strokeWidth={1.75} />
			</span>
			<div className="q-alert__body">
				<p className="q-alert__title">
					{arroyoTitle(alert.status)}: {alert.zone.name}
				</p>
				<p className="q-alert__text">
					Las rutas que te mostramos lo evitan. No cruces calles con agua.
				</p>
			</div>
		</div>
	);
}
