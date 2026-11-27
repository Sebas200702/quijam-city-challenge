import { Accessibility, MapPin, UserCheck } from "lucide-react";
import { useState } from "react";
import {
	DEMO_MEETING_POINT_LABEL,
	demoAssignmentEvent,
	type HostAction,
	hostActionEvent,
	nextHostAction,
} from "../../lib/city-events/host-flow";
import type { HostAssignment } from "../../lib/city-events/city-events-types";
import { useCityState } from "../../lib/city-events/use-city-state";

const ACTION_LABEL: Record<HostAction, string> = {
	accept: "Aceptar",
	arrived: "Llegué",
	finish: "Terminar",
};

const STATUS_TEXT: Record<HostAssignment["status"], string> = {
	pendiente: "Asignación nueva",
	en_camino: "Vas en camino",
	llego: "Estás con el visitante",
	terminada: "Terminaste",
};

/** /anfitrion: the host duo's screen. One primary action per step (epic #57, rule 2). */
export function HostView() {
	const { state, status, publish } = useCityState();
	const [available, setAvailable] = useState(false);
	const [sending, setSending] = useState(false);
	const assignment = state.hostAssignment;
	const action = nextHostAction(assignment);
	const showDemo =
		typeof window !== "undefined" &&
		new URLSearchParams(window.location.search).has("demo");

	const run = async (event: Parameters<typeof publish>[0]) => {
		setSending(true);
		try {
			await publish(event);
		} finally {
			setSending(false);
		}
	};

	return (
		<main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-4 py-6">
			<header>
				<p className="q-eyebrow">Anfitrión</p>
				<h1 className="q-h1">Tu turno</h1>
				{status === "error" && (
					<p className="q-alert q-alert--alert" role="alert">
						Sin conexión con la ciudad. Reintentamos solos.
					</p>
				)}
			</header>

			{!assignment && !available && (
				<section className="q-state">
					<p className="q-state__title">Todavía no estás disponible</p>
					<p className="q-state__text">
						Avísale a la ciudad que puedes acompañar a un visitante.
					</p>
					<button
						type="button"
						className="q-btn q-btn--primary q-btn--lg q-btn--block"
						onClick={() => setAvailable(true)}
					>
						<UserCheck size={20} strokeWidth={1.75} aria-hidden="true" />
						Estoy disponible
					</button>
				</section>
			)}

			{!assignment && available && (
				<section className="q-state" role="status">
					<p className="q-state__title">Sin asignaciones por ahora</p>
					<p className="q-state__text">
						Te avisamos aquí apenas haya un visitante que te necesite.
					</p>
					<button
						type="button"
						className="q-btn q-btn--secondary q-btn--block"
						onClick={() => setAvailable(false)}
					>
						Ya no estoy disponible
					</button>
				</section>
			)}

			{assignment && (
				<section
					className="q-alert q-alert--safe"
					aria-live="assertive"
					aria-label="Asignación"
				>
					<div className="q-alert__body">
						<p className="q-alert__title">{STATUS_TEXT[assignment.status]}</p>
						<p className="q-alert__text flex items-center gap-2">
							<Accessibility size={18} strokeWidth={1.75} aria-hidden="true" />
							Visitante con movilidad reducida
						</p>
						<p className="q-alert__text flex items-center gap-2">
							<MapPin size={18} strokeWidth={1.75} aria-hidden="true" />
							{DEMO_MEETING_POINT_LABEL}
						</p>
						{assignment.status === "en_camino" && assignment.etaMin && (
							<p className="q-alert__text">
								Llegas en unos {assignment.etaMin} min.
							</p>
						)}
					</div>
				</section>
			)}

			{assignment && action && (
				<button
					type="button"
					className="q-btn q-btn--primary q-btn--lg q-btn--block"
					disabled={sending}
					onClick={() => run(hostActionEvent(action, assignment.id))}
				>
					{ACTION_LABEL[action]}
				</button>
			)}

			{showDemo && !assignment && (
				<button
					type="button"
					className="q-btn q-btn--secondary q-btn--sm"
					onClick={() => run(demoAssignmentEvent(`demo-${Date.now()}`))}
				>
					Demo: enviar una asignación
				</button>
			)}
		</main>
	);
}
