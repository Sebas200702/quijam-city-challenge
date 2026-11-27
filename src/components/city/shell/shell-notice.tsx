import { X } from "lucide-react";
import "../../../styles/life-city-b.css";
import type { ReactNode } from "react";
import type { ConnectionView } from "../../../lib/city-dashboard-utils";
import { OfflineIllustration } from "./shell-illustrations";

interface ShellNoticeProps {
	connection: ConnectionView;
	/** "Último dato hace 8 min", when a snapshot exists. */
	lastDataLabel: string | null;
	actionError: string | null;
	onDismissError: () => void;
	/**
	 * Higher-priority notice from a section (an active arroyo). When present it
	 * is the only one shown: the screen keeps at most one visible notice.
	 */
	priority?: ReactNode;
}

/** Notice slot: shows at most one notice, by priority arroyo > offline > failed action. */
export function ShellNotice({
	connection,
	lastDataLabel,
	actionError,
	onDismissError,
	priority,
}: ShellNoticeProps) {
	if (priority) {
		return <>{priority}</>;
	}

	if (connection === "offline") {
		return (
			<section
				className="q-panel cs-panel lcb-panel lcb-panel--dee l-rise"
				aria-labelledby="cs-offline-title"
				role="status"
			>
				<div className="cs-split">
					<OfflineIllustration />
					<div>
						<h2 className="q-h3" id="cs-offline-title">
							Sin conexión
						</h2>
						<p className="cs-sub">
							{lastDataLabel
								? `Ves el último estado conocido. ${lastDataLabel}.`
								: "Aún no tenemos datos del corredor."}{" "}
							Los eventos nuevos llegan al volver la red.
						</p>
					</div>
				</div>
			</section>
		);
	}

	if (actionError) {
		return (
			<div className="q-alert q-alert--alert l-rise" role="alert">
				<span className="q-alert__icon" aria-hidden="true">
					!
				</span>
				<div className="q-alert__body">
					<p className="q-alert__title">No pudimos actualizar el tablero</p>
					<p className="q-alert__text">{actionError}</p>
				</div>
				<button
					type="button"
					className="q-alert__close"
					aria-label="Cerrar aviso"
					onClick={onDismissError}
				>
					<X size={20} strokeWidth={1.75} aria-hidden="true" />
				</button>
			</div>
		);
	}

	return null;
}
